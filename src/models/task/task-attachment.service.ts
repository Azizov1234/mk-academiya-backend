import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/config/prisma.service';
import { CurrentUser, TaskService } from './task.service';
import { CreateTaskAttachmentDto } from './dto';
import { UserRole } from 'src/core/enums';

function roleOf(user: CurrentUser): string {
  return String(user.role || '').toUpperCase();
}

function isAdminRole(user: CurrentUser): boolean {
  const role = roleOf(user);
  return role === UserRole.SUPERADMIN || role === UserRole.ADMIN;
}

@Injectable()
export class TaskAttachmentService {
  constructor(
    private prisma: PrismaService,
    private taskService: TaskService,
  ) {}

  async create(
    taskId: number,
    dto: CreateTaskAttachmentDto,
    currentUser: CurrentUser,
  ) {
    await this.taskService.assertCanManageTask(+taskId, currentUser);

    const duplicate = await (this.prisma.taskAttachment as any).findFirst({
      where: {
        taskId: +taskId,
        fileUrl: dto.fileUrl.trim(),
        isActive: true,
      },
      select: { id: true },
    });

    if (duplicate) {
      throw new BadRequestException(
        'This attachment already exists for the selected task',
      );
    }

    const created = await (this.prisma.taskAttachment as any).create({
      data: {
        taskId: +taskId,
        fileUrl: dto.fileUrl.trim(),
        fileType: dto.fileType.trim(),
        uploadedBy: this.resolveUploader(dto.uploadedBy, currentUser),
      },
      include: this.attachmentInclude(),
    });

    return {
      status: 201,
      success: true,
      message: 'Attachment added successfully',
      data: created,
    };
  }

  async findByTask(taskId: number, currentUser: CurrentUser) {
    await this.taskService.assertCanReadTask(+taskId, currentUser);

    const attachments = await (this.prisma.taskAttachment as any).findMany({
      where: {
        taskId: +taskId,
        isActive: true,
      },
      include: this.attachmentInclude(),
      orderBy: { id: 'desc' },
    });

    return {
      data: attachments,
    };
  }

  async findOne(id: number, currentUser: CurrentUser) {
    const attachment = await (this.prisma.taskAttachment as any).findUnique({
      where: { id: +id },
      include: this.attachmentInclude(),
    });

    if (!attachment) {
      throw new NotFoundException('Task attachment not found');
    }

    if (!attachment.isActive) {
      throw new NotFoundException('Task attachment not found');
    }

    await this.taskService.assertCanReadTask(+attachment.taskId, currentUser);

    return {
      status: 200,
      success: true,
      data: attachment,
    };
  }

  async remove(id: number, currentUser: CurrentUser) {
    const attachment = await (this.prisma.taskAttachment as any).findUnique({
      where: { id: +id },
      include: {
        task: {
          select: {
            id: true,
            createdById: true,
          },
        },
      },
    });

    if (!attachment) {
      throw new NotFoundException('Task attachment not found');
    }

    if (!attachment.isActive) {
      throw new BadRequestException('Task attachment is already deleted');
    }

    await this.assertCanManageAttachment(attachment, currentUser);

    await (this.prisma.taskAttachment as any).update({
      where: { id: +id },
      data: { isActive: false },
      select: { id: true },
    });

    return {
      status: 200,
      success: true,
      message: 'Attachment deleted successfully',
    };
  }

  private attachmentInclude() {
    return {
      task: {
        select: {
          id: true,
          title: true,
          type: true,
          isActive: true,
          createdById: true,
          courseId: true,
        },
      },
    };
  }

  private async assertCanManageAttachment(attachment: any, currentUser: CurrentUser) {
    if (isAdminRole(currentUser)) {
      return;
    }

    await this.taskService.assertCanManageTask(+attachment.taskId, currentUser);
  }

  private resolveUploader(
    uploadedBy: string | undefined,
    currentUser: CurrentUser,
  ) {
    const fromPayload = uploadedBy?.trim();
    if (fromPayload) {
      return fromPayload;
    }

    const fullName = String(currentUser.fullName || '').trim();
    if (fullName) {
      return fullName;
    }

    return `User:${currentUser.id}`;
  }
}
