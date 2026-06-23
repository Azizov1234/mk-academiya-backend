import { Injectable } from '@nestjs/common';
import { BotCenterInfo } from '@prisma/client';
import { PrismaService } from '../../../core/config/prisma.service';
import { UpdateCenterInfoDto } from './dto/center-info-dto/update-center-info.dto';
import { DEFAULT_BOT_CENTER_INFO } from './bot-defaults';

@Injectable()
export class BotCenterInfoService {
  constructor(private readonly prisma: PrismaService) {}

  async getCenterInfo(): Promise<BotCenterInfo> {
    const centerInfo = await this.prisma.botCenterInfo.findFirst({
      orderBy: { id: 'asc' },
    });

    return (
      centerInfo ??
      this.prisma.botCenterInfo.create({
        data: DEFAULT_BOT_CENTER_INFO,
      })
    );
  }

  async upsert(dto: UpdateCenterInfoDto): Promise<BotCenterInfo> {
    const existing = await this.prisma.botCenterInfo.findFirst({
      orderBy: { id: 'asc' },
      select: { id: true },
    });

    if (existing) {
      return this.prisma.botCenterInfo.update({
        where: { id: existing.id },
        data: dto,
      });
    }

    return this.prisma.botCenterInfo.create({
      data: dto,
    });
  }
}

