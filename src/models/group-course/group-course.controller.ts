import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { GroupCourseService } from './group-course.service';
import { CreateGroupCourseDto } from './dto/create-group-course.dto';
import { UpdateGroupCourseDto } from './dto/update-group-course.dto';
import { QueryGroupCourseDto } from './dto/query-group-course.dto';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/role.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/core/enums';

@ApiTags('group-course')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('group-course')
export class GroupCourseController {
  constructor(private readonly groupCourseService: GroupCourseService) {}

  // POST /group-course
  @Post()
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: `${UserRole.SUPERADMIN} | ${UserRole.ADMIN}` })
  @ApiBody({
    type: CreateGroupCourseDto,
    examples: {
      example1: {
        summary: 'Amaliy misol',
        value: { groupId: 1, courseId: 2 },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'GroupCourse muvaffaqiyatli yaratildi' })
  @ApiResponse({ status: 404, description: 'Group yoki Course topilmadi' })
  @ApiResponse({ status: 409, description: 'Bu course allaqachon groupga biriktirilgan' })
  create(@Body() createGroupCourseDto: CreateGroupCourseDto) {
    return this.groupCourseService.create(createGroupCourseDto);
  }

  @Get()
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: `${UserRole.SUPERADMIN} | ${UserRole.ADMIN} | ${UserRole.TEACHER}` })
  @ApiResponse({
    status: 200,
    description: 'data[] va meta (total, page, limit, totalPages)',
    schema: {
      example: {
        data: [
          {
            id: 1,
            groupId: 1,
            courseId: 2,
            assignedAt: '2026-04-10T00:00:00.000Z',
            isActive: true,
            group: { id: 1, name: 'Group A' },
            course: { id: 2, title: 'English A1' },
          },
        ],
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      },
    },
  })
  findAll(@Query() query: QueryGroupCourseDto) {
    return this.groupCourseService.findAll(query);
  }

  // GET /group-course/:id
  @Get(':id')
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: `${UserRole.SUPERADMIN} | ${UserRole.ADMIN} | ${UserRole.TEACHER}` })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiResponse({ status: 200, description: 'Topildi' })
  @ApiResponse({ status: 404, description: 'GroupCourse topilmadi' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.groupCourseService.findOne(id);
  }

  // PATCH /group-course/:id
  @Patch(':id')
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: `${UserRole.SUPERADMIN} | ${UserRole.ADMIN}` })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiBody({
    type: UpdateGroupCourseDto,
    examples: {
      changeGroup: { summary: 'Guruhni o\'zgartirish', value: { groupId: 3 } },
      changeCourse: { summary: 'Kursni o\'zgartirish', value: { courseId: 5 } },
      deactivate: { summary: 'Faolsizlashtirish', value: { isActive: false } },
    },
  })
  @ApiResponse({ status: 200, description: 'Yangilandi' })
  @ApiResponse({ status: 404, description: 'GroupCourse, Group yoki Course topilmadi' })
  @ApiResponse({ status: 409, description: 'Bunday bog\'lanish allaqachon mavjud' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateGroupCourseDto: UpdateGroupCourseDto,
  ) {
    return this.groupCourseService.update(id, updateGroupCourseDto);
  }

  // DELETE /group-course/:id
  @Delete(':id')
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: `${UserRole.SUPERADMIN} | ${UserRole.ADMIN}` })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiResponse({ status: 200, description: 'Soft delete — isActive = false' })
  @ApiResponse({ status: 404, description: 'GroupCourse topilmadi yoki allaqachon o\'chirilgan' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.groupCourseService.remove(id);
  }
}
