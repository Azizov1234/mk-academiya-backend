import {
  Controller,
  Post,
  Delete,
  Get,
  Param,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { GroupCourseService } from './group-course.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/role.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/core/enums';

@ApiTags('group-courses')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('group-courses')
export class GroupCourseController {
  constructor(private readonly service: GroupCourseService) {}

  @Post(':groupId/course/:courseId')
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Assign a course to a group' })
  assign(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Param('courseId', ParseIntPipe) courseId: number,
  ) {
    return this.service.assignCourse(groupId, courseId);
  }

  @Delete(':id')
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Remove a course from a group (soft delete by record id)',
  })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.removeCourse(id);
  }

  @Get('by-course/:courseId')
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Get all groups for a course' })
  findByCourse(@Param('courseId', ParseIntPipe) courseId: number) {
    return this.service.findByCourse(courseId);
  }

  @Get(':groupId')
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Get all courses for a group' })
  findAll(@Param('groupId', ParseIntPipe) groupId: number) {
    return this.service.findByGroup(groupId);
  }
}
