import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../core/config/prisma.service';
import { CreateTaskDto, QueryTaskDto, UpdateTaskDto } from './dto';
import { UserRole } from 'src/core/enums';

export type CurrentUser = {
  id: number;
  role?: string | null;
  fullName?: string | null;
};

function roleOf(user: CurrentUser): string {
  return String(user.role || '').toUpperCase();
}

function isAdminRole(user: CurrentUser): boolean {
  const role = roleOf(user);
  return role === UserRole.SUPERADMIN || role === UserRole.ADMIN;
}

function isTeacher(user: CurrentUser): boolean {
  return roleOf(user) === UserRole.TEACHER;
}

function isStudent(user: CurrentUser): boolean {
  return roleOf(user) === UserRole.STUDENT;
}

function parseBoolean(value?: string): boolean | undefined {
  if (value === undefined) return undefined;

  const normalized = String(value).trim().toLowerCase();
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;

  throw new BadRequestException('Boolean query values must be true or false');
}

@Injectable()
export class TaskService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateTaskDto, currentUser: CurrentUser) {
    await this.ensureCourseIsUsable(dto.courseId, currentUser);

    const task = await (this.prisma.task as any).create({
      data: this.toTaskWriteData(dto, currentUser),
      include: this.taskInclude(),
    });

    return {
      status: 201,
      success: true,
      message: 'Task successfully created',
      data: this.normalizeTask(task),
    };
  }

  async findAll(query: QueryTaskDto, currentUser: CurrentUser) {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const skip = (page - 1) * limit;
    const where = this.buildScopedWhere(query, currentUser);

    const [tasks, total] = await Promise.all([
      (this.prisma.task as any).findMany({
        where,
        skip,
        take: limit,
        include: this.taskInclude(),
        orderBy: { id: 'desc' },
      }),
      (this.prisma.task as any).count({ where }),
    ]);

    return {
      data: tasks.map((task: any) => this.normalizeTask(task)),
      meta: {
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        pageSize: limit,
      },
    };
  }

  async findOne(id: number, currentUser: CurrentUser) {
    const task = await (this.prisma.task as any).findUnique({
      where: { id: +id },
      include: this.taskInclude(),
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    await this.assertCanReadTask(+id, currentUser);

    return {
      status: 200,
      success: true,
      data: this.normalizeTask(task),
    };
  }

  async update(id: number, dto: UpdateTaskDto, currentUser: CurrentUser) {
    await this.assertCanManageTask(+id, currentUser);

    if ('courseId' in dto) {
      await this.ensureCourseIsUsable(dto.courseId, currentUser);
    }

    const data = this.toTaskWriteData(dto, currentUser, true);
    if (!Object.keys(data).length) {
      throw new BadRequestException('No valid fields were provided for update');
    }

    const task = await (this.prisma.task as any).update({
      where: { id: +id },
      data,
      include: this.taskInclude(),
    });

    return {
      status: 200,
      success: true,
      message: 'Task successfully updated',
      data: this.normalizeTask(task),
    };
  }

  async remove(id: number, currentUser: CurrentUser) {
    await this.assertCanManageTask(+id, currentUser);

    const task = await (this.prisma.task as any).findUnique({
      where: { id: +id },
      select: { id: true, isActive: true },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (!task.isActive) {
      throw new BadRequestException('Task is already deleted');
    }

    await (this.prisma.task as any).update({
      where: { id: +id },
      data: { isActive: false },
      select: { id: true },
    });

    return {
      status: 200,
      success: true,
      message: 'Task successfully deleted',
    };
  }

  async assertCanManageTask(taskId: number, currentUser: CurrentUser) {
    const task = await (this.prisma.task as any).findUnique({
      where: { id: +taskId },
      select: { id: true },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (isAdminRole(currentUser)) {
      return;
    }

    if (
      isTeacher(currentUser) &&
      (await this.teacherOwnsTask(+taskId, currentUser.id))
    ) {
      return;
    }

    throw new ForbiddenException(
      'You do not have permission to manage this task',
    );
  }

  async assertCanReadTask(taskId: number, currentUser: CurrentUser) {
    if (isAdminRole(currentUser)) {
      return;
    }

    if (
      isTeacher(currentUser) &&
      (await this.teacherOwnsTask(+taskId, currentUser.id))
    ) {
      return;
    }

    if (
      isStudent(currentUser) &&
      (await this.studentCanAccessTask(+taskId, currentUser.id))
    ) {
      return;
    }

    throw new ForbiddenException(
      'You do not have permission to view this task',
    );
  }

  private taskInclude() {
    return {
      course: {
        select: {
          id: true,
          title: true,
          level: true,
        },
      },
      createdBy: {
        select: {
          id: true,
          fullName: true,
          role: true,
        },
      },
      _count: {
        select: {
          assignments: true,
          studentTasks: true,
          attachments: true,
        },
      },
    };
  }

  private buildScopedWhere(query: QueryTaskDto, currentUser: CurrentUser) {
    const filters: any[] = [];
    const requestedActive = parseBoolean(query.isActive);

    if (query.search?.trim()) {
      const search = query.search.trim();
      filters.push({
        OR: [
          { title: { contains: search } },
          { description: { contains: search } },
          { instructions: { contains: search } },
        ],
      });
    }

    if (query.type) {
      filters.push({ type: query.type });
    }

    if (query.courseId) {
      filters.push({ courseId: +query.courseId });
    }

    if (query.createdById) {
      filters.push({ createdById: +query.createdById });
    }

    if (isAdminRole(currentUser)) {
      filters.push({ isActive: requestedActive ?? true });
      return filters.length ? { AND: filters } : {};
    }

    filters.push({ isActive: true });

    if (isTeacher(currentUser)) {
      filters.push({ OR: this.teacherTaskScope(currentUser.id) });
      return { AND: filters };
    }

    filters.push({ OR: this.studentTaskScope(currentUser.id) });

    return { AND: filters };
  }

  private teacherTaskScope(teacherId: number) {
    return [
      { createdById: teacherId },
      {
        assignments: {
          some: {
            isActive: true,
            group: {
              teacherId,
              isActive: true,
            },
          },
        },
      },
      {
        course: {
          groups: {
            some: {
              isActive: true,
              group: {
                teacherId,
                isActive: true,
              },
            },
          },
        },
      },
    ];
  }

  private studentTaskScope(studentId: number) {
    const activeMembership = {
      studentId,
      isActive: true,
      status: 'ACTIVE',
    };

    return [
      {
        assignments: {
          some: {
            isActive: true,
            group: {
              isActive: true,
              members: {
                some: activeMembership,
              },
            },
          },
        },
      },
      {
        course: {
          groups: {
            some: {
              isActive: true,
              group: {
                isActive: true,
                members: {
                  some: activeMembership,
                },
              },
            },
          },
        },
      },
      {
        courseId: null,
        assignments: {
          none: {
            isActive: true,
          },
        },
      },
    ];
  }

  private async teacherOwnsTask(taskId: number, teacherId: number) {
    const task = await (this.prisma.task as any).findFirst({
      where: {
        id: +taskId,
        OR: this.teacherTaskScope(teacherId),
      },
      select: { id: true },
    });

    return Boolean(task);
  }

  private async studentCanAccessTask(taskId: number, studentId: number) {
    const task = await (this.prisma.task as any).findFirst({
      where: {
        id: +taskId,
        isActive: true,
        OR: this.studentTaskScope(studentId),
      },
      select: { id: true },
    });

    return Boolean(task);
  }

  private async ensureCourseIsUsable(
    courseId: number | null | undefined,
    currentUser: CurrentUser,
  ) {
    if (courseId === undefined || courseId === null) {
      return;
    }

    const course = await (this.prisma.course as any).findFirst({
      where: {
        id: +courseId,
        isActive: true,
      },
      select: { id: true },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    if (!isTeacher(currentUser)) {
      return;
    }

    const teacherCourse = await (this.prisma.groupCourse as any).findFirst({
      where: {
        courseId: +courseId,
        isActive: true,
        group: {
          teacherId: currentUser.id,
          isActive: true,
        },
      },
      select: { id: true },
    });

    if (!teacherCourse) {
      throw new ForbiddenException(
        'You can only attach tasks to your own courses',
      );
    }
  }

  private toTaskWriteData(
    dto: Partial<CreateTaskDto>,
    currentUser: CurrentUser,
    isUpdate = false,
  ) {
    const data: any = {};

    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.instructions !== undefined) data.instructions = dto.instructions;
    if (dto.courseId !== undefined) {
      data.courseId = dto.courseId === null ? null : +dto.courseId;
    }
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    const resolvedMaxScore = this.resolveMaxScore(dto);
    if (resolvedMaxScore !== undefined) {
      data.maxScore = resolvedMaxScore;
    }

    if (!isUpdate) {
      data.createdById = currentUser.id;
    }

    return data;
  }

  private resolveMaxScore(dto: Partial<CreateTaskDto>) {
    const hasMaxScore = dto.maxScore !== undefined;
    const hasXpReward = dto.xpReward !== undefined;

    if (!hasMaxScore && !hasXpReward) {
      return undefined;
    }

    if (
      hasMaxScore &&
      hasXpReward &&
      Number(dto.maxScore) !== Number(dto.xpReward)
    ) {
      throw new BadRequestException(
        'maxScore and xpReward must match when both are provided',
      );
    }

    const score = Number(hasMaxScore ? dto.maxScore : dto.xpReward);
    if (!Number.isInteger(score) || score < 0) {
      throw new BadRequestException('maxScore must be a non-negative integer');
    }

    return score;
  }

  private normalizeTask(task: any) {
    return {
      ...task,
      xpReward: task.maxScore,
    };
  }
}
