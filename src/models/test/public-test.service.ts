import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/core/config/prisma.service';
import { CefrLevel } from 'src/core/enums';
import {
  PublicExamCatalogQueryDto,
  PublicExamRatingQueryDto,
  SubmitPublicExamDto,
} from './dto';

type PublicQuestionResult = {
  questionId: number;
  answer: unknown;
  isCorrect: boolean;
  points: number;
  earnedPoints: number;
};

type PublicGradeResult = {
  score: number;
  maxScore: number;
  percentage: number;
  passed: boolean;
  details: PublicQuestionResult[];
};

const CEFR_ORDER = [
  CefrLevel.A1,
  CefrLevel.A2,
  CefrLevel.B1,
  CefrLevel.B2,
  CefrLevel.C1,
  CefrLevel.C2,
];

function decodeJsonField(value: unknown): unknown {
  if (typeof value !== 'string') return value;

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
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
    return Object.keys(decoded as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((result, key) => {
        result[key] = normalizeComparable((decoded as Record<string, unknown>)[key]);
        return result;
      }, {});
  }

  return decoded;
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

function normalizeOptionLabel(value: unknown, index: number) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const fallback = index < alphabet.length ? alphabet[index] : String((index + 1) % 10 || 0);
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

  if (typeof decodedOptions === 'string') {
    return decodedOptions
      .split(/\r?\n|,/)
      .map((item, index) => parseStringOption(item, index))
      .filter((item): item is { label: string; value: string } => Boolean(item?.value));
  }

  return [];
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

function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

@Injectable()
export class PublicTestService {
  constructor(private readonly prisma: PrismaService) {}

  async listCatalog(query: PublicExamCatalogQueryDto) {
    const limit = Math.min(query.limit || 100, 200);
    const where: any = {
      isActive: true,
      isPublished: true,
      isPublicExam: true,
    };

    if (query.mode) where.publicExamType = String(query.mode).toUpperCase();
    if (query.level) where.cefrLevel = String(query.level).toUpperCase();
    if (query.direction) where.publicExamDirection = String(query.direction).toUpperCase();
    if (query.search?.trim()) where.title = { contains: query.search.trim() };

    const [tests, allPublicTests] = await Promise.all([
      (this.prisma.test as any).findMany({
        where,
        take: limit,
        orderBy: { id: 'desc' },
        select: {
          id: true,
          title: true,
          description: true,
          type: true,
          cefrLevel: true,
          publicExamType: true,
          publicExamDirection: true,
          timeLimitMinutes: true,
          timeLimit: true,
          passingScore: true,
          _count: {
            select: { questions: true },
          },
        },
      }),
      (this.prisma.test as any).findMany({
        where: {
          isActive: true,
          isPublished: true,
          isPublicExam: true,
        },
        select: {
          cefrLevel: true,
          publicExamType: true,
          publicExamDirection: true,
        },
      }),
    ]);

    const levels = Array.from(
      new Set(
        allPublicTests
          .map((item: any) => String(item.cefrLevel || '').toUpperCase())
          .filter(Boolean),
      ),
    ).sort((a, b) => CEFR_ORDER.indexOf(a as CefrLevel) - CEFR_ORDER.indexOf(b as CefrLevel));

    const directions = Array.from(
      new Set(
        allPublicTests
          .map((item: any) => String(item.publicExamDirection || '').toUpperCase())
          .filter(Boolean),
      ),
    ).sort();

    return {
      data: tests.map((test: any) => ({
        ...test,
        duration: test.timeLimitMinutes ?? test.timeLimit ?? null,
        questionCount: test._count?.questions ?? 0,
      })),
      filters: {
        modes: ['LEVEL', 'TRACK'],
        levels,
        directions,
      },
    };
  }

  async getPublicTestById(id: number) {
    const test = await this.loadPublicTest(id);

    return {
      data: {
        ...test,
        duration: test.timeLimitMinutes ?? test.timeLimit ?? null,
        questions: (test.questions || []).map((question: any) => ({
          ...question,
          options: decodeJsonField(question.options),
          correctAnswer: undefined,
          explanation: undefined,
        })),
      },
    };
  }

  async submitPublicAttempt(testId: number, dto: SubmitPublicExamDto) {
    const test = await this.loadPublicTest(testId);
    const selectedMode = String(dto.selectedMode || '').toUpperCase();
    const publicExamType = String(test.publicExamType || '').toUpperCase();

    if (selectedMode !== publicExamType) {
      throw new BadRequestException(`This test is for ${publicExamType} mode`);
    }

    const selectedLevel = dto.selectedLevel
      ? String(dto.selectedLevel).trim().toUpperCase()
      : null;
    const selectedDirection = dto.selectedDirection
      ? String(dto.selectedDirection).trim().toUpperCase()
      : null;

    if (selectedMode === 'LEVEL') {
      if (!selectedLevel) {
        throw new BadRequestException('selectedLevel is required for LEVEL mode');
      }

      if (test.cefrLevel && selectedLevel !== String(test.cefrLevel).toUpperCase()) {
        throw new BadRequestException(`This test is configured for level ${test.cefrLevel}`);
      }
    }

    if (selectedMode === 'TRACK') {
      if (!selectedDirection) {
        throw new BadRequestException('selectedDirection is required for TRACK mode');
      }

      const testDirection = String(test.publicExamDirection || '').toUpperCase();
      if (testDirection && selectedDirection !== testDirection) {
        throw new BadRequestException(`This test is configured for direction ${testDirection}`);
      }
    }

    const result = this.gradeAnswers(test, dto.answers);
    const submittedAt = new Date();
    const timeSpentSeconds =
      dto.timeSpentSeconds ?? null;
    const startedAt =
      timeSpentSeconds !== null
        ? new Date(submittedAt.getTime() - Math.max(0, timeSpentSeconds) * 1000)
        : submittedAt;
    const estimatedLevel = this.resolveEstimatedLevel(
      result.percentage,
      selectedMode,
      selectedLevel ?? (test.cefrLevel ? String(test.cefrLevel).toUpperCase() : null),
      result.passed,
    );

    const created = await (this.prisma as any).publicExamAttempt.create({
      data: {
        testId: +testId,
        participantName: dto.participantName.trim(),
        selectedMode,
        selectedLevel,
        selectedDirection,
        estimatedLevel,
        score: result.score,
        maxScore: result.maxScore,
        percentage: result.percentage,
        passed: result.passed,
        timeSpentSeconds,
        answers: JSON.stringify({
          submitted: decodeJsonField(dto.answers),
          results: result.details,
        }),
        startedAt,
        submittedAt,
      },
      include: {
        test: {
          select: {
            id: true,
            title: true,
            cefrLevel: true,
            publicExamType: true,
            publicExamDirection: true,
          },
        },
      },
    });

    const rank = await this.resolveRank(created);

    return {
      data: {
        id: created.id,
        participantName: created.participantName,
        score: created.score,
        maxScore: created.maxScore,
        percentage: created.percentage,
        passed: created.passed,
        estimatedLevel: created.estimatedLevel,
        selectedMode: created.selectedMode,
        selectedLevel: created.selectedLevel,
        selectedDirection: created.selectedDirection,
        rank,
        submittedAt: created.submittedAt,
        test: created.test,
      },
    };
  }

  async getRatings(query: PublicExamRatingQueryDto) {
    const where: any = { isActive: true };
    const limit = Math.min(query.limit || 100, 500);

    if (query.mode) where.selectedMode = String(query.mode).toUpperCase();
    if (query.level) where.selectedLevel = String(query.level).toUpperCase();
    if (query.direction) where.selectedDirection = String(query.direction).toUpperCase();
    if (query.testId) where.testId = +query.testId;

    const attempts = await (this.prisma as any).publicExamAttempt.findMany({
      where,
      include: {
        test: {
          select: {
            id: true,
            title: true,
            cefrLevel: true,
            publicExamType: true,
            publicExamDirection: true,
          },
        },
      },
      orderBy: [{ percentage: 'desc' }, { submittedAt: 'asc' }, { id: 'asc' }],
      take: 5000,
    });

    const bestByName = new Map<string, any>();
    for (const attempt of attempts) {
      const key = normalizeName(attempt.participantName);
      if (!key || bestByName.has(key)) continue;
      bestByName.set(key, attempt);
    }

    const ranked = Array.from(bestByName.values()).slice(0, limit).map((attempt, index) => ({
      rank: index + 1,
      participantName: attempt.participantName,
      level: attempt.estimatedLevel || attempt.selectedLevel || attempt.test?.cefrLevel || null,
      selectedMode: attempt.selectedMode,
      selectedLevel: attempt.selectedLevel,
      selectedDirection: attempt.selectedDirection,
      percentage: attempt.percentage,
      score: attempt.score,
      maxScore: attempt.maxScore,
      testId: attempt.testId,
      testTitle: attempt.test?.title || null,
      submittedAt: attempt.submittedAt,
    }));

    return {
      data: ranked,
      meta: {
        total: ranked.length,
        mode: query.mode || null,
        level: query.level || null,
        direction: query.direction || null,
      },
    };
  }

  private async loadPublicTest(testId: number) {
    const test = await (this.prisma.test as any).findFirst({
      where: {
        id: +testId,
        isActive: true,
        isPublished: true,
        isPublicExam: true,
      },
      include: {
        questions: {
          where: { isActive: true },
          orderBy: { id: 'asc' },
        },
      },
    });

    if (!test) {
      throw new NotFoundException('Public exam test not found');
    }

    return test;
  }

  private gradeAnswers(test: any, answers: unknown): PublicGradeResult {
    const details = (test.questions || []).map((question: any) => {
      const points = Number(question.points || 1);
      const answer = extractAnswer(answers, question.id);
      const correctAnswer = decodeJsonField(question.correctAnswer);
      const isCorrect = answerMatchesQuestion(answer, correctAnswer, question.options);
      const earnedPoints = isCorrect ? points : 0;

      return {
        questionId: question.id,
        answer,
        isCorrect,
        points,
        earnedPoints,
      };
    });

    const score = details.reduce((sum, item) => sum + item.earnedPoints, 0);
    const maxScore = details.reduce((sum, item) => sum + item.points, 0);
    const percentage = maxScore > 0 ? Number(((score / maxScore) * 100).toFixed(2)) : 0;
    const passed = percentage >= Number(test.passingScore || 0);

    return {
      score,
      maxScore,
      percentage,
      passed,
      details,
    };
  }

  private resolveEstimatedLevel(
    percentage: number,
    selectedMode: string,
    selectedLevel: string | null,
    passed: boolean,
  ) {
    if (selectedMode === 'LEVEL' && selectedLevel) {
      if (passed) return selectedLevel;
      const index = CEFR_ORDER.indexOf(selectedLevel as CefrLevel);
      if (index <= 0) return CefrLevel.A1;
      return CEFR_ORDER[index - 1];
    }

    if (percentage >= 90) return CefrLevel.C2;
    if (percentage >= 80) return CefrLevel.C1;
    if (percentage >= 70) return CefrLevel.B2;
    if (percentage >= 60) return CefrLevel.B1;
    if (percentage >= 45) return CefrLevel.A2;
    return CefrLevel.A1;
  }

  private async resolveRank(attempt: any) {
    const peers = await (this.prisma as any).publicExamAttempt.findMany({
      where: {
        isActive: true,
        testId: attempt.testId,
        selectedMode: attempt.selectedMode,
        selectedLevel: attempt.selectedLevel ?? null,
        selectedDirection: attempt.selectedDirection ?? null,
      },
      select: {
        id: true,
        percentage: true,
        submittedAt: true,
      },
      orderBy: [{ percentage: 'desc' }, { submittedAt: 'asc' }, { id: 'asc' }],
    });

    const index = peers.findIndex((item: any) => item.id === attempt.id);
    return index >= 0 ? index + 1 : peers.length;
  }
}
