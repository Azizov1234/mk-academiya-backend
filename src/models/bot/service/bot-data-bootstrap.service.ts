import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../core/config/prisma.service';
import {
  DEFAULT_BOT_CENTER_INFO,
  DEFAULT_BOT_COURSES,
} from './bot-defaults';

@Injectable()
export class BotDataBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(BotDataBootstrapService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.ensureBotTables();
    await this.ensureCenterInfo();
    await this.ensureCourses();
    await this.ensureConfiguredAdmins();
    await this.logSnapshot();
  }

  private async ensureBotTables(): Promise<void> {
    await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "bot_admins" (
        "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        "telegramUserId" TEXT,
        "telegramUsername" TEXT,
        "fullName" TEXT NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await this.prisma.$executeRawUnsafe(
      'CREATE UNIQUE INDEX IF NOT EXISTS "bot_admins_telegramUserId_key" ON "bot_admins"("telegramUserId")',
    );
    await this.prisma.$executeRawUnsafe(
      'CREATE UNIQUE INDEX IF NOT EXISTS "bot_admins_telegramUsername_key" ON "bot_admins"("telegramUsername")',
    );

    await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "bot_student_results" (
        "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        "studentFullName" TEXT NOT NULL,
        "examType" TEXT NOT NULL,
        "scoreOrLevel" TEXT NOT NULL,
        "certificateImage" TEXT NOT NULL,
        "examDate" DATETIME NOT NULL,
        "channelPostLink" TEXT NOT NULL,
        "note" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "bot_lead_requests" (
        "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        "fullName" TEXT NOT NULL,
        "phone" TEXT NOT NULL,
        "courseType" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "bot_center_info" (
        "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        "aboutText" TEXT NOT NULL,
        "address" TEXT NOT NULL,
        "phone1" TEXT NOT NULL,
        "phone2" TEXT,
        "telegramUsername" TEXT,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "bot_courses" (
        "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        "title" TEXT NOT NULL,
        "description" TEXT NOT NULL,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  private async ensureCenterInfo(): Promise<void> {
    const existing = await this.prisma.botCenterInfo.findFirst({
      select: { id: true },
    });

    if (existing) {
      return;
    }

    await this.prisma.botCenterInfo.create({
      data: DEFAULT_BOT_CENTER_INFO,
    });
    this.logger.warn('bot_center_info was empty. Default center info created.');
  }

  private async ensureCourses(): Promise<void> {
    const coursesCount = await this.prisma.botCourse.count();
    if (coursesCount > 0) {
      return;
    }

    await this.prisma.botCourse.createMany({
      data: DEFAULT_BOT_COURSES,
    });
    this.logger.warn('bot_courses was empty. Default bot courses created.');
  }

  private async ensureConfiguredAdmins(): Promise<void> {
    const adminIds = this.configService
      .get<string>('ADMIN_TELEGRAM_IDS', '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
    const adminUsernames = this.configService
      .get<string>('ADMIN_TELEGRAM_USERNAMES', '')
      .split(',')
      .map((value) => value.trim().replace(/^@+/, '').toLowerCase())
      .filter(Boolean);

    for (const telegramUserId of adminIds) {
      await this.prisma.botAdmin.upsert({
        where: { telegramUserId },
        update: {},
        create: {
          telegramUserId,
          fullName: `Telegram admin ${telegramUserId}`,
        },
      });
    }

    for (const telegramUsername of adminUsernames) {
      await this.prisma.botAdmin.upsert({
        where: { telegramUsername },
        update: {},
        create: {
          telegramUsername,
          fullName: `@${telegramUsername}`,
        },
      });
    }
  }

  private async logSnapshot(): Promise<void> {
    const [admins, centerInfo, courses, results, leads] = await Promise.all([
      this.prisma.botAdmin.count(),
      this.prisma.botCenterInfo.count(),
      this.prisma.botCourse.count(),
      this.prisma.botStudentResult.count(),
      this.prisma.botLeadRequest.count(),
    ]);

    this.logger.log(
      `Bot DB ready: admins=${admins}, centerInfo=${centerInfo}, courses=${courses}, results=${results}, leads=${leads}`,
    );
  }
}
