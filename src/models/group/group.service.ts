import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/config/prisma.service';
import { CreateGroupDto, UpdateGroupDto } from './dto';
import { UserRole } from 'src/core/enums';

@Injectable()
export class GroupService {
  constructor(private prisma: PrismaService) { }

  async create(payload: CreateGroupDto) {

    //check teacher is exists
    const checkTeacherId = await this.prisma.user.findFirst({ where: { id: payload.teacherId, isActive: true, role: "TEACHER" } });
    if (!checkTeacherId) {
      throw new NotFoundException('Bunday o\'qituvchi mavjud emas');
    }

    //check unique invite code
    const checkUniqueInviteCode = await this.prisma.group.findFirst({ where: { inviteCode: payload.inviteCode } });
    if (checkUniqueInviteCode) {
      throw new BadRequestException('Bunday taklif kodi allaqachon mavjud');
    }
    const group = await this.prisma.group.create({
      data: {
        name: payload.name,
        description: payload?.description,
        teacherId: payload.teacherId,
        inviteCode: payload.inviteCode
      }
    });
    return {
      message: "Guruh muvaffaqiyatli yaratildi",
      data: group
    }
  }

  //find many active groups
  async findAll() {
    return await this.prisma.group.findMany({
      where: {
        isActive: true
      }
    });
  }

  //find one active group by id
  async findOne(id: number) {
    const group = await this.prisma.group.findUnique({
      where: { id },
      include: {
        teacher: {
          select: { id: true, fullName: true, phone: true, avatarUrl: true }
        },
        members: {
          where: { isActive: true },
          include: {
            student: {
              select: { id: true, fullName: true, phone: true, avatarUrl: true, cefrLevel: true }
            }
          },
          orderBy: { joinedAt: 'asc' }
        },
        _count: {
          select: { members: true }
        }
      }
    });
    if (!group) {
      throw new NotFoundException('Bunday guruh mavjud emas');
    }
    if (!group.isActive) {
      throw new NotFoundException('Bu guruh faol emas');
    }
    return group;
  }

  //update group by id
  async update(id: number, payload: UpdateGroupDto) {
    await this.findOne(id);

    const data: any = {};
    if (payload.name !== undefined) data.name = payload.name;
    if (payload.description !== undefined) data.description = payload.description;
    if (payload.inviteCode !== undefined) data.inviteCode = payload.inviteCode;

    // Faqat teacherId yuborilgan bo'lsa tekshir
    if (payload.teacherId) {
      const teacher = await this.prisma.user.findFirst({
        where: { id: payload.teacherId, isActive: true, role: UserRole.TEACHER }
      });
      if (!teacher) {
        throw new NotFoundException('Bunday o\'qituvchi mavjud emas');
      }
      data.teacherId = payload.teacherId;
    }

    const updatedGroup = await this.prisma.group.update({
      where: { id },
      data
    });

    return {
      message: "Guruh muvaffaqiyatli yangilandi",
      data: updatedGroup
    };
  }

  //remove group by id (soft delete)
  async remove(id: number) {
    const group = await this.prisma.group.findFirst({ where: { id } });
    if (!group) {
      throw new NotFoundException('Bunday guruh mavjud emas');
    }
    if (!group.isActive) {
      throw new BadRequestException('Bu guruh allaqachon o\'chirilgan');
    }
    return await this.prisma.group.update({
      where: { id },
      data: { isActive: false }
    });
  }

  //get members by group id
  async getMembersByGroupId(groupId: number) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      include: { members: true }
    });
    if (!group) {
      throw new NotFoundException('Bunday guruh mavjud emas');
    }
    return group.members;
  }

  async getGroupsByTeacherId(teacherId: number) {
    const teacher = await this.prisma.user.findFirst({
      where: { id: teacherId, isActive: true, role: UserRole.TEACHER }
    });
    if (!teacher) {
      throw new NotFoundException('Bunday o\'qituvchi mavjud emas');
    }

    return await this.prisma.group.findMany({
      where: { teacherId, isActive: true }
    });
  }
}
