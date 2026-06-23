import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../core/config/prisma.service';
import { SubmitReviewDto } from './dto';
import { UserRole } from 'src/core/enums';
import { VocabularyStatus } from './interfaces';

@Injectable()
export class VocabularyProgressService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * SM-2 algoritmiga asoslangan keyingi takrorlash sanasini hisoblash
   * quality: 0-5 (0=butunlay unutgan, 5=mukammal)
   */
  private calculateSM2(
    quality: number,
    easeFactor: number,
    intervalDays: number,
    repetitions: number,
  ): { newEaseFactor: number; newInterval: number; nextReviewAt: Date } {
    let newEaseFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    if (newEaseFactor < 1.3) newEaseFactor = 1.3;

    let newInterval: number;
    if (quality < 3) {
      // Javob noto'g'ri — qayta boshlash
      newInterval = 1;
    } else if (repetitions === 0) {
      newInterval = 1;
    } else if (repetitions === 1) {
      newInterval = 6;
    } else {
      newInterval = Math.round(intervalDays * newEaseFactor);
    }

    const nextReviewAt = new Date();
    nextReviewAt.setDate(nextReviewAt.getDate() + newInterval);

    return { newEaseFactor, newInterval, nextReviewAt };
  }

  /**
   * Status yangilash logikasi
   */
  private determineStatus(intervalDays: number, quality: number): VocabularyStatus {
    if (quality < 3) return VocabularyStatus.LEARNING;
    if (intervalDays >= 21) return VocabularyStatus.MASTERED;
    if (intervalDays >= 7) return VocabularyStatus.REVIEWING;
    return VocabularyStatus.LEARNING;
  }

  /**
   * O'quvchining so'z bo'yicha taqdimot yuborishi (SM-2 bilan)
   */
  async submitReview(dto: SubmitReviewDto, currentUser: any) {
    const { vocabularyId, quality } = dto;

    const vocab = await this.prisma.vocabulary.findUnique({ where: { id: vocabularyId } });
    if (!vocab || !vocab.isActive) throw new NotFoundException("So'z topilmadi");

    const studentId = currentUser.id;

    const existing = await this.prisma.vocabularyProgress.findUnique({
      where: { studentId_vocabularyId: { studentId, vocabularyId } },
    });

    const prevEaseFactor = existing?.easeFactor ?? 2.5;
    const prevInterval = existing?.intervalDays ?? 0;
    const repetitions = existing ? existing.correctCount + existing.wrongCount : 0;

    const { newEaseFactor, newInterval, nextReviewAt } = this.calculateSM2(
      quality,
      prevEaseFactor,
      prevInterval,
      repetitions,
    );

    const isCorrect = quality >= 3;
    const newStatus = this.determineStatus(newInterval, quality);

    if (existing) {
      return this.prisma.vocabularyProgress.update({
        where: { id: existing.id },
        data: {
          status: newStatus,
          easeFactor: newEaseFactor,
          intervalDays: newInterval,
          nextReviewAt,
          lastReviewedAt: new Date(),
          correctCount: isCorrect ? existing.correctCount + 1 : existing.correctCount,
          wrongCount: !isCorrect ? existing.wrongCount + 1 : existing.wrongCount,
        },
        include: { vocabulary: true },
      });
    }

    return this.prisma.vocabularyProgress.create({
      data: {
        studentId,
        vocabularyId,
        status: newStatus,
        easeFactor: newEaseFactor,
        intervalDays: newInterval,
        nextReviewAt,
        lastReviewedAt: new Date(),
        correctCount: isCorrect ? 1 : 0,
        wrongCount: isCorrect ? 0 : 1,
      },
      include: { vocabulary: true },
    });
  }

  /**
   * O'quvchi o'z progressini ko'rishi
   * O'qituvchi guruhdagi o'quvchilar progressini ko'ra oladi
   */
  async findByStudent(studentId: number, currentUser: any) {
    if (currentUser.role === UserRole.STUDENT && currentUser.id !== studentId) {
      throw new ForbiddenException("Faqat o'z progressingizni ko'ra olasiz");
    }

    if (currentUser.role === UserRole.TEACHER) {
      const isMember = await this.prisma.groupMember.findFirst({
        where: {
          studentId,
          isActive: true,
          group: { teacherId: currentUser.id, isActive: true },
        },
      });
      if (!isMember) throw new ForbiddenException("Faqat o'z guruhingizdagi o'quvchilarni ko'ra olasiz");
    }

    return this.prisma.vocabularyProgress.findMany({
      where: { studentId, isActive: true },
      include: { vocabulary: true },
      orderBy: { nextReviewAt: 'asc' },
    });
  }

  /**
   * Bugungi takrorlashga tayyor bo'lgan so'zlar (nextReviewAt <= now)
   */
  async getDueReviews(currentUser: any) {
    const studentId = currentUser.id;
    const now = new Date();

    return this.prisma.vocabularyProgress.findMany({
      where: {
        studentId,
        isActive: true,
        OR: [
          { nextReviewAt: { lte: now } },
          { nextReviewAt: null },
        ],
      },
      include: { vocabulary: true },
      orderBy: { nextReviewAt: 'asc' },
    });
  }

  /**
   * Bitta progress yozuvini ko'rish (admin/teacher uchun)
   */
  async findOne(id: number) {
    const progress = await this.prisma.vocabularyProgress.findUnique({
      where: { id },
      include: { vocabulary: true, student: { select: { id: true, fullName: true } } },
    });
    if (!progress || !progress.isActive) throw new NotFoundException('Progress topilmadi');
    return progress;
  }
}
