import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BotAdmin, Prisma } from '@prisma/client';
import { ExamType } from './exam-type';
import { BotLeadsService } from './bot-leads.service';
import { PrismaService } from '../../../core/config/prisma.service';
import { BotResultsService } from './bot-results.service';
import { CreateAdminDto } from './dto/admin-dto/create-admin.dto';

@Injectable()
export class BotAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly resultsService: BotResultsService,
    private readonly leadsService: BotLeadsService,
  ) {}

  async create(dto: CreateAdminDto): Promise<BotAdmin> {
    const telegramUserId = this.normalizeTelegramUserId(dto.telegramUserId);
    const telegramUsername = this.normalizeTelegramUsername(dto.telegramUsername);

    if (!telegramUserId && !telegramUsername) {
      throw new BadRequestException(
        'Admin qo\'shish uchun telegramUserId yoki telegramUsername berilishi kerak',
      );
    }

    const existingAdmin = await this.findAdminByIdentity({
      telegramUserId,
      telegramUsername,
    });

    if (existingAdmin) {
      return this.prisma.botAdmin.update({
        where: { id: existingAdmin.id },
        data: {
          fullName: dto.fullName,
          ...(telegramUserId ? { telegramUserId } : {}),
          ...(telegramUsername ? { telegramUsername } : {}),
        },
      });
    }

    return this.prisma.botAdmin.create({
      data: {
        fullName: dto.fullName,
        ...(telegramUserId ? { telegramUserId } : {}),
        ...(telegramUsername ? { telegramUsername } : {}),
      },
    });
  }

  async isAdmin(identity: {
    telegramUserId?: number | string | null;
    telegramUsername?: string | null;
  }): Promise<boolean> {
    const normalizedId = this.normalizeTelegramUserId(identity.telegramUserId);
    const normalizedUsername = this.normalizeTelegramUsername(
      identity.telegramUsername,
    );

    if (normalizedId && this.getConfiguredAdminIds().includes(normalizedId)) {
      return true;
    }

    if (
      normalizedUsername &&
      this.getConfiguredAdminUsernames().includes(normalizedUsername)
    ) {
      return true;
    }

    const admin = await this.findAdminByIdentity({
      telegramUserId: normalizedId,
      telegramUsername: normalizedUsername,
    });

    return Boolean(admin);
  }

  async getStats(): Promise<{
    total: number;
    cefrCount: number;
    ieltsCount: number;
  }> {
    return this.resultsService.getSummary();
  }

  async getResultsByExamType(examType: ExamType, limit = 10) {
    return this.resultsService.findByExamType(examType, limit);
  }

  async searchStudents(query: string, limit = 10) {
    return this.resultsService.searchByStudent(query, limit);
  }

  async getRecentLeads(limit = 10) {
    return this.leadsService.findAll(limit);
  }

  async findAllAdmins(): Promise<BotAdmin[]> {
    return this.prisma.botAdmin.findMany({
      orderBy: { createdAt: 'asc' },
    });
  }

  async addAdminByUsername(
    rawUsername: string,
    fullName?: string,
  ): Promise<BotAdmin> {
    const telegramUsername = this.normalizeTelegramUsername(rawUsername);
    if (!telegramUsername) {
      throw new BadRequestException('Yaroqli username kiriting');
    }

    const existingAdmin = await this.findAdminByIdentity({ telegramUsername });
    const resolvedFullName = (fullName?.trim() || `@${telegramUsername}`).slice(
      0,
      120,
    );

    if (existingAdmin) {
      return this.prisma.botAdmin.update({
        where: { id: existingAdmin.id },
        data: {
          telegramUsername,
          fullName: resolvedFullName,
        },
      });
    }

    return this.prisma.botAdmin.create({
      data: {
        telegramUsername,
        fullName: resolvedFullName,
      },
    });
  }

  async removeAdminByUsername(rawUsername: string): Promise<boolean> {
    const telegramUsername = this.normalizeTelegramUsername(rawUsername);
    if (!telegramUsername) {
      throw new BadRequestException('Yaroqli username kiriting');
    }

    let found: { id: number } | null = null;
    try {
      found = await this.prisma.botAdmin.findUnique({
        where: { telegramUsername },
        select: { id: true },
      });
    } catch (error) {
      if (this.isMissingTelegramUsernameColumn(error)) {
        return false;
      }
      throw error;
    }

    if (!found) {
      return false;
    }

    await this.prisma.botAdmin.delete({
      where: { id: found.id },
    });

    return true;
  }

  formatAdminIdentity(
    admin: Pick<BotAdmin, 'telegramUserId' | 'telegramUsername'>,
  ): string {
    if (admin.telegramUsername) {
      return `@${admin.telegramUsername}`;
    }

    if (admin.telegramUserId) {
      return `id:${admin.telegramUserId}`;
    }

    return 'unknown';
  }

  getConfiguredAdminIds(): string[] {
    const raw = this.configService.get<string>('ADMIN_TELEGRAM_IDS', '');
    return raw
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
  }

  getConfiguredAdminUsernames(): string[] {
    const raw = this.configService.get<string>('ADMIN_TELEGRAM_USERNAMES', '');
    return raw
      .split(',')
      .map((value) => this.normalizeTelegramUsername(value))
      .filter((value): value is string => Boolean(value));
  }

  private normalizeTelegramUserId(
    telegramUserId: number | string | null | undefined,
  ): string | undefined {
    if (telegramUserId === null || telegramUserId === undefined) {
      return undefined;
    }

    const normalized = String(telegramUserId).trim();
    return normalized || undefined;
  }

  private normalizeTelegramUsername(
    telegramUsername: string | null | undefined,
  ): string | undefined {
    if (!telegramUsername) {
      return undefined;
    }

    const normalized = telegramUsername.trim().replace(/^@+/, '').toLowerCase();
    return normalized || undefined;
  }

  private async findAdminByIdentity(identity: {
    telegramUserId?: string;
    telegramUsername?: string;
  }): Promise<Pick<BotAdmin, 'id'> | null> {
    const { telegramUserId, telegramUsername } = identity;

    if (telegramUserId) {
      const adminById = await this.prisma.botAdmin.findUnique({
        where: { telegramUserId },
        select: { id: true },
      });

      if (adminById) {
        return adminById;
      }
    }

    if (telegramUsername) {
      let adminByUsername: { id: number } | null = null;
      try {
        adminByUsername = await this.prisma.botAdmin.findUnique({
          where: { telegramUsername },
          select: { id: true },
        });
      } catch (error) {
        if (!this.isMissingTelegramUsernameColumn(error)) {
          throw error;
        }
      }

      if (adminByUsername) {
        return adminByUsername;
      }
    }

    return null;
  }

  private isMissingTelegramUsernameColumn(error: unknown): boolean {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
      return false;
    }

    return (
      error.code === 'P2022' &&
      String((error.meta as { column?: string } | undefined)?.column ?? '').includes(
        'telegramUsername',
      )
    );
  }
}

