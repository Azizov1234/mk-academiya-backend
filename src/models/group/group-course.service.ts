import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../core/config/prisma.service';

@Injectable()
export class GroupCourseService {
  constructor(private prisma: PrismaService) {}

  async assignCourse(groupId: number, courseId: number) {
    const include = { group: true, course: true } as const;
    const existing = await this.prisma.groupCourse.findUnique({
      where: { groupId_courseId: { groupId, courseId } },
    });

    if (existing?.isActive) {
      throw new ConflictException('Bu course allaqachon groupga biriktirilgan');
    }

    if (existing) {
      return this.prisma.groupCourse.update({
        where: { id: existing.id },
        data: { isActive: true, assignedAt: new Date() },
        include,
      });
    }

    try {
      return await this.prisma.groupCourse.create({
        data: { groupId, courseId },
        include,
      });
    } catch (error) {
      if (this.isUniqueGroupCourseConstraintError(error)) {
        const duplicate = await this.prisma.groupCourse.findUnique({
          where: { groupId_courseId: { groupId, courseId } },
        });

        if (duplicate?.isActive) {
          throw new ConflictException(
            'Bu course allaqachon groupga biriktirilgan',
          );
        }

        if (duplicate) {
          return this.prisma.groupCourse.update({
            where: { id: duplicate.id },
            data: { isActive: true, assignedAt: new Date() },
            include,
          });
        }
      }

      throw error;
    }
  }

  async removeCourse(id: number) {
    const existing = await this.prisma.groupCourse.findUnique({
      where: { id },
    });
    if (!existing || !existing.isActive) {
      throw new NotFoundException(
        "GroupCourse topilmadi yoki allaqachon o'chirilgan",
      );
    }
    return this.prisma.groupCourse.update({
      where: { id },
      data: { isActive: false },
      include: { group: true, course: true },
    });
  }

  async findByGroup(groupId: number) {
    return this.prisma.groupCourse.findMany({
      where: { groupId, isActive: true },
      include: { course: true },
      orderBy: { id: 'desc' },
    });
  }

  async findByCourse(courseId: number) {
    return this.prisma.groupCourse.findMany({
      where: { courseId, isActive: true },
      include: { group: true },
      orderBy: { id: 'desc' },
    });
  }

  private isUniqueGroupCourseConstraintError(error: unknown) {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }
}
