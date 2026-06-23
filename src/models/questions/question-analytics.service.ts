import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/core/config/prisma.service';
import { CurrentUser, TestService } from '../test/test.service';

@Injectable()
export class QuestionAnalyticsService {
  constructor(
    private prisma: PrismaService,
    private testService: TestService,
  ) {}

  async findAll(testId: string | undefined, currentUser: CurrentUser) {
    let normalizedTestId: number | undefined;
    if (testId !== undefined) {
      normalizedTestId = this.parsePositiveInt(testId, 'testId');
      await this.testService.assertCanReadTest(normalizedTestId, currentUser);
    }

    const questions = await (this.prisma.question as any).findMany({
      where: {
        isActive: true,
        ...(normalizedTestId !== undefined ? { testId: normalizedTestId } : {}),
      },
      select: {
        id: true,
        testId: true,
        questionText: true,
        type: true,
        inputType: true,
        points: true,
        difficulty: true,
        skill: true,
        analytics: {
          select: {
            id: true,
            questionId: true,
            totalAttempts: true,
            correctCount: true,
            avgTimeSeconds: true,
            isActive: true,
          },
        },
      },
      orderBy: { id: 'asc' },
    });

    const readableQuestions =
      normalizedTestId !== undefined
        ? questions
        : await this.filterReadableQuestions(questions, currentUser);
    const questionsWithAnalytics =
      await this.ensureAnalyticsRows(readableQuestions);

    return {
      status: 200,
      success: true,
      count: questionsWithAnalytics.length,
      data: questionsWithAnalytics.map((question: any) =>
        this.toAnalyticsReadData(question),
      ),
    };
  }

  async findOneByQuestionId(questionId: number, currentUser: CurrentUser) {
    const normalizedQuestionId = this.parsePositiveInt(
      questionId,
      'questionId',
    );

    const question = await (this.prisma.question as any).findFirst({
      where: { id: normalizedQuestionId, isActive: true },
      select: {
        id: true,
        testId: true,
        questionText: true,
        type: true,
        inputType: true,
        points: true,
        difficulty: true,
        skill: true,
        analytics: {
          select: {
            id: true,
            questionId: true,
            totalAttempts: true,
            correctCount: true,
            avgTimeSeconds: true,
            isActive: true,
          },
        },
      },
    });

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    await this.testService.assertCanReadTest(question.testId, currentUser);

    const [questionWithAnalytics] = await this.ensureAnalyticsRows([question]);

    return {
      status: 200,
      success: true,
      data: this.toAnalyticsReadData(questionWithAnalytics),
    };
  }

  private async ensureAnalyticsRows(questions: any[]): Promise<any[]> {
    return Promise.all(
      questions.map(async (question: any) => {
        if (question.analytics && question.analytics.isActive) {
          return question;
        }

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
          ...question,
          analytics: {
            id: question.analytics?.id ?? null,
            questionId: question.id,
            totalAttempts: question.analytics?.totalAttempts ?? 0,
            correctCount: question.analytics?.correctCount ?? 0,
            avgTimeSeconds: question.analytics?.avgTimeSeconds ?? 0,
            isActive: true,
          },
        };
      }),
    );
  }

  private toAnalyticsReadData(question: any) {
    const totalAttempts = Number(question.analytics?.totalAttempts ?? 0);
    const correctCount = Number(question.analytics?.correctCount ?? 0);
    const incorrectCount = Math.max(totalAttempts - correctCount, 0);
    const accuracyPercent =
      totalAttempts > 0
        ? Number(((correctCount / totalAttempts) * 100).toFixed(2))
        : 0;

    return {
      questionId: question.id,
      testId: question.testId,
      questionText: question.questionText,
      type: question.type,
      inputType: question.inputType,
      points: question.points,
      difficulty: question.difficulty,
      skill: question.skill,
      totalAttempts,
      correctCount,
      incorrectCount,
      accuracyPercent,
      avgTimeSeconds: Number(question.analytics?.avgTimeSeconds ?? 0),
    };
  }

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

  private parsePositiveInt(value: unknown, field: string): number {
    const parsedNumber = Number(value);
    const isValid = Number.isInteger(parsedNumber) && parsedNumber > 0;

    if (!isValid) {
      throw new BadRequestException(`${field} must be a positive integer`);
    }

    return parsedNumber;
  }
}
