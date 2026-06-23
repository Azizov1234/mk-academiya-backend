import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/config/prisma.service';

@Injectable()
export class AchievementService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.achievement.findMany();
  }

  async findByUserId(userId: number) {
    return (this.prisma.studentAchievement as any).findMany({
      where: { studentId: +userId },
      include: { achievement: true }
    });
  }
}
