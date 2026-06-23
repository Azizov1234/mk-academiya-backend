import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../core/config/prisma.service';
import { UserRole } from 'src/core/enums';
import { AddWordListItemDto } from './dto/add-word-list-item.dto';

@Injectable()
export class WordListItemService {
  constructor(private readonly prisma: PrismaService) {}

  private async checkTeacherGroupAccess(teacherId: number, studentId: number) {
    const isMember = await this.prisma.groupMember.findFirst({
      where: {
        studentId: studentId,
        isActive: true,
        group: {
          teacherId: teacherId,
          isActive: true,
        },
      },
    });

    if (!isMember) {
      throw new ForbiddenException("Faqat o'zingizning guruhingizdagi o'quvchilar ro'yxatiga o'zgartirish kirita olasiz");
    }
  }

  async create(wordListId: number, dto: AddWordListItemDto, currentUser: any) {
    const list = await this.prisma.wordList.findUnique({
      where: { id: wordListId },
    });
    if (!list || !list.isActive) {
      throw new NotFoundException("So'z ro'yxati topilmadi yoki faol emas");
    }

    if (currentUser.role === UserRole.TEACHER) {
      await this.checkTeacherGroupAccess(currentUser.id, list.studentId);
    }

    const vocab = await this.prisma.vocabulary.findUnique({
      where: { id: dto.vocabularyId },
    });
    if (!vocab || !vocab.isActive) {
      throw new NotFoundException("Lug'atda bunday so'z topilmadi");
    }

    const existingItem = await this.prisma.wordListItem.findUnique({
      where: {
        wordListId_vocabularyId: {
          wordListId,
          vocabularyId: dto.vocabularyId,
        },
      },
    });

    if (existingItem) {
      if (existingItem.isActive) {
        throw new ConflictException("Bu so'z ro'yxatga allaqachon qo'shilgan");
      }
      
      return this.prisma.wordListItem.update({
        where: { id: existingItem.id },
        data: { isActive: true },
        include: { vocabulary: true },
      });
    }

    return this.prisma.wordListItem.create({
      data: {
        wordListId,
        vocabularyId: dto.vocabularyId,
      },
      include: { vocabulary: true },
    });
  }

  async findAllByList(wordListId: number, currentUser: any) {
    const list = await this.prisma.wordList.findUnique({
      where: { id: wordListId },
    });
    if (!list || !list.isActive) {
      throw new NotFoundException("So'z ro'yxati topilmadi");
    }

    if (currentUser.role === UserRole.STUDENT && list.studentId !== currentUser.id && !list.isPublic) {
      throw new ForbiddenException("Faqat o'zingizning ro'yxatingizni ko'ra olasiz");
    }

    if (currentUser.role === UserRole.TEACHER) {
      await this.checkTeacherGroupAccess(currentUser.id, list.studentId);
    }

    return this.prisma.wordListItem.findMany({
      where: { wordListId, isActive: true },
      include: { vocabulary: true },
      orderBy: { addedAt: 'desc' },
    });
  }

  async remove(wordListId: number, vocabularyId: number, currentUser: any) {
    const list = await this.prisma.wordList.findUnique({
      where: { id: wordListId },
    });
    if (!list) throw new NotFoundException("So'z ro'yxati topilmadi");

    if (currentUser.role === UserRole.TEACHER) {
      await this.checkTeacherGroupAccess(currentUser.id, list.studentId);
    }

    try {
      await this.prisma.wordListItem.update({
        where: {
          wordListId_vocabularyId: {
            wordListId,
            vocabularyId,
          },
        },
        data: { isActive: false },
      });
      return { success: true, message: "So'z ro'yxatdan muvaffaqiyatli o'chirildi" };
    } catch (error) {
      throw new BadRequestException("Bu so'z ro'yxatda topilmadi");
    }
  }
}
