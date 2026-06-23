import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/config/prisma.service';
import { CreateRatingDto } from './dto';

@Injectable()
export class RatingService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateRatingDto) {
    return (this.prisma.rating as any).upsert({
      where: {
        userId_targetType_targetId: {
          userId: +dto.userId,
          targetType: dto.targetType,
          targetId: dto.targetId,
        },
      },
      update: {
        score: dto.score,
        reviewText: dto.reviewText,
        isActive: true,
      },
      create: {
        userId: +dto.userId,
        targetType: dto.targetType,
        targetId: dto.targetId,
        score: dto.score,
        reviewText: dto.reviewText,
      },
    });
  }

  async findAll() {
    return (this.prisma.rating as any).findMany({ where: { isActive: true } });
  }

  async findByTarget(targetType: string, targetId: string) {
    return (this.prisma.rating as any).findMany({ where: { targetType, targetId, isActive: true } });
  }

  async remove(id: number) {
    return (this.prisma.rating as any).update({
      where: { id: +id },
      data: { isActive: false },
    });
  }
}
