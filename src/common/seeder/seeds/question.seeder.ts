import { Injectable, Logger } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UserRole } from '../../../core/enums';
import {
  questions as beginnerQuestionsA,
  questionsB as beginnerQuestionsB,
} from './questions.beginner.seed';
import {
  questionsA as elementaryQuestionsA,
  questionsB as elementaryQuestionsB,
} from './questions.elementry.seed';
import {
  questionsA as preIntermediateQuestionsA,
  questionsB as preIntermediateQuestionsB,
} from './questions.pre-intermediate.seed';
import { PrismaService } from 'src/core/config/prisma.service';

type RawSeedQuestion = {
  testId: number;
  type?: string;
  inputType?: string;
  questionText: string;
  options?: unknown;
  correctAnswer?: unknown;
  explanation?: string | null;
  points?: number;
  difficulty?: number;
  skill?: string | null;
  isActive?: boolean;
};

type ExistingQuestion = {
  id: number;
  testId: number;
  questionText: string;
  isActive: boolean;
};

type SeedResult = {
  superAdminStatus: 'created' | 'updated' | 'exists';
  testsCreated: number;
  questionsCreated: number;
  questionsReactivated: number;
  totalSeedQuestions: number;
};

@Injectable()
export class SeedService {
  constructor(private readonly prisma: PrismaService) {}

  logger = new Logger(SeedService.name);

  async onApplicationBootstrap(): Promise<void> {
    try {
      const result = await this.seedQuestionsIfMissing();
      this.logger.log(
        `Seed done: superAdminStatus=${result.superAdminStatus}, testsCreated=${result.testsCreated}, questionsCreated=${result.questionsCreated}, questionsReactivated=${result.questionsReactivated}, totalSeedQuestions=${result.totalSeedQuestions}`,
      );
    } catch (error) {
      this.logger.error(
        'Question seed failed during bootstrap',
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  async seedQuestionsIfMissing(): Promise<SeedResult> {
    const superAdminStatus = await this.ensureSuperAdmin();

    const allSeedQuestions = this.getAllSeedQuestions();
    const uniqueTestIds = [
      ...new Set(allSeedQuestions.map((question) => question.testId)),
    ];

    const testsCreated = await this.ensureTests(uniqueTestIds);
    const existingQuestions = await this.findExistingQuestions(uniqueTestIds);
    const existingByKey = this.mapExistingQuestions(existingQuestions);

    let questionsCreated = 0;
    let questionsReactivated = 0;

    for (const seedQuestion of allSeedQuestions) {
      const key = this.buildQuestionKey(
        seedQuestion.testId,
        seedQuestion.questionText,
      );
      const existing = existingByKey.get(key);

      if (existing) {
        if (!existing.isActive) {
          await (this.prisma.question as any).update({
            where: { id: existing.id },
            data: { isActive: true },
          });
          questionsReactivated += 1;
        }

        await this.ensureQuestionAnalytics(existing.id);
        continue;
      }

      const created = await (this.prisma.question as any).create({
        data: {
          testId: seedQuestion.testId,
          type: seedQuestion.type ?? 'MCQ',
          inputType: seedQuestion.inputType ?? 'OPTIONS',
          questionText: seedQuestion.questionText.trim(),
          options: this.encodeJsonField(seedQuestion.options),
          correctAnswer: this.encodeJsonField(seedQuestion.correctAnswer),
          explanation: seedQuestion.explanation ?? null,
          points: seedQuestion.points ?? 1,
          difficulty: seedQuestion.difficulty ?? 1,
          skill: seedQuestion.skill ?? null,
          isActive: seedQuestion.isActive ?? true,
        },
        select: { id: true },
      });

      await this.ensureQuestionAnalytics(Number(created.id));
      questionsCreated += 1;
    }

    return {
      superAdminStatus,
      testsCreated,
      questionsCreated,
      questionsReactivated,
      totalSeedQuestions: allSeedQuestions.length,
    };
  }

  private async ensureSuperAdmin(): Promise<'created' | 'updated' | 'exists'> {
    const phone = String(process.env.SUPERADMIN_PHONE ?? '998999992000').trim();
    const fullName = String(
      process.env.SUPERADMIN_FULL_NAME ?? 'SUPERADMIN',
    ).trim();
    const rawPassword = String(
      process.env.SUPERADMIN_PASSWORD ?? 'mcacademy',
    ).trim();
    const email = process.env.SUPERADMIN_EMAIL?.trim() || null;

    const existing = await this.prisma.user.findUnique({
      where: { phone },
      select: {
        id: true,
        role: true,
        isActive: true,
        fullName: true,
      },
    });

    if (!existing) {
      const saltRounds = this.resolveSaltRounds();
      const passwordHash = await bcrypt.hash(rawPassword, saltRounds);

      const created = await this.prisma.user.create({
        data: {
          phone,
          fullName,
          role: UserRole.SUPERADMIN,
          passwordHash,
          isActive: true,
        },
        select: { id: true },
      });

      await this.prisma.userProfile.upsert({
        where: { userId: created.id },
        update: { isActive: true, ...(email ? { email } : {}) },
        create: {
          userId: created.id,
          isActive: true,
          ...(email ? { email } : {}),
        },
      });

      return 'created';
    }

    const needsUpdate =
      existing.role !== UserRole.SUPERADMIN ||
      existing.isActive !== true ||
      existing.fullName !== fullName;

    if (needsUpdate) {
      await this.prisma.user.update({
        where: { id: existing.id },
        data: {
          role: UserRole.SUPERADMIN,
          isActive: true,
          fullName,
        },
      });

      await this.prisma.userProfile.upsert({
        where: { userId: existing.id },
        update: { isActive: true, ...(email ? { email } : {}) },
        create: {
          userId: existing.id,
          isActive: true,
          ...(email ? { email } : {}),
        },
      });

      return 'updated';
    }

    return 'exists';
  }

  private resolveSaltRounds(): number {
    const parsed = Number(process.env.BCRYPT_SALT ?? 10);
    if (!Number.isFinite(parsed) || parsed < 4 || parsed > 16) {
      return 10;
    }
    return Math.trunc(parsed);
  }

  private async ensureTests(testIds: number[]): Promise<number> {
    let testsCreated = 0;

    for (const testId of testIds) {
      const existingTest = await (this.prisma.test as any).findUnique({
        where: { id: testId },
        select: { id: true },
      });

      if (existingTest) {
        continue;
      }

      await (this.prisma.test as any).create({
        data: {
          id: testId,
          title: `Seed Test Variant ${testId}`,
          description: `Auto-created for question seed (testId=${testId})`,
          type: 'PRACTICE',
          passingScore: 0,
          isPublished: true,
          isActive: true,
        },
      });
      testsCreated += 1;
    }

    return testsCreated;
  }

  private async findExistingQuestions(
    testIds: number[],
  ): Promise<ExistingQuestion[]> {
    const rows = await (this.prisma.question as any).findMany({
      where: { testId: { in: testIds } },
      select: {
        id: true,
        testId: true,
        questionText: true,
        isActive: true,
      },
    });

    return rows.map((row: any) => ({
      id: Number(row.id),
      testId: Number(row.testId),
      questionText: String(row.questionText),
      isActive: Boolean(row.isActive),
    }));
  }

  private mapExistingQuestions(existingQuestions: ExistingQuestion[]) {
    const map = new Map<string, { id: number; isActive: boolean }>();

    for (const row of existingQuestions) {
      map.set(this.buildQuestionKey(row.testId, row.questionText), {
        id: row.id,
        isActive: row.isActive,
      });
    }

    return map;
  }

  private async ensureQuestionAnalytics(questionId: number): Promise<void> {
    await this.prisma.questionAnalytics.upsert({
      where: { questionId },
      update: { isActive: true },
      create: {
        questionId,
        totalAttempts: 0,
        correctCount: 0,
        avgTimeSeconds: 0,
        isActive: true,
      },
    });
  }

  private getAllSeedQuestions(): RawSeedQuestion[] {
    const combined = [
      ...beginnerQuestionsA,
      ...beginnerQuestionsB,
      ...elementaryQuestionsA,
      ...elementaryQuestionsB,
      ...preIntermediateQuestionsA,
      ...preIntermediateQuestionsB,
    ];

    return combined
      .map((question) => ({
        ...question,
        questionText: String(question.questionText ?? '').trim(),
      }))
      .filter((question) => question.questionText.length > 0);
  }

  private buildQuestionKey(testId: number, questionText: string): string {
    return `${testId}::${questionText.trim()}`;
  }

  private encodeJsonField(value: unknown): string | null {
    if (value === undefined || value === null) {
      return null;
    }

    if (typeof value === 'string') {
      return value;
    }

    return JSON.stringify(value);
  }
}
