import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/core/config/prisma.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { CurrentUser, TestService } from '../test/test.service';

type QuestionFilters = {
  testId?: number | string;
  type?: string;
};

@Injectable()
export class QuestionsService {
  constructor(
    private prisma: PrismaService,
    private testService: TestService,
  ) {}

  async create(
    testId: number,
    createQuestionDto: CreateQuestionDto,
    currentUser: CurrentUser,
  ) {
    const normalizedTestId = this.parsePositiveInt(testId, 'testId');
    await this.testService.assertCanManageTest(normalizedTestId, currentUser);

    const normalizedPayload = this.normalizeQuestionPayload(createQuestionDto);
    const question = await (this.prisma.question as any).create({
      data: {
        ...this.testService.normalizeQuestionForWrite(normalizedPayload),
        testId: normalizedTestId,
      },
    });

    // Analytics manual create bo'lmasligi uchun question yaratilganda avtomatik row ochamiz.
    await (this.prisma.questionAnalytics as any).upsert({
      where: { questionId: question.id },
      update: { isActive: true },
      create: {
        questionId: question.id,
        totalAttempts: 0,
        correctCount: 0,
        avgTimeSeconds: 0,
        isActive: true,
      },
    });

    return {
      status: 201,
      success: true,
      message: 'Question successfully created',
      data: this.testService.normalizeQuestion(question, currentUser),
    };
  }

  async findAll(filters: QuestionFilters, currentUser: CurrentUser) {
    const where: any = { isActive: true };

    if (filters.testId !== undefined) {
      const normalizedTestId = this.parsePositiveInt(filters.testId, 'testId');
      await this.testService.assertCanReadTest(normalizedTestId, currentUser);
      where.testId = normalizedTestId;
    }

    if (filters.type !== undefined) {
      where.type = this.normalizeQuestionType(filters.type);
    }

    const questions = await (this.prisma.question as any).findMany({
      where,
      orderBy: { id: 'asc' },
    });

    const readableQuestions =
      where.testId !== undefined
        ? questions
        : await this.filterReadableQuestions(questions, currentUser);

    return {
      status: 200,
      success: true,
      count: readableQuestions.length,
      data: readableQuestions.map((question: any) =>
        this.testService.normalizeQuestion(question, currentUser),
      ),
    };
  }

  async findAllByTest(testId: number, currentUser: CurrentUser) {
    return this.findAll({ testId }, currentUser);
  }

  async findByType(
    type: string,
    testId: number | string | undefined,
    currentUser: CurrentUser,
  ) {
    return this.findAll({ type, testId }, currentUser);
  }

  async findOne(id: number, currentUser: CurrentUser) {
    const normalizedId = this.parsePositiveInt(id, 'question id');
    const question = await (this.prisma.question as any).findFirst({
      where: { id: normalizedId, isActive: true },
    });

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    await this.testService.assertCanReadTest(question.testId, currentUser);

    return {
      status: 200,
      success: true,
      data: this.testService.normalizeQuestion(question, currentUser),
    };
  }

  async update(
    id: number,
    updateQuestionDto: UpdateQuestionDto,
    currentUser: CurrentUser,
  ) {
    const normalizedId = this.parsePositiveInt(id, 'question id');
    const question = await (this.prisma.question as any).findFirst({
      where: { id: normalizedId, isActive: true },
      select: { id: true, testId: true },
    });

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    await this.testService.assertCanManageTest(question.testId, currentUser);

    const normalizedPayload = this.normalizeQuestionPayload(updateQuestionDto);
    const writeData =
      this.testService.normalizeQuestionForWrite(normalizedPayload);

    if (!Object.keys(writeData).length) {
      throw new BadRequestException('No valid fields provided for update');
    }

    const updated = await (this.prisma.question as any).update({
      where: { id: normalizedId },
      data: writeData,
    });

    return {
      status: 200,
      success: true,
      message: 'Question successfully updated',
      data: this.testService.normalizeQuestion(updated, currentUser),
    };
  }

  async remove(id: number, currentUser: CurrentUser) {
    const normalizedId = this.parsePositiveInt(id, 'question id');
    const question = await (this.prisma.question as any).findFirst({
      where: { id: normalizedId, isActive: true },
      select: { id: true, testId: true },
    });

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    await this.testService.assertCanManageTest(question.testId, currentUser);

    await (this.prisma.question as any).update({
      where: { id: normalizedId },
      data: { isActive: false },
      select: { id: true },
    });

    await (this.prisma.questionAnalytics as any).updateMany({
      where: { questionId: normalizedId },
      data: { isActive: false },
    });

    return {
      status: 200,
      success: true,
      message: 'Question successfully deleted',
    };
  }

  // User ko'ra oladigan questionlar ro'yxatini qaytaradi.
  // Bir xil testId uchun permission tekshiruvini qayta-qayta qilmaslik
  // uchun natijani cache qilib boramiz.
  private async filterReadableQuestions(
    questions: any[],
    currentUser: CurrentUser,
  ): Promise<any[]> {
    const canReadByTestId = new Map<number, boolean>();
    const readableQuestions: any[] = [];

    for (const question of questions) {
      const testId = Number(question.testId);
      let canRead = canReadByTestId.get(testId);

      if (canRead === undefined) {
        canRead = await this.canUserReadTest(testId, currentUser);
        canReadByTestId.set(testId, canRead);
      }

      if (canRead) {
        readableQuestions.push(question);
      }
    }

    return readableQuestions;
  }

  private async canUserReadTest(
    testId: number,
    currentUser: CurrentUser,
  ): Promise<boolean> {
    try {
      await this.testService.assertCanReadTest(testId, currentUser);
      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        return false;
      }

      throw error;
    }
  }

  // Kelgan payloadni tozalab, bir xil formatga keltiradi.
  private normalizeQuestionPayload(
    data: Partial<CreateQuestionDto | UpdateQuestionDto>,
  ): Partial<CreateQuestionDto> {
    const payload = { ...(data as Partial<CreateQuestionDto>) };

    if (payload.type !== undefined) {
      payload.type = this.normalizeQuestionType(payload.type);
    }

    if (payload.inputType !== undefined) {
      payload.inputType = this.normalizeNonEmptyString(
        payload.inputType,
        'inputType',
      ).toUpperCase();
    }

    if (payload.questionText !== undefined) {
      payload.questionText = this.normalizeNonEmptyString(
        payload.questionText,
        'questionText',
      );
    }

    if (typeof payload.explanation === 'string') {
      payload.explanation = payload.explanation.trim();
    }

    if (typeof payload.skill === 'string') {
      payload.skill = payload.skill.trim();
    }

    return payload;
  }

  // id/testId uchun: son, butun son, va 0 dan katta bo'lishi shart.
  private parsePositiveInt(value: unknown, field: string): number {
    const parsedNumber = Number(value);
    const isValid = Number.isInteger(parsedNumber) && parsedNumber > 0;

    if (!isValid) {
      throw new BadRequestException(`${field} must be a positive integer`);
    }

    return parsedNumber;
  }

  // Question turini standart ko'rinishga o'tkazadi (masalan: "mcq" -> "MCQ").
  private normalizeQuestionType(type: unknown): string {
    return this.normalizeNonEmptyString(type, 'type').toUpperCase();
  }

  // String tipini tekshiradi, bosh/oxir bo'sh joyni olib tashlaydi, bo'sh bo'lsa xato qaytaradi.
  private normalizeNonEmptyString(value: unknown, field: string): string {
    if (typeof value !== 'string') {
      throw new BadRequestException(`${field} must be a string`);
    }

    const trimmedValue = value.trim();
    if (!trimmedValue) {
      throw new BadRequestException(`${field} cannot be empty`);
    }

    return trimmedValue;
  }
}
