import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/config/prisma.service';
import { CreateLeadDto, UpdateLeadAnswerDto, UpdateLeadStatusDto } from './dto';

@Injectable()
export class LeadService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateLeadDto) {
    return this.prisma.lead.create({
      data: dto,
    });
  }

  async findAll() {
    return this.prisma.lead.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findPublishedQuestions() {
    return this.prisma.lead.findMany({
      where: {
        isActive: true,
        isPublished: true,
        message: { not: null },
        answer: { not: null },
      },
      orderBy: { answeredAt: 'desc' },
      take: 12,
      select: {
        id: true,
        fullName: true,
        message: true,
        answer: true,
        answeredAt: true,
        createdAt: true,
      },
    });
  }

  async updateStatus(id: number, dto: UpdateLeadStatusDto) {
    await this.ensureExists(id);

    return this.prisma.lead.update({
      where: { id },
      data: { status: dto.status },
    });
  }

  async updateAnswer(id: number, dto: UpdateLeadAnswerDto) {
    const lead = await this.ensureExists(id);
    const answer = dto.answer.trim();

    if (!answer) {
      throw new BadRequestException('Javob matni kiritilishi shart');
    }

    const isPublished = Boolean(dto.isPublished ?? true);

    return this.prisma.lead.update({
      where: { id },
      data: {
        answer,
        isPublished,
        answeredAt: new Date(),
        status: lead?.status === 'NEW' ? 'CONTACTED' : undefined,
      },
    });
  }

  async remove(id: number) {
    await this.ensureExists(id);

    return this.prisma.lead.update({
      where: { id },
      data: { isActive: false },
    });
  }

  private async ensureExists(id: number) {
    const lead = await this.prisma.lead.findFirst({
      where: { id, isActive: true },
    });

    if (!lead) {
      throw new NotFoundException('Murojaat topilmadi');
    }

    return lead;
  }
}
