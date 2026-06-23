import { Module } from '@nestjs/common';
import { TaskService } from './task.service';
import { TaskController } from './task.controller';
import { StudentTaskService } from './student-task.service';
import { StudentTaskController } from './student-task.controller';
import { TaskAttachmentService } from './task-attachment.service';
import { TaskAttachmentController } from './task-attachment.controller';
import { PrismaModule } from 'src/core/config/prisma.module';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [PrismaModule,JwtModule],
  controllers: [
    TaskController,
    StudentTaskController,
    TaskAttachmentController,
  ],
  providers: [
    TaskService,
    StudentTaskService,
    TaskAttachmentService,
  ],
  exports: [TaskService, StudentTaskService, TaskAttachmentService],
})
export class TaskModule {}
