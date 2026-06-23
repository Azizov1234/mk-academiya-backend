import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../core/config/prisma.service';
import { UserRole } from 'src/core/enums';

@Injectable()
export class WordListService {
  constructor(private prisma: PrismaService) {}

  /**
   * Teacher o'quvchi o'z guruhida ekanligini tekshiruvchi yordamchi funksiya
   */
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
      throw new ForbiddenException("Faqat o'zingizning guruhingizdagi o'quvchilarga ruxsatingiz bor");
    }
  }

  async create(dto: any, currentUser: any) {
    if (!dto.studentId) throw new BadRequestException("O'quvchi ID (studentId) ko'rsatilishi shart");

    if (currentUser.role === UserRole.TEACHER) {
      await this.checkTeacherGroupAccess(currentUser.id, dto.studentId);
    }

    return this.prisma.wordList.create({
      data: {
        studentId: dto.studentId,
        name: dto.name,
        isPublic: dto.isPublic || false,
      },
    });
  }

  async findAll(currentUser: any) {
    const where: any = { isActive: true };
    
    if (currentUser.role === UserRole.STUDENT) {
      // O'quvchi faqat o'zinikini ko'ra oladi
      where.studentId = currentUser.id;
    } else if (currentUser.role === UserRole.TEACHER) {
      // O'qituvchi o'zining barcha guruhlaridagi studentlarni listlarini ko'rishi mumkin
      const myGroups = await this.prisma.group.findMany({
        where: { teacherId: currentUser.id, isActive: true },
        select: { id: true },
      });
      const groupIds = myGroups.map(g => g.id);
      
      const myStudents = await this.prisma.groupMember.findMany({
        where: { groupId: { in: groupIds }, isActive: true },
        select: { studentId: true },
      });
      const studentIds = myStudents.map(m => m.studentId);
      
      where.studentId = { in: studentIds };
    }

    return this.prisma.wordList.findMany({
      where,
      include: {
        student: { select: { id: true, fullName: true } },
        items: {
          where: { isActive: true },
          include: { vocabulary: true },
        },
      },
    });
  }

  async findOne(id: number, currentUser: any) {
    const list = await this.prisma.wordList.findUnique({
      where: { id },
      include: {
        student: { select: { id: true, fullName: true } },
        items: {
          where: { isActive: true },
          include: { vocabulary: true },
        },
      },
    });
    if (!list || !list.isActive) throw new NotFoundException("Ro'yxat topilmadi");

    if (currentUser.role === UserRole.STUDENT && list.studentId !== currentUser.id) {
      throw new ForbiddenException("Faqat o'zingizning guruh/ro'yxatingizni ko'ra olasiz");
    }

    if (currentUser.role === UserRole.TEACHER) {
      await this.checkTeacherGroupAccess(currentUser.id, list.studentId);
    }

    return list;
  }

  async update(id: number, dto: any, currentUser: any) {
    const list = await this.prisma.wordList.findUnique({ where: { id } });
    if (!list) throw new NotFoundException("Ro'yxat topilmadi");

    if (currentUser.role === UserRole.TEACHER) {
      await this.checkTeacherGroupAccess(currentUser.id, list.studentId);
    }

    // Agar studentId almashtirilmoqchi bo'lsa
    if (dto.studentId && dto.studentId !== list.studentId) {
      if (currentUser.role === UserRole.TEACHER) {
        await this.checkTeacherGroupAccess(currentUser.id, dto.studentId);
      }
    }

    return this.prisma.wordList.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: number, currentUser: any) {
    const list = await this.prisma.wordList.findUnique({ where: { id } });
    if (!list) throw new NotFoundException("Ro'yxat topilmadi");

    if (currentUser.role === UserRole.TEACHER) {
      await this.checkTeacherGroupAccess(currentUser.id, list.studentId);
    }

    return this.prisma.wordList.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
