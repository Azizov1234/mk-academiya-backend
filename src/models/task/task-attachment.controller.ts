import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { TaskAttachmentService } from './task-attachment.service';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/role.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/core/enums';
import { CreateTaskAttachmentDto } from './dto';

@ApiTags('task-attachments')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('task-attachments')
export class TaskAttachmentController {
  constructor(private readonly service: TaskAttachmentService) {}

  @Post('task/:taskId')
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Add attachment to a task' })
  create(
    @Param('taskId', ParseIntPipe) taskId: number,
    @Body() dto: CreateTaskAttachmentDto,
    @Req() req: any,
  ) {
    return this.service.create(taskId, dto, req['user']);
  }

  @Get('task/:taskId')
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT)
  @ApiOperation({ summary: 'Get all attachments for a task' })
  findAll(@Param('taskId', ParseIntPipe) taskId: number, @Req() req: any) {
    return this.service.findByTask(taskId, req['user']);
  }

  @Get(':id')
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT)
  @ApiOperation({ summary: 'Get attachment by ID' })
  findOne(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.service.findOne(id, req['user']);
  }

  @Delete(':id')
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Delete task attachment' })
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.service.remove(id, req['user']);
  }
}
