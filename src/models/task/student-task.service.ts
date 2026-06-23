import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../core/config/prisma.service';
import { GradeTaskDto, SubmitTaskDto } from './dto';
import { UserRole } from 'src/core/enums';
import { CurrentUser, TaskService } from './task.service';

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

@Injectable()
export class StudentTaskService {
  constructor(
    private prisma: PrismaService,
    private taskService: TaskService,
  ) {}

  async submitTask(
    studentId: number,
    taskId: number,
    dto: SubmitTaskDto,
    currentUser: CurrentUser,
  ) {
    await this.ensureStudentExists(+studentId);
    await this.ensureTaskExists(+taskId);
    await this.taskService.assertCanReadTask(+taskId, currentUser);

    if (isStudent(currentUser) && currentUser.id !== +studentId) {
      throw new ForbiddenException('You can only submit your own tasks');
    }

    if (isTeacher(currentUser)) {
      const teacherCanAccess = await this.canTeacherAccessStudentForTask(
        currentUser.id,
        +studentId,
        +taskId,
      );
      if (!teacherCanAccess) {
        throw new ForbiddenException(
          'You can only submit tasks for your own students',
        );
      }
    }

    const submissionContent = this.resolveSubmissionContent(dto);
    const existingStudentTask = await this.findStudentTask(+studentId, +taskId);

    if (existingStudentTask && !existingStudentTask.isActive) {
      throw new BadRequestException('Student task is inactive');
    }

    if (existingStudentTask && existingStudentTask.status === 'GRADED') {
      throw new BadRequestException(
        'This task is already graded and cannot be resubmitted',
      );
    }

    const studentTask = existingStudentTask
      ? await (this.prisma.studentTask as any).update({
          where: {
            studentId_taskId: {
              studentId: +studentId,
              taskId: +taskId,
            },
          },
          data: {
            status: 'SUBMITTED',
            submittedAt: new Date(),
            submissionContent,
            score: null,
            teacherFeedback: null,
            gradedAt: null,
            gradedById: null,
          },
          include: this.studentTaskInclude(),
        })
      : await (this.prisma.studentTask as any).create({
          data: {
            studentId: +studentId,
            taskId: +taskId,
            status: 'SUBMITTED',
            submittedAt: new Date(),
            submissionContent,
          },
          include: this.studentTaskInclude(),
        });

    return {
      status: 201,
      success: true,
      message: 'Task submitted successfully',
      data: this.normalizeStudentTask(studentTask),
    };
  }

  async gradeTask(
    studentId: number,
    taskId: number,
    dto: GradeTaskDto,
    currentUser: CurrentUser,
  ) {
    if (!isAdminRole(currentUser) && !isTeacher(currentUser)) {
      throw new ForbiddenException('Only teachers and admins can grade tasks');
    }

    await this.ensureStudentExists(+studentId);
    await this.ensureTaskExists(+taskId);
    await this.taskService.assertCanManageTask(+taskId, currentUser);

    if (isTeacher(currentUser)) {
      const teacherCanAccess = await this.canTeacherAccessStudentForTask(
        currentUser.id,
        +studentId,
        +taskId,
      );
      if (!teacherCanAccess) {
        throw new ForbiddenException(
          'You can only grade tasks for your own students',
        );
      }
    }

    const existingStudentTask = await this.findStudentTask(+studentId, +taskId);
    if (!existingStudentTask) {
      throw new NotFoundException('Student task not found');
    }

    if (!existingStudentTask.isActive) {
      throw new BadRequestException('Student task is inactive');
    }

    if (!existingStudentTask.submissionContent) {
      throw new BadRequestException('Task has not been submitted yet');
    }

    const maxScore = Number(existingStudentTask.task?.maxScore || 100);
    if (dto.score > maxScore) {
      throw new BadRequestException(
        `Score cannot be greater than task maxScore (${maxScore})`,
      );
    }

    const studentTask = await (this.prisma.studentTask as any).update({
      where: {
        studentId_taskId: {
          studentId: +studentId,
          taskId: +taskId,
        },
      },
      data: {
        score: dto.score,
        teacherFeedback: dto.teacherFeedback?.trim() || null,
        status: 'GRADED',
        gradedAt: new Date(),
        gradedById: currentUser.id,
      },
      include: this.studentTaskInclude(),
    });

    return {
      status: 200,
      success: true,
      message: 'Task graded successfully',
      data: this.normalizeStudentTask(studentTask),
    };
  }

  async findByStudent(studentId: number, currentUser: CurrentUser) {
    await this.ensureStudentExists(+studentId);
    await this.assertCanViewStudentTasks(+studentId, currentUser);

    const tasks = await (this.prisma.studentTask as any).findMany({
      where: {
        studentId: +studentId,
        isActive: true,
      },
      include: this.studentTaskInclude(),
      orderBy: [{ submittedAt: 'desc' }, { id: 'desc' }],
    });

    return {
      data: tasks.map((task: any) => this.normalizeStudentTask(task)),
    };
  }

  async findForCurrentUser(currentUser: CurrentUser) {
    if (isStudent(currentUser)) {
      return this.findByStudent(currentUser.id, currentUser);
    }

    const where: any = { isActive: true };

    if (isTeacher(currentUser)) {
      where.task = {
        OR: [
          { createdById: currentUser.id },
          {
            assignments: {
              some: {
                isActive: true,
                group: {
                  teacherId: currentUser.id,
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
                    teacherId: currentUser.id,
                    isActive: true,
                  },
                },
              },
            },
          },
        ],
      };
    }

    const tasks = await (this.prisma.studentTask as any).findMany({
      where,
      include: this.studentTaskInclude(),
      orderBy: [{ submittedAt: 'desc' }, { id: 'desc' }],
      take: 100,
    });

    return {
      data: tasks.map((task: any) => this.normalizeStudentTask(task)),
    };
  }

  private resolveSubmissionContent(dto: SubmitTaskDto) {
    const content = dto.submissionContent ?? dto.submissionUrl;
    if (!content || !String(content).trim()) {
      throw new BadRequestException(
        'submissionContent (or submissionUrl) is required',
      );
    }

    return String(content).trim();
  }

  private studentTaskInclude() {
    return {
      task: {
        select: {
          id: true,
          title: true,
          description: true,
          type: true,
          instructions: true,
          maxScore: true,
          isActive: true,
          courseId: true,
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
        },
      },
      student: {
        select: {
          id: true,
          fullName: true,
          role: true,
        },
      },
      gradedBy: {
        select: {
          id: true,
          fullName: true,
          role: true,
        },
      },
    };
  }

  private async findStudentTask(studentId: number, taskId: number) {
    return (this.prisma.studentTask as any).findUnique({
      where: {
        studentId_taskId: {
          studentId: +studentId,
          taskId: +taskId,
        },
      },
      include: this.studentTaskInclude(),
    });
  }

  private async ensureStudentExists(studentId: number) {
    const student = await (this.prisma.user as any).findFirst({
      where: {
        id: +studentId,
        role: UserRole.STUDENT,
        isActive: true,
      },
      select: { id: true },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }
  }

  private async ensureTaskExists(taskId: number) {
    const task = await (this.prisma.task as any).findUnique({
      where: { id: +taskId },
      select: { id: true, isActive: true },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (!task.isActive) {
      throw new BadRequestException('Task is inactive');
    }
  }

  private async assertCanViewStudentTasks(
    studentId: number,
    currentUser: CurrentUser,
  ) {
    if (isAdminRole(currentUser)) {
      return;
    }

    if (isStudent(currentUser) && currentUser.id === +studentId) {
      return;
    }

    if (isTeacher(currentUser)) {
      const hasMembership = await (this.prisma.groupMember as any).findFirst({
        where: {
          studentId: +studentId,
          isActive: true,
          status: 'ACTIVE',
          group: {
            teacherId: currentUser.id,
            isActive: true,
          },
        },
        select: { id: true },
      });

      if (hasMembership) {
        return;
      }

      const hasTeacherTasksForStudent = await (this.prisma.studentTask as any).findFirst({
        where: {
          studentId: +studentId,
          isActive: true,
          task: {
            OR: [
              { createdById: currentUser.id },
              {
                assignments: {
                  some: {
                    isActive: true,
                    group: {
                      teacherId: currentUser.id,
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
                        teacherId: currentUser.id,
                        isActive: true,
                      },
                    },
                  },
                },
              },
            ],
          },
        },
        select: { id: true },
      });

      if (hasTeacherTasksForStudent) {
        return;
      }
    }

    throw new ForbiddenException(
      'You do not have permission to view tasks for this student',
    );
  }

  private async canTeacherAccessStudentForTask(
    teacherId: number,
    studentId: number,
    taskId: number,
  ) {
    const task = await (this.prisma.task as any).findFirst({
      where: {
        id: +taskId,
        isActive: true,
        OR: [
          { createdById: +teacherId },
          {
            assignments: {
              some: {
                isActive: true,
                group: {
                  teacherId: +teacherId,
                  isActive: true,
                  members: {
                    some: {
                      studentId: +studentId,
                      isActive: true,
                      status: 'ACTIVE',
                    },
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
                    teacherId: +teacherId,
                    isActive: true,
                    members: {
                      some: {
                        studentId: +studentId,
                        isActive: true,
                        status: 'ACTIVE',
                      },
                    },
                  },
                },
              },
            },
          },
        ],
      },
      select: { id: true },
    });

    return Boolean(task);
  }

  private normalizeStudentTask(studentTask: any) {
    return {
      ...studentTask,
      task: studentTask.task
        ? {
            ...studentTask.task,
            xpReward: studentTask.task.maxScore,
          }
        : null,
    };
  }
}
