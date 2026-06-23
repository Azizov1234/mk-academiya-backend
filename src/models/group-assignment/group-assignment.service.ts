import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../core/config/prisma.service';
import { CreateGroupAssignmentDto, UpdateGroupAssignmentDto } from './dto';
import { UserRole } from 'src/core/enums';
import { NotificationService } from '../notification/notification.service';

type CurrentUser = {
  id: number;
  role: string;
};

type AssignmentWithRelations = {
  id: number;
  groupId: number;
  studentId: number | null;
  taskId: number | null;
  testId: number | null;
  dueDate: Date | null;
  isRequired: boolean;
  isActive: boolean;
  group: {
    id: number;
    name: string;
    teacherId: number;
    isActive?: boolean;
  };
  task: {
    id: number;
    title: string;
  } | null;
  test: {
    id: number;
    title: string;
  } | null;
  student: {
    id: number;
    fullName: string;
    phone: string | null;
  } | null;
};

@Injectable()
export class GroupAssignmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  private isAdminOrSuperAdmin(role: string): boolean {
    return role === UserRole.SUPERADMIN || role === UserRole.ADMIN;
  }

  private async getActiveGroup(groupId: number) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      throw new NotFoundException('Guruh topilmadi');
    }

    if (!group.isActive) {
      throw new BadRequestException('Bu guruh faol emas');
    }

    return group;
  }

  private checkTeacherGroupOwnership(teacherId: number, currentUserId: number) {
    if (teacherId !== currentUserId) {
      throw new ForbiddenException(
        "Siz faqat o'z guruhingizga tegishli vazifalarni boshqara olasiz",
      );
    }
  }

  private async checkStudentGroupMembership(
    groupId: number,
    studentId: number,
  ) {
    const membership = await this.prisma.groupMember.findFirst({
      where: {
        groupId,
        studentId,
        isActive: true,
        status: 'ACTIVE',
        student: {
          isActive: true,
          role: UserRole.STUDENT,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException(
        "Bu vazifa siz a'zo bo'lgan guruhga tegishli emas",
      );
    }
  }

  private async checkStudentCanReceiveAssignment(
    groupId: number,
    studentId: number,
  ) {
    const membership = await this.prisma.groupMember.findFirst({
      where: {
        groupId,
        studentId,
        isActive: true,
        status: 'ACTIVE',
        student: {
          isActive: true,
          role: UserRole.STUDENT,
        },
      },
      select: {
        studentId: true,
      },
    });

    if (!membership) {
      throw new BadRequestException("Tanlangan o'quvchi bu guruhda faol emas");
    }
  }

  private async getActiveTask(taskId: number) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });

    if (!task) {
      throw new NotFoundException('Vazifa (task) topilmadi');
    }

    if (!task.isActive) {
      throw new BadRequestException('Bu vazifa (task) faol emas');
    }

    return task;
  }

  private async getActiveTest(testId: number) {
    const test = await this.prisma.test.findUnique({ where: { id: testId } });

    if (!test) {
      throw new NotFoundException('Test topilmadi');
    }

    if (!test.isActive) {
      throw new BadRequestException('Bu test faol emas');
    }

    return test;
  }

  private async publishTestIfNeeded(testId: number, currentUser: CurrentUser) {
    const test = await this.getActiveTest(testId);

    if (
      currentUser.role === UserRole.TEACHER &&
      !test.isPublished &&
      test.createdById !== currentUser.id
    ) {
      throw new ForbiddenException(
        "Siz faqat tayyor testni yoki o'zingiz yaratgan draft testni e'lon qila olasiz",
      );
    }

    if (!test.isPublished) {
      await this.prisma.test.update({
        where: { id: testId },
        data: { isPublished: true },
        select: { id: true },
      });
    }

    return test;
  }

  private assignmentInclude() {
    return {
      group: {
        select: {
          id: true,
          name: true,
          teacherId: true,
          isActive: true,
        },
      },
      task: {
        select: {
          id: true,
          title: true,
        },
      },
      test: {
        select: {
          id: true,
          title: true,
        },
      },
      student: {
        select: {
          id: true,
          fullName: true,
          phone: true,
        },
      },
    };
  }

  private formatDueDate(date?: Date | null) {
    if (!date) {
      return null;
    }

    return new Intl.DateTimeFormat('uz-UZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  private buildNotificationPayload(
    event: 'created' | 'updated' | 'removed',
    assignment: AssignmentWithRelations,
  ) {
    const dueDateLabel = this.formatDueDate(assignment.dueDate);
    const dueDateText = dueDateLabel ? ` Muddat: ${dueDateLabel}.` : '';

    if (assignment.test) {
      const titleByEvent = {
        created: `Yangi imtihon: ${assignment.test.title}`,
        updated: `Imtihon yangilandi: ${assignment.test.title}`,
        removed: `Imtihon bekor qilindi: ${assignment.test.title}`,
      } as const;

      const bodyByEvent = {
        created: `"${assignment.group.name}" guruhi uchun "${assignment.test.title}" imtihoni biriktirildi.${dueDateText}`,
        updated: `"${assignment.test.title}" imtihoni ma'lumotlari yangilandi.${dueDateText}`,
        removed: `"${assignment.test.title}" imtihoni bekor qilindi.`,
      } as const;

      return {
        type:
          event === 'created'
            ? 'EXAM_ASSIGNED'
            : event === 'updated'
              ? 'EXAM_UPDATED'
              : 'EXAM_CANCELLED',
        title: titleByEvent[event],
        body: bodyByEvent[event],
        data: {
          route: `/tests/${assignment.test.id}`,
          groupId: assignment.groupId,
          studentId: assignment.studentId,
          assignmentId: assignment.id,
          entityType: 'test',
          entityId: assignment.test.id,
          dueDate: assignment.dueDate?.toISOString() ?? null,
        },
      };
    }

    const taskTitle = assignment.task?.title || 'Unit vazifasi';
    const titleByEvent = {
      created: `Yangi unit vazifasi: ${taskTitle}`,
      updated: `Unit vazifasi yangilandi: ${taskTitle}`,
      removed: `Unit vazifasi bekor qilindi: ${taskTitle}`,
    } as const;

    const bodyByEvent = {
      created: `"${assignment.group.name}" guruhi uchun "${taskTitle}" unit vazifasi biriktirildi.${dueDateText}`,
      updated: `"${taskTitle}" unit vazifasi ma'lumotlari yangilandi.${dueDateText}`,
      removed: `"${taskTitle}" unit vazifasi bekor qilindi.`,
    } as const;

    return {
      type:
        event === 'created'
          ? 'UNIT_ASSIGNED'
          : event === 'updated'
            ? 'UNIT_UPDATED'
            : 'UNIT_CANCELLED',
      title: titleByEvent[event],
      body: bodyByEvent[event],
      data: {
        route: `/tasks?assignmentId=${assignment.id}`,
        groupId: assignment.groupId,
        studentId: assignment.studentId,
        assignmentId: assignment.id,
        entityType: 'task',
        entityId: assignment.task?.id ?? assignment.taskId,
        dueDate: assignment.dueDate?.toISOString() ?? null,
      },
    };
  }

  private async getActiveStudentIds(groupId: number) {
    const members = await this.prisma.groupMember.findMany({
      where: {
        groupId,
        isActive: true,
        status: 'ACTIVE',
        student: {
          isActive: true,
          role: UserRole.STUDENT,
        },
      },
      select: {
        studentId: true,
      },
    });

    return Array.from(new Set(members.map((member) => member.studentId)));
  }

  private async notifyStudentsAboutAssignment(
    event: 'created' | 'updated' | 'removed',
    assignment: AssignmentWithRelations,
  ) {
    const studentIds = assignment.studentId
      ? [assignment.studentId]
      : await this.getActiveStudentIds(assignment.groupId);

    if (!studentIds.length) {
      return;
    }

    const payload = this.buildNotificationPayload(event, assignment);

    await this.notificationService.createForUsers(studentIds, payload);
  }

  async create(dto: CreateGroupAssignmentDto, currentUser: CurrentUser) {
    if (!dto.taskId && !dto.testId) {
      throw new BadRequestException(
        'Kamida bitta vazifa (taskId) yoki test (testId) kiritilishi shart',
      );
    }

    if (dto.taskId && dto.testId) {
      throw new BadRequestException(
        'Bir vaqtda faqat bitta: taskId yoki testId kiritilishi mumkin',
      );
    }

    const group = await this.getActiveGroup(dto.groupId);

    if (currentUser.role === UserRole.TEACHER) {
      this.checkTeacherGroupOwnership(group.teacherId, currentUser.id);
    }

    if (dto.taskId) {
      await this.getActiveTask(dto.taskId);
    }

    if (dto.testId) {
      await this.publishTestIfNeeded(dto.testId, currentUser);
    }

    if (
      dto.studentId &&
      currentUser.role !== UserRole.SUPERADMIN &&
      currentUser.role !== UserRole.ADMIN
    ) {
      await this.checkStudentCanReceiveAssignment(dto.groupId, dto.studentId);
    }

    const createdAssignment = (await this.prisma.groupAssignment.create({
      data: {
        groupId: dto.groupId,
        studentId: dto.studentId ?? null,
        taskId: dto.taskId ?? null,
        testId: dto.testId ?? null,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        isRequired: dto.isRequired ?? true,
      },
      include: this.assignmentInclude(),
    })) as AssignmentWithRelations;

    await this.notifyStudentsAboutAssignment('created', createdAssignment);

    return {
      success: true,
      message: 'Guruh vazifasi muvaffaqiyatli yaratildi',
      data: createdAssignment,
    };
  }

  async findAll(groupName: string | undefined, currentUser: CurrentUser) {
    const where: any = { isActive: true };

    if (this.isAdminOrSuperAdmin(currentUser.role)) {
      if (groupName) {
        where.group = { name: { contains: groupName } };
      }
    } else if (currentUser.role === UserRole.TEACHER) {
      where.group = {
        teacherId: currentUser.id,
        isActive: true,
        ...(groupName ? { name: { contains: groupName } } : {}),
      };
    } else if (currentUser.role === UserRole.STUDENT) {
      where.group = {
        isActive: true,
        ...(groupName ? { name: { contains: groupName } } : {}),
        members: {
          some: { studentId: currentUser.id, isActive: true, status: 'ACTIVE' },
        },
      };
      where.OR = [{ studentId: null }, { studentId: currentUser.id }];
    }

    const assignments = await this.prisma.groupAssignment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        group: {
          select: { id: true, name: true, teacherId: true },
        },
        task: {
          select: {
            id: true,
            title: true,
            type: true,
            maxScore: true,
            isActive: true,
          },
        },
        test: {
          select: {
            id: true,
            title: true,
            type: true,
            passingScore: true,
            isActive: true,
          },
        },
        student: {
          select: {
            id: true,
            fullName: true,
            phone: true,
          },
        },
      },
    });

    return {
      success: true,
      total: assignments.length,
      data: assignments,
    };
  }

  async findOne(id: number, currentUser: CurrentUser) {
    const assignment = await this.prisma.groupAssignment.findUnique({
      where: { id },
      include: {
        group: {
          select: { id: true, name: true, teacherId: true, isActive: true },
        },
        task: {
          select: {
            id: true,
            title: true,
            description: true,
            type: true,
            instructions: true,
            maxScore: true,
            isActive: true,
          },
        },
        test: {
          select: {
            id: true,
            title: true,
            description: true,
            type: true,
            timeLimitMinutes: true,
            passingScore: true,
            shuffleQuestions: true,
            isActive: true,
          },
        },
        student: {
          select: {
            id: true,
            fullName: true,
            phone: true,
          },
        },
      },
    });

    if (!assignment) {
      throw new NotFoundException('Guruh vazifasi topilmadi');
    }

    if (!assignment.isActive) {
      throw new BadRequestException('Bu guruh vazifasi faol emas');
    }

    if (!assignment.group.isActive) {
      throw new BadRequestException('Bu guruh faol emas');
    }

    if (currentUser.role === UserRole.TEACHER) {
      this.checkTeacherGroupOwnership(
        assignment.group.teacherId,
        currentUser.id,
      );
    }

    if (currentUser.role === UserRole.STUDENT) {
      await this.checkStudentGroupMembership(
        assignment.groupId,
        currentUser.id,
      );

      if (assignment.studentId && assignment.studentId !== currentUser.id) {
        throw new ForbiddenException('Bu vazifa sizga biriktirilmagan');
      }
    }

    return {
      success: true,
      data: assignment,
    };
  }

  async update(
    id: number,
    dto: UpdateGroupAssignmentDto,
    currentUser: CurrentUser,
  ) {
    const assignment = await this.prisma.groupAssignment.findUnique({
      where: { id },
      include: {
        group: { select: { id: true, teacherId: true, isActive: true } },
      },
    });

    if (!assignment) {
      throw new NotFoundException('Guruh vazifasi topilmadi');
    }

    if (!assignment.isActive) {
      throw new BadRequestException('Bu guruh vazifasi faol emas');
    }

    if (currentUser.role === UserRole.TEACHER) {
      this.checkTeacherGroupOwnership(
        assignment.group.teacherId,
        currentUser.id,
      );
    }

    const nextTaskId =
      dto.taskId === undefined ? assignment.taskId : dto.taskId;
    const nextTestId =
      dto.testId === undefined ? assignment.testId : dto.testId;

    if (!nextTaskId && !nextTestId) {
      throw new BadRequestException(
        'Kamida bitta vazifa (taskId) yoki test (testId) kiritilishi shart',
      );
    }

    if (nextTaskId && nextTestId) {
      throw new BadRequestException(
        'Bir vaqtda faqat bitta: taskId yoki testId kiritilishi mumkin',
      );
    }

    const targetGroupId = dto.groupId ?? assignment.groupId;

    if (dto.groupId && dto.groupId !== assignment.groupId) {
      const newGroup = await this.getActiveGroup(dto.groupId);

      if (currentUser.role === UserRole.TEACHER) {
        this.checkTeacherGroupOwnership(newGroup.teacherId, currentUser.id);
      }
    }

    if (dto.taskId) {
      await this.getActiveTask(dto.taskId);
    }

    if (dto.testId) {
      await this.publishTestIfNeeded(dto.testId, currentUser);
    }

    if (dto.studentId) {
      await this.checkStudentCanReceiveAssignment(targetGroupId, dto.studentId);
    }

    const updateData: any = {};

    if (dto.groupId !== undefined) updateData.groupId = dto.groupId;
    if (dto.studentId !== undefined)
      updateData.studentId = dto.studentId ?? null;
    if (dto.taskId !== undefined) {
      updateData.taskId = dto.taskId;
      if (dto.taskId) updateData.testId = null;
    }
    if (dto.testId !== undefined) {
      updateData.testId = dto.testId;
      if (dto.testId) updateData.taskId = null;
    }
    if (dto.isRequired !== undefined) updateData.isRequired = dto.isRequired;
    if (dto.dueDate !== undefined) {
      updateData.dueDate = dto.dueDate ? new Date(dto.dueDate) : null;
    }

    const updatedAssignment = (await this.prisma.groupAssignment.update({
      where: { id },
      data: updateData,
      include: this.assignmentInclude(),
    })) as AssignmentWithRelations;

    await this.notifyStudentsAboutAssignment('updated', updatedAssignment);

    return {
      success: true,
      message: 'Guruh vazifasi muvaffaqiyatli tahrirlandi',
      data: updatedAssignment,
    };
  }

  async remove(id: number, currentUser: CurrentUser) {
    const assignment = (await this.prisma.groupAssignment.findUnique({
      where: { id },
      include: this.assignmentInclude(),
    })) as AssignmentWithRelations | null;

    if (!assignment) {
      throw new NotFoundException('Guruh vazifasi topilmadi');
    }

    if (!assignment.isActive) {
      throw new BadRequestException("Bu guruh vazifasi allaqachon o'chirilgan");
    }

    if (currentUser.role === UserRole.TEACHER) {
      this.checkTeacherGroupOwnership(
        assignment.group.teacherId,
        currentUser.id,
      );
    }

    await this.prisma.groupAssignment.update({
      where: { id },
      data: { isActive: false },
      select: { id: true },
    });

    await this.notifyStudentsAboutAssignment('removed', assignment);

    return {
      success: true,
      message: "Guruh vazifasi muvaffaqiyatli o'chirildi",
      data: {
        id,
      },
    };
  }
}
