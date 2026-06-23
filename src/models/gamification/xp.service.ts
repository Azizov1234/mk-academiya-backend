import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/config/prisma.service';

@Injectable()
export class XPService {
  constructor(private prisma: PrismaService) {}

  async addXP(userId: number, amount: number, reason: string) {
    const transaction = await this.prisma.xpTransaction.create({
      data: { studentId: +userId, amount, reason } as any
    });

    const existingLeaderboard = await (this.prisma.leaderboard as any).findFirst({
      where: { studentId: +userId, scope: 'GLOBAL', isActive: true },
      select: { id: true },
    });

    if (existingLeaderboard) {
      await (this.prisma.leaderboard as any).update({
        where: { id: existingLeaderboard.id },
        data: { score: { increment: amount } },
        select: { id: true },
      });
    } else {
      await (this.prisma.leaderboard as any).create({
        data: { studentId: +userId, score: amount, scope: 'GLOBAL' },
        select: { id: true },
      });
    }

    return transaction;
  }

  async getRank(userId: number) {
    const userEntry = await (this.prisma.leaderboard as any).findFirst({
      where: { studentId: +userId },
      select: { score: true },
    });
    if (!userEntry) return 0;
    
    const count = await (this.prisma.leaderboard as any).count({
      where: { score: { gt: userEntry.score } }
    });
    return count + 1;
  }
}
