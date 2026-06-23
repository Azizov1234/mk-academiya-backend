import { Injectable } from '@nestjs/common';
import { BotLeadRequest } from '@prisma/client';
import { PrismaService } from '../../../core/config/prisma.service';
import { CreateLeadRequestDto } from './dto/leads-dto/create-lead-request.dto';

@Injectable()
export class BotLeadsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateLeadRequestDto): Promise<BotLeadRequest> {
    return this.prisma.botLeadRequest.create({
      data: dto,
    });
  }

  async findAll(limit = 10): Promise<BotLeadRequest[]> {
    return this.prisma.botLeadRequest.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}

