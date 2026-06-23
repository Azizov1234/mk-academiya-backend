import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../core/config/prisma.service';
import { Status, UserRole } from 'src/core/enums';

@Injectable()
export class GroupMemberService {
  constructor(private prisma: PrismaService) { }

  private readonly memberSelect = {
    id: true,
    groupId: true,
    studentId: true,
    status: true,
    isActive: true,
    joinedAt: true,
    student: {
      select: {
        id: true,
        fullName: true,
        phone: true,
        avatarUrl: true,
        cefrLevel: true,
        role: true,
      }
    },
    group: {
      select: {
        id: true,
        name: true,
      }
    }
  } as const;

  async addMember(groupId: number, studentId: number) {
    const normalizedGroupId = +groupId;
    const normalizedStudentId = +studentId;

    const checkgroupId = await this.prisma.group.findFirst({
      where: { id: normalizedGroupId, isActive: true }
    });
    if (!checkgroupId) {
      throw new NotFoundException('Bunday group topilmadi');
    }

    const checkStudentId = await this.prisma.user.findFirst({
      where: { id: normalizedStudentId, isActive: true, role: UserRole.STUDENT }
    });
    if (!checkStudentId) {
      throw new NotFoundException('Bunday student topilmadi');
    }

    const existingMembership = await this.prisma.groupMember.findUnique({
      where: {
        groupId_studentId: {
          groupId: normalizedGroupId,
          studentId: normalizedStudentId,
        }
      }
    });

    if (existingMembership?.isActive) {
      throw new ConflictException('Bu student allaqachon guruhga biriktirilgan');
    }

    let createdMember;
    try {
      createdMember = existingMembership
        ? await this.prisma.groupMember.update({
          where: { id: existingMembership.id },
          data: {
            status: Status.ACTIVE,
            isActive: true,
            joinedAt: new Date(),
          },
          select: this.memberSelect,
        })
        : await this.prisma.groupMember.create({
          data: {
            groupId: normalizedGroupId,
            studentId: normalizedStudentId,
            status: Status.ACTIVE,
          },
          select: this.memberSelect,
        });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Bu student allaqachon guruhga biriktirilgan');
      }
      throw error;
    }

    return {
      message: existingMembership
        ? "Student guruhga qayta qo'shildi"
        : "Student guruhga qo'shildi",
      data: createdMember
    }
  }

  async removeMember(groupId: number, studentId: number) {
    const normalizedGroupId = +groupId;
    const normalizedStudentId = +studentId;

    const checkgroupId = await this.prisma.group.findFirst({
      where: { id: normalizedGroupId, isActive: true }
    });
    if (!checkgroupId) {
      throw new NotFoundException('Bunday group topilmadi');
    }

    const membership = await this.prisma.groupMember.findUnique({
      where: {
        groupId_studentId: {
          groupId: normalizedGroupId,
          studentId: normalizedStudentId,
        }
      }
    });

    if (!membership || !membership.isActive) {
      throw new NotFoundException('Bu student guruhda faol emas');
    }

    const removedMember = await this.prisma.groupMember.update({
      where: {
        groupId_studentId: {
          groupId: normalizedGroupId,
          studentId: normalizedStudentId,
        }
      },
      data: { status: Status.INACTIVE, isActive: false },
    });
    return {
      message: "Student guruhdan olib tashlandi",
      data: removedMember
    };
  }

  async findMembers(groupId: number) {
    const group = await this.prisma.group.findFirst({
      where: { id: +groupId, isActive: true }
    });
    if (!group) throw new NotFoundException('Bunday guruh topilmadi');

    return this.prisma.groupMember.findMany({
      where: { groupId: +groupId, isActive: true },
      select: this.memberSelect,
      orderBy: { joinedAt: 'asc' }
    });
  }
}
