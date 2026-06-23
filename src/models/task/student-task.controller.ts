import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { StudentTaskService } from './student-task.service';
import { GradeTaskDto, SubmitTaskDto } from './dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/role.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/core/enums';

@ApiTags('student-tasks')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('student-tasks')
export class StudentTaskController {
  constructor(private readonly service: StudentTaskService) {}

  @Post('submit/:studentId/:taskId')
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT)
  @ApiOperation({ summary: 'Submit a student task' })
  submit(
    @Param('studentId', ParseIntPipe) studentId: number,
    @Param('taskId', ParseIntPipe) taskId: number,
    @Body() dto: SubmitTaskDto,
    @Req() req: any,
  ) {
    return this.service.submitTask(studentId, taskId, dto, req['user']);
  }

  @Patch('grade/:studentId/:taskId')
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Grade a submitted student task' })
  grade(
    @Param('studentId', ParseIntPipe) studentId: number,
    @Param('taskId', ParseIntPipe) taskId: number,
    @Body() dto: GradeTaskDto,
    @Req() req: any,
  ) {
    return this.service.gradeTask(studentId, taskId, dto, req['user']);
  }

  @Get('student/:studentId')
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT)
  @ApiOperation({ summary: 'Get all tasks for a student' })
  findAll(@Param('studentId', ParseIntPipe) studentId: number, @Req() req: any) {
    return this.service.findByStudent(studentId, req['user']);
  }

  @Get('my')
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT)
  @ApiOperation({ summary: 'Get student tasks for current user scope' })
  findForCurrentUser(@Req() req: any) {
    return this.service.findForCurrentUser(req['user']);
  }
}
