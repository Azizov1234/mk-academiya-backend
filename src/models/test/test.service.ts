import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../core/config/prisma.service';
import { CreateQuestionDto } from '../questions/dto/create-question.dto';
import {
  CreateTestDto,
  PUBLIC_EXAM_DIRECTIONS,
  PUBLIC_EXAM_MODES,
  QueryTestDto,
  UpdateTestDto,
} from './dto';
import { UserRole } from 'src/core/enums';

export type CurrentUser = {
  id: number;
  role?: string | null;
  fullName?: string | null;
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

function parseBoolean(value?: string): boolean | undefined {
  if (value === undefined) return undefined;

  const normalized = String(value).trim().toLowerCase();
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;

  throw new BadRequestException('Boolean query values must be true or false');
}

function normalizeUpper(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const normalized = String(value).trim().toUpperCase();
  return normalized || null;
}

function encodeJsonField(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

function decodeJsonField(value: unknown): unknown {
  if (typeof value !== 'string') return value;

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

@Injectable()
export class TestService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateTestDto, currentUser: CurrentUser) {
    await this.ensureCourseIsUsable(dto.courseId, currentUser);

    const data = this.toTestWriteData(dto, currentUser);

    if (dto.questions?.length) {
      data.questions = {
        create: dto.questions.map((question) =>
          this.toQuestionWriteData(question),
        ),
      };
    }

    const test = await (this.prisma.test as any).create({
      data,
      include: this.testInclude(),
    });

    return {
      status: 201,
      success: true,
      message: 'Test successfully created',
      data: this.toTestReadData(test, currentUser),
    };
  }

  async findAll(query: QueryTestDto, currentUser: CurrentUser) {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const skip = (page - 1) * limit;
    const where = this.buildScopedWhere(query, currentUser);

    const [tests, total] = await Promise.all([
      (this.prisma.test as any).findMany({
        where,
        skip,
        take: limit,
        include: this.testInclude(),
        orderBy: { id: 'desc' },
      }),
      (this.prisma.test as any).count({ where }),
    ]);

    return {
      data: tests.map((test: any) => this.toTestReadData(test, currentUser)),
      meta: {
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        pageSize: limit,
      },
    };
  }

  async findOne(id: number, currentUser: CurrentUser) {
    const test = await (this.prisma.test as any).findUnique({
      where: { id: +id },
      include: this.testInclude(),
    });

    if (!test) {
      throw new NotFoundException('Test not found');
    }

    await this.assertCanReadTest(+id, currentUser);

    return {
      status: 200,
      success: true,
      data: this.toTestReadData(test, currentUser),
    };
  }

  async update(id: number, dto: UpdateTestDto, currentUser: CurrentUser) {
    await this.assertCanManageTest(+id, currentUser);

    if ('courseId' in dto) {
      await this.ensureCourseIsUsable(dto.courseId, currentUser);
    }

    const test = await (this.prisma.test as any).update({
      where: { id: +id },
      data: this.toTestWriteData(dto, currentUser, true),
      include: this.testInclude(),
    });

    return {
      status: 200,
      success: true,
      message: 'Test successfully updated',
      data: this.toTestReadData(test, currentUser),
    };
  }

  async remove(id: number, currentUser: CurrentUser) {
    await this.assertCanManageTest(+id, currentUser);

    await (this.prisma.test as any).update({
      where: { id: +id },
      data: { isActive: false },
      select: { id: true },
    });

    return {
      status: 200,
      success: true,
      message: 'Test successfully deleted',
    };
  }

  async assertCanManageTest(testId: number, currentUser: CurrentUser) {
    const test = await (this.prisma.test as any).findUnique({
      where: { id: +testId },
      select: { id: true },
    });

    if (!test) {
      throw new NotFoundException('Test not found');
    }

    if (isAdminRole(currentUser)) {
      return;
    }

    if (
      isTeacher(currentUser) &&
      (await this.teacherOwnsTest(+testId, currentUser.id))
    ) {
      return;
    }

    throw new ForbiddenException(
      'You do not have permission to manage this test',
    );
  }

  async assertCanReadTest(testId: number, currentUser: CurrentUser) {
    if (isAdminRole(currentUser)) {
      return;
    }

    if (
      isTeacher(currentUser) &&
      (await this.teacherOwnsTest(+testId, currentUser.id))
    ) {
      return;
    }

    if (
      isStudent(currentUser) &&
      (await this.studentCanAccessTest(+testId, currentUser.id))
    ) {
      return;
    }

    throw new ForbiddenException(
      'You do not have permission to view this test',
    );
  }

  normalizeQuestion(question: any, currentUser: CurrentUser) {
    return this.toQuestionReadData(question, !isStudent(currentUser));
  }

  normalizeTest(test: any, currentUser: CurrentUser) {
    return this.toTestReadData(test, currentUser);
  }

  normalizeQuestionForWrite(question: Partial<CreateQuestionDto>) {
    return this.toQuestionWriteData(question);
  }

  private testInclude() {
    return {
      questions: {
        where: { isActive: true },
        orderBy: { id: 'asc' },
      },
      course: {
        select: {
          id: true,
          title: true,
          level: true,
        },
      },
      createdBy: {
        select: {
          id: true,
          fullName: true,
          role: true,
        },
      },
      _count: {
        select: {
          questions: true,
          attempts: true,
        },
      },
    };
  }

  private buildScopedWhere(query: QueryTestDto, currentUser: CurrentUser) {
    const where: any = {};
    const requestedActive = parseBoolean(query.isActive);
    const requestedPublished = parseBoolean(query.isPublished);
    const requestedPublicExam = parseBoolean(query.isPublicExam);

    if (query.search?.trim()) {
      where.title = { contains: query.search.trim() };
    }

    if (query.courseId) {
      where.courseId = query.courseId;
    }

    if (query.cefrLevel) {
      where.cefrLevel = query.cefrLevel;
    }

    if (query.type) {
      where.type = query.type;
    }

    if (requestedPublicExam !== undefined) {
      where.isPublicExam = requestedPublicExam;
    }

    if (query.publicExamType) {
      where.publicExamType = String(query.publicExamType).trim().toUpperCase();
    }

    if (query.publicExamDirection) {
      where.publicExamDirection = String(query.publicExamDirection).trim().toUpperCase();
    }

    if (isAdminRole(currentUser)) {
      where.isActive = requestedActive ?? true;
      if (requestedPublished !== undefined) {
        where.isPublished = requestedPublished;
      }
      return where;
    }

    where.isActive = true;

    if (isTeacher(currentUser)) {
      if (requestedPublished !== undefined) {
        where.isPublished = requestedPublished;
        if (!requestedPublished) {
          where.createdById = currentUser.id;
        }
        return where;
      }

      where.OR = [{ isPublished: true }, { createdById: currentUser.id }];
      return where;
    }

    where.isPublished = true;
    where.OR = this.studentTestScope(currentUser.id);

    return where;
  }

  private studentTestScope(studentId: number) {
    const activeMembership = {
      studentId,
      isActive: true,
      status: 'ACTIVE',
    };

    return [
      {
        assignments: {
          some: {
            isActive: true,
            OR: [{ studentId: null }, { studentId }],
            group: {
              isActive: true,
              members: {
                some: activeMembership,
              },
            },
          },
        },
      },
    ];
  }

  private async teacherOwnsTest(
    testId: number,
    teacherId: number,
  ): Promise<boolean> {
    const test = await (this.prisma.test as any).findFirst({
      where: {
        id: +testId,
        createdById: teacherId,
        isActive: true,
      },
      select: { id: true },
    });

    return Boolean(test);
  }

  private async teacherCanReadTest(testId: number, teacherId: number): Promise<boolean> {
    const test = await (this.prisma.test as any).findFirst({
      where: {
        id: +testId,
        isActive: true,
        OR: [{ isPublished: true }, { createdById: teacherId }],
      },
      select: { id: true },
    });

    return Boolean(test);
  }

  private async studentCanAccessTest(
    testId: number,
    studentId: number,
  ): Promise<boolean> {
    const test = await (this.prisma.test as any).findFirst({
      where: {
        id: +testId,
        isActive: true,
        isPublished: true,
        OR: this.studentTestScope(studentId),
      },
      select: { id: true },
    });

    return Boolean(test);
  }

  private async ensureCourseIsUsable(
    courseId: number | null | undefined,
    currentUser: CurrentUser,
  ) {
    if (courseId === undefined || courseId === null) {
      return;
    }

    const course = await (this.prisma.course as any).findFirst({
      where: {
        id: +courseId,
        isActive: true,
      },
      select: { id: true },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    if (!isTeacher(currentUser)) {
      return;
    }

    const teacherCourse = await (this.prisma.groupCourse as any).findFirst({
      where: {
        courseId: +courseId,
        isActive: true,
        group: {
          teacherId: currentUser.id,
          isActive: true,
        },
      },
      select: { id: true },
    });

    if (!teacherCourse) {
      throw new ForbiddenException(
        'You can only attach tests to your own courses',
      );
    }
  }

  private toTestWriteData(
    dto: Partial<CreateTestDto>,
    currentUser: CurrentUser,
    isUpdate = false,
  ) {
    const data: any = {};

    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.cefrLevel !== undefined) data.cefrLevel = dto.cefrLevel;
    if (dto.passingScore !== undefined) data.passingScore = dto.passingScore;
    if (dto.shuffleQuestions !== undefined)
      data.shuffleQuestions = dto.shuffleQuestions;
    if (dto.maxAttempts !== undefined) data.maxAttempts = dto.maxAttempts;
    if (dto.isAdaptive !== undefined) data.isAdaptive = dto.isAdaptive;
    if (dto.isPublished !== undefined) data.isPublished = dto.isPublished;
    if (dto.isPublicExam !== undefined) data.isPublicExam = dto.isPublicExam;
    if (dto.publicExamType !== undefined) data.publicExamType = normalizeUpper(dto.publicExamType);
    if (dto.publicExamDirection !== undefined) {
      data.publicExamDirection = normalizeUpper(dto.publicExamDirection);
    }

    const timeLimitMinutes = dto.timeLimitMinutes ?? dto.duration;
    if (timeLimitMinutes !== undefined) {
      data.timeLimitMinutes = timeLimitMinutes;
      data.timeLimit = timeLimitMinutes;
    }

    if (dto.courseId !== undefined) {
      data.courseId = dto.courseId;
    }

    if (!isUpdate) {
      data.createdById = currentUser.id;
    }

    if (dto.isPublicExam === false || data.isPublicExam === false) {
      data.publicExamType = null;
      data.publicExamDirection = null;
      return data;
    }

    if (dto.isPublicExam === true) {
      const publicExamType = normalizeUpper(dto.publicExamType);

      if (!publicExamType || !PUBLIC_EXAM_MODES.includes(publicExamType as any)) {
        throw new BadRequestException('publicExamType must be LEVEL or TRACK');
      }

      data.publicExamType = publicExamType;

      if (publicExamType === 'LEVEL') {
        if (!dto.cefrLevel) {
          throw new BadRequestException('cefrLevel is required when publicExamType is LEVEL');
        }
        data.publicExamDirection = null;
      }

      if (publicExamType === 'TRACK') {
        const direction = normalizeUpper(dto.publicExamDirection);
        if (!direction || !PUBLIC_EXAM_DIRECTIONS.includes(direction as any)) {
          throw new BadRequestException(
            `publicExamDirection must be one of: ${PUBLIC_EXAM_DIRECTIONS.join(', ')}`,
          );
        }
        data.publicExamDirection = direction;
      }
    }

    return data;
  }

  private toQuestionWriteData(question: Partial<CreateQuestionDto>) {
    const data: any = {};

    if (question.type !== undefined) data.type = question.type;
    if (question.inputType !== undefined) data.inputType = question.inputType;
    if (question.questionText !== undefined)
      data.questionText = question.questionText;
    if (question.options !== undefined)
      data.options = encodeJsonField(question.options);
    if (question.correctAnswer !== undefined) {
      data.correctAnswer = encodeJsonField(question.correctAnswer);
    }
    if (question.explanation !== undefined)
      data.explanation = question.explanation;
    if (question.points !== undefined) data.points = question.points;
    if (question.difficulty !== undefined)
      data.difficulty = question.difficulty;
    if (question.skill !== undefined) data.skill = question.skill;

    return data;
  }

  private toTestReadData(test: any, currentUser: CurrentUser) {
    const includeAnswers = !isStudent(currentUser);

    return {
      ...test,
      duration: test.timeLimitMinutes ?? test.timeLimit ?? null,
      questions: Array.isArray(test.questions)
        ? test.questions.map((question: any) =>
            this.toQuestionReadData(question, includeAnswers),
          )
        : [],
    };
  }

  private toQuestionReadData(question: any, includeAnswers: boolean) {
    const data = {
      ...question,
      options: decodeJsonField(question.options),
      correctAnswer: decodeJsonField(question.correctAnswer),
    };

    if (!includeAnswers) {
      delete data.correctAnswer;
      delete data.explanation;
    }

    return data;
  }
}
