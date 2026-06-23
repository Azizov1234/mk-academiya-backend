import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../core/config/prisma.service';
import { XPService } from '../gamification/xp.service';
import { UserRole } from 'src/core/enums';
import { SubmitAttemptDto } from './dto';
import { CurrentUser, TestService } from './test.service';

type GradedQuestion = {
  questionId: number;
  answer: unknown;
  correctAnswer: unknown;
  isCorrect: boolean;
  points: number;
  earnedPoints: number;
  explanation?: string | null;
};

type GradeResult = {
  score: number;
  maxScore: number;
  percentage: number;
  passed: boolean;
  correctCount: number;
  details: GradedQuestion[];
};

function roleOf(user: CurrentUser): string {
  return String(user.role || '').toUpperCase();
}

function isAdminRole(user: CurrentUser): boolean {
  const role = roleOf(user);
  return role === UserRole.SUPERADMIN || role === UserRole.ADMIN;
}

function isTeacher(user: CurrentUser): boolean {
  return roleOf(user) === UserRole.TEACHER;
}

function isStudent(user: CurrentUser): boolean {
  return roleOf(user) === UserRole.STUDENT;
}

function isManager(user: CurrentUser): boolean {
  return isAdminRole(user) || isTeacher(user);
}

function decodeJsonField(value: unknown): unknown {
  if (typeof value !== 'string') return value;

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function sortObject(value: Record<string, unknown>) {
  return Object.keys(value)
    .sort()
    .reduce<Record<string, unknown>>((result, key) => {
      result[key] = normalizeComparable(value[key]);
      return result;
    }, {});
}

function normalizeComparable(value: unknown): unknown {
  const decoded = decodeJsonField(value);

  if (typeof decoded === 'string') {
    return decoded.trim().toLowerCase();
  }

  if (Array.isArray(decoded)) {
    return decoded.map((item) => normalizeComparable(item)).sort();
  }

  if (decoded && typeof decoded === 'object') {
    return sortObject(decoded as Record<string, unknown>);
  }

  return decoded;
}

function unwrapAnswer(value: unknown): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return value;
  }

  const record = value as Record<string, unknown>;
  const keys = ['answer', 'value', 'selected', 'selectedOption', 'response', 'text'];
  const key = keys.find((item) => item in record);

  return key ? record[key] : value;
}

function normalizeOptionLabel(value: unknown, index: number) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const fallback = index < alphabet.length ? alphabet[index] : String((index - alphabet.length + 1) % 10 || 0);
  const label = String(value ?? '').trim();
  return (label || fallback).slice(0, 1).toUpperCase();
}

function parseStringOption(value: string, index: number) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const parsed = trimmed.match(/^([A-Za-z0-9])\s*[\).:-]\s*(.+)$/);
  if (parsed) {
    return {
      label: parsed[1].toUpperCase(),
      value: parsed[2].trim(),
    };
  }

  return {
    label: normalizeOptionLabel(undefined, index),
    value: trimmed,
  };
}

function normalizeQuestionOptions(options: unknown) {
  const decodedOptions = decodeJsonField(options);

  if (Array.isArray(decodedOptions)) {
    return decodedOptions
      .map((item, index) => {
        if (typeof item === 'string') return parseStringOption(item, index);
        if (item && typeof item === 'object') {
          const record = item as Record<string, unknown>;
          return {
            label: normalizeOptionLabel(
              record.label ?? record.key ?? record.name ?? record.option ?? record.id,
              index,
            ),
            value: String(
              record.value ?? record.text ?? record.answer ?? record.title ?? record.content ?? '',
            ).trim(),
          };
        }
        return parseStringOption(String(item ?? ''), index);
      })
      .filter((item): item is { label: string; value: string } => Boolean(item?.value));
  }

  if (decodedOptions && typeof decodedOptions === 'object') {
    return Object.entries(decodedOptions as Record<string, unknown>)
      .map(([label, value], index) => ({
        label: normalizeOptionLabel(label, index),
        value: String(value ?? '').trim(),
      }))
      .filter((item) => item.value);
  }

  if (typeof decodedOptions === 'string') {
    return decodedOptions
      .split(/\r?\n|,/)
      .map((item, index) => parseStringOption(item, index))
      .filter((item): item is { label: string; value: string } => Boolean(item?.value));
  }

  return [];
}

function extractAnswer(answers: unknown, questionId: number): unknown {
  const decoded = decodeJsonField(answers);

  if (Array.isArray(decoded)) {
    const match = decoded.find((item) => {
      if (!item || typeof item !== 'object') return false;
      const record = item as Record<string, unknown>;
      return Number(record.questionId ?? record.id) === questionId;
    });

    return unwrapAnswer(match);
  }

  if (!decoded || typeof decoded !== 'object') {
    return undefined;
  }

  const record = decoded as Record<string, unknown>;
  const directKeys = [String(questionId), `question_${questionId}`, `q${questionId}`];

  for (const key of directKeys) {
    if (key in record) {
      return unwrapAnswer(record[key]);
    }
  }

  const nested = Object.values(record).find((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
    const nestedRecord = item as Record<string, unknown>;
    return Number(nestedRecord.questionId ?? nestedRecord.id) === questionId;
  });

  return unwrapAnswer(nested);
}

function answersMatch(answer: unknown, correctAnswer: unknown): boolean {
  if (correctAnswer === undefined || correctAnswer === null || correctAnswer === '') {
    return false;
  }

  const normalizedAnswer = normalizeComparable(answer);
  const normalizedCorrectAnswer = normalizeComparable(correctAnswer);

  if (
    ['string', 'number', 'boolean'].includes(typeof normalizedAnswer) &&
    ['string', 'number', 'boolean'].includes(typeof normalizedCorrectAnswer)
  ) {
    return String(normalizedAnswer) === String(normalizedCorrectAnswer);
  }

  return JSON.stringify(normalizedAnswer) === JSON.stringify(normalizedCorrectAnswer);
}

function answerMatchesQuestion(answer: unknown, correctAnswer: unknown, options: unknown): boolean {
  if (answersMatch(answer, correctAnswer)) {
    return true;
  }

  const optionItems = normalizeQuestionOptions(options);
  const answerLabel = String(decodeJsonField(answer) ?? '').trim().toUpperCase();
  const correctLabel = String(decodeJsonField(correctAnswer) ?? '').trim().toUpperCase();
  const selectedOption = optionItems.find((option) => option.label === answerLabel);

  if (selectedOption && answersMatch(selectedOption.value, correctAnswer)) {
    return true;
  }

  const correctOption = optionItems.find((option) => option.label === correctLabel);
  if (correctOption && answersMatch(answer, correctOption.value)) {
    return true;
  }

  return false;
}

function shuffleArray<T>(items: T[]): T[] {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[randomIndex]] = [next[randomIndex], next[index]];
  }
  return next;
}

@Injectable()
export class TestAttemptService {
  private readonly logger = new Logger(TestAttemptService.name);

  constructor(
    private prisma: PrismaService,
    private xpService: XPService,
    private testService: TestService,
  ) {}

  async startAttempt(testId: number, currentUser: CurrentUser) {
    const test = await this.loadTest(+testId);
    await this.testService.assertCanReadTest(+testId, currentUser);
    await this.assertAttemptLimit(currentUser.id, test);

    const activeAttempt = await (this.prisma.testAttempt as any).findFirst({
      where: {
        studentId: currentUser.id,
        testId: +testId,
        submittedAt: null,
        isActive: true,
      },
      include: this.attemptInclude(),
    });

    if (activeAttempt) {
      return {
        status: 200,
        success: true,
        message: 'Active attempt already exists',
        data: this.normalizeAttempt(activeAttempt),
        test: this.prepareTestForAttempt(test, currentUser),
      };
    }

    const attempt = await (this.prisma.testAttempt as any).create({
      data: {
        studentId: currentUser.id,
        testId: +testId,
      },
      include: this.attemptInclude(),
    });

    return {
      status: 201,
      success: true,
      message: 'Attempt started',
      data: this.normalizeAttempt(attempt),
      test: this.prepareTestForAttempt(test, currentUser),
    };
  }

  async submitAttempt(currentUser: CurrentUser, dto: SubmitAttemptDto, routeTestId?: number) {
    const testId = routeTestId ?? dto.testId;
    if (!testId) {
      throw new BadRequestException('testId is required');
    }

    const test = await this.loadTest(+testId);
    await this.testService.assertCanReadTest(+testId, currentUser);

    const hasAnswers = dto.answers !== undefined;
    if (!hasAnswers && dto.score === undefined) {
      throw new BadRequestException('answers are required');
    }

    if (!hasAnswers && !isManager(currentUser)) {
      throw new BadRequestException('Students must submit answers, not manual scores');
    }

    const existingAttempt = await this.resolveExistingAttempt(dto.attemptId, +testId, currentUser);
    const studentId = await this.resolveStudentId(currentUser, dto, existingAttempt);

    if (isTeacher(currentUser) && studentId !== currentUser.id) {
      await this.assertTeacherCanViewStudent(currentUser.id, studentId);
    }

    await this.assertAttemptLimit(studentId, test, existingAttempt?.id);

    const submittedAt = new Date();
    const startedAt = existingAttempt?.startedAt
      ? new Date(existingAttempt.startedAt)
      : dto.timeSpentSeconds !== undefined
        ? new Date(submittedAt.getTime() - dto.timeSpentSeconds * 1000)
        : submittedAt;
    const timeSpentSeconds =
      dto.timeSpentSeconds ?? Math.max(0, Math.round((submittedAt.getTime() - startedAt.getTime()) / 1000));

    const result = hasAnswers
      ? this.gradeAnswers(test, dto.answers)
      : this.gradeManualScore(test, dto);
    const timeLimitSeconds = test.timeLimitMinutes ? test.timeLimitMinutes * 60 : null;
    const feedback = {
      mode: hasAnswers ? 'AUTO_GRADED' : 'MANUAL',
      maxScore: result.maxScore,
      earnedScore: result.score,
      percentage: result.percentage,
      passingScore: test.passingScore,
      totalQuestions: test.questions.length,
      answeredQuestions: result.details.filter((item) => item.answer !== undefined).length,
      correctQuestions: result.correctCount,
      timeLimitMinutes: test.timeLimitMinutes ?? test.timeLimit ?? null,
      timeLimitExceeded: timeLimitSeconds ? timeSpentSeconds > timeLimitSeconds : false,
      submittedAt: submittedAt.toISOString(),
    };
    const answersPayload = hasAnswers
      ? {
          submitted: decodeJsonField(dto.answers),
          results: result.details,
        }
      : {
          manual: true,
          score: dto.score,
          percentage: result.percentage,
        };

    const data = {
      studentId,
      testId: +testId,
      startedAt,
      submittedAt,
      score: result.score,
      percentage: result.percentage,
      passed: result.passed,
      timeSpentSeconds,
      answers: JSON.stringify(answersPayload),
      feedback: JSON.stringify(feedback),
    };

    const attempt = existingAttempt
      ? await (this.prisma.testAttempt as any).update({
          where: { id: existingAttempt.id },
          data,
          include: this.attemptInclude(),
        })
      : await (this.prisma.testAttempt as any).create({
          data,
          include: this.attemptInclude(),
        });

    await this.updateQuestionAnalytics(result.details, timeSpentSeconds);
    await this.awardXpIfNeeded(studentId, +testId, result.passed, attempt.id, test.title);

    return {
      status: 201,
      success: true,
      message: 'Attempt submitted',
      data: this.normalizeAttempt(attempt),
    };
  }

  async findByStudent(studentId: number, currentUser: CurrentUser) {
    await this.assertCanViewStudentAttempts(+studentId, currentUser);

    const attempts = await (this.prisma.testAttempt as any).findMany({
      where: { studentId: +studentId },
      include: this.attemptInclude(),
      orderBy: { startedAt: 'desc' },
    });

    return {
      data: attempts.map((attempt: any) => this.normalizeAttempt(attempt)),
    };
  }

  async findForCurrentUser(currentUser: CurrentUser) {
    const role = String(currentUser.role || '').toUpperCase();

    if (role === UserRole.SUPERADMIN || role === UserRole.ADMIN) {
      const attempts = await (this.prisma.testAttempt as any).findMany({
        include: this.attemptInclude(),
        orderBy: { startedAt: 'desc' },
        take: 50,
      });

      return attempts.map((attempt: any) => this.normalizeAttempt(attempt));
    }

    if (role === UserRole.TEACHER) {
      const attempts = await (this.prisma.testAttempt as any).findMany({
        where: {
          isActive: true,
          student: {
            groupMemberships: {
              some: {
                isActive: true,
                status: 'ACTIVE',
                group: {
                  teacherId: currentUser.id,
                  isActive: true,
                },
              },
            },
          },
          test: {
            assignments: {
              some: {
                isActive: true,
                group: {
                  teacherId: currentUser.id,
                  isActive: true,
                },
              },
            },
          },
        },
        include: this.attemptInclude(),
        orderBy: { startedAt: 'desc' },
        take: 50,
      });

      return attempts.map((attempt: any) => this.normalizeAttempt(attempt));
    }

    const result = await this.findByStudent(currentUser.id, currentUser);
    return result.data;
  }

  private async loadTest(testId: number) {
    const test = await (this.prisma.test as any).findUnique({
      where: { id: +testId },
      include: {
        questions: {
          where: { isActive: true },
          orderBy: { id: 'asc' },
        },
      },
    });

    if (!test || !test.isActive) {
      throw new NotFoundException('Test not found');
    }

    return test;
  }

  private attemptInclude() {
    return {
      test: {
        select: {
          id: true,
          title: true,
          type: true,
          passingScore: true,
          timeLimitMinutes: true,
        },
      },
      student: {
        select: {
          id: true,
          fullName: true,
          role: true,
        },
      },
    };
  }

  private prepareTestForAttempt(test: any, currentUser: CurrentUser) {
    const normalized = this.testService.normalizeTest(
      {
        ...test,
        course: undefined,
        createdBy: undefined,
        _count: undefined,
      },
      currentUser,
    );

    if (test.shuffleQuestions) {
      normalized.questions = shuffleArray(normalized.questions);
    }

    return normalized;
  }

  private async resolveExistingAttempt(
    attemptId: number | undefined,
    testId: number,
    currentUser: CurrentUser,
  ) {
    if (!attemptId) {
      return null;
    }

    const attempt = await (this.prisma.testAttempt as any).findUnique({
      where: { id: +attemptId },
    });

    if (!attempt || !attempt.isActive) {
      throw new NotFoundException('Attempt not found');
    }

    if (attempt.testId !== testId) {
      throw new BadRequestException('Attempt does not belong to this test');
    }

    if (attempt.submittedAt) {
      throw new BadRequestException('Attempt is already submitted');
    }

    if (isStudent(currentUser) && attempt.studentId !== currentUser.id) {
      throw new ForbiddenException('You can only submit your own attempts');
    }

    return attempt;
  }

  private async resolveStudentId(
    currentUser: CurrentUser,
    dto: SubmitAttemptDto,
    existingAttempt: any,
  ) {
    if (existingAttempt) {
      return existingAttempt.studentId;
    }

    if (isStudent(currentUser)) {
      if (dto.studentId && dto.studentId !== currentUser.id) {
        throw new ForbiddenException('You can only submit attempts for yourself');
      }

      return currentUser.id;
    }

    if (dto.studentId) {
      const student = await (this.prisma.user as any).findFirst({
        where: {
          id: +dto.studentId,
          role: UserRole.STUDENT,
          isActive: true,
        },
        select: { id: true },
      });

      if (!student) {
        throw new NotFoundException('Student not found');
      }

      return student.id;
    }

    return currentUser.id;
  }

  private async assertAttemptLimit(studentId: number, test: any, excludeAttemptId?: number) {
    if (!test.maxAttempts) {
      return;
    }

    const where: any = {
      studentId: +studentId,
      testId: test.id,
      isActive: true,
      submittedAt: { not: null },
    };

    if (excludeAttemptId) {
      where.id = { not: +excludeAttemptId };
    }

    const submittedAttempts = await (this.prisma.testAttempt as any).count({ where });

    if (submittedAttempts >= test.maxAttempts) {
      throw new BadRequestException('Maximum attempts reached for this test');
    }
  }

  private gradeAnswers(test: any, answers: unknown): GradeResult {
    const details = test.questions.map((question: any) => {
      const points = Number(question.points || 1);
      const answer = extractAnswer(answers, question.id);
      const correctAnswer = decodeJsonField(question.correctAnswer);
      const isCorrect = answerMatchesQuestion(answer, correctAnswer, question.options);

      return {
        questionId: question.id,
        answer,
        correctAnswer,
        isCorrect,
        points,
        earnedPoints: isCorrect ? points : 0,
        explanation: question.explanation,
      };
    });

    return this.buildGradeResult(details, test.passingScore);
  }

  private gradeManualScore(test: any, dto: SubmitAttemptDto): GradeResult {
    const maxScore = test.questions.reduce(
      (sum: number, question: any) => sum + Number(question.points || 1),
      0,
    );
    const score = dto.score ?? 0;
    const percentage =
      dto.percentage ?? (maxScore > 0 ? Number(((score / maxScore) * 100).toFixed(2)) : score);
    const passed = percentage >= Number(test.passingScore || 0);

    return {
      score,
      maxScore,
      percentage,
      passed,
      correctCount: 0,
      details: [],
    };
  }

  private buildGradeResult(details: GradedQuestion[], passingScore: number): GradeResult {
    const score = details.reduce((sum, item) => sum + item.earnedPoints, 0);
    const maxScore = details.reduce((sum, item) => sum + item.points, 0);
    const percentage = maxScore > 0 ? Number(((score / maxScore) * 100).toFixed(2)) : 0;

    return {
      score,
      maxScore,
      percentage,
      passed: percentage >= Number(passingScore || 0),
      correctCount: details.filter((item) => item.isCorrect).length,
      details,
    };
  }

  private async updateQuestionAnalytics(details: GradedQuestion[], timeSpentSeconds: number) {
    if (!details.length) {
      return;
    }

    const avgQuestionTime = timeSpentSeconds > 0 ? timeSpentSeconds / details.length : 0;

    for (const detail of details) {
      const existing = await (this.prisma.questionAnalytics as any).findUnique({
        where: { questionId: detail.questionId },
      });
      const previousAttempts = existing?.totalAttempts || 0;
      const nextAvg =
        previousAttempts > 0
          ? (existing.avgTimeSeconds * previousAttempts + avgQuestionTime) /
            (previousAttempts + 1)
          : avgQuestionTime;

      await (this.prisma.questionAnalytics as any).upsert({
        where: { questionId: detail.questionId },
        update: {
          totalAttempts: { increment: 1 },
          correctCount: { increment: detail.isCorrect ? 1 : 0 },
          avgTimeSeconds: nextAvg,
        },
        create: {
          questionId: detail.questionId,
          totalAttempts: 1,
          correctCount: detail.isCorrect ? 1 : 0,
          avgTimeSeconds: avgQuestionTime,
        },
      });
    }
  }

  private async awardXpIfNeeded(
    studentId: number,
    testId: number,
    passed: boolean,
    currentAttemptId: number,
    testTitle: string,
  ) {
    if (!passed) {
      return;
    }

    const alreadyPassed = await (this.prisma.testAttempt as any).count({
      where: {
        studentId: +studentId,
        testId: +testId,
        passed: true,
        isActive: true,
        id: { not: +currentAttemptId },
      },
    });

    if (alreadyPassed > 0) {
      return;
    }

    try {
      await this.xpService.addXP(+studentId, 100, `Passed test: ${testTitle}`);
    } catch (error) {
      this.logger.warn(`XP award failed for test ${testId}: ${String(error)}`);
    }
  }

  private async assertCanViewStudentAttempts(studentId: number, currentUser: CurrentUser) {
    if (isAdminRole(currentUser)) {
      return;
    }

    if (isStudent(currentUser) && currentUser.id === studentId) {
      return;
    }

    if (isTeacher(currentUser)) {
      await this.assertTeacherCanViewStudent(currentUser.id, studentId);
      return;
    }

    throw new ForbiddenException('You do not have permission to view these attempts');
  }

  private async assertTeacherCanViewStudent(teacherId: number, studentId: number) {
    const membership = await (this.prisma.groupMember as any).findFirst({
      where: {
        studentId: +studentId,
        isActive: true,
        status: 'ACTIVE',
        group: {
          teacherId: +teacherId,
          isActive: true,
        },
      },
      select: { id: true },
    });

    if (!membership) {
      throw new ForbiddenException('You can only view attempts for your own students');
    }
  }

  private normalizeAttempt(attempt: any) {
    return {
      ...attempt,
      answers: decodeJsonField(attempt.answers),
      feedback: decodeJsonField(attempt.feedback),
    };
  }
}
