import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Roles } from 'src/common/decorators/roles.decorator';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/role.guard';
import { UserRole } from 'src/core/enums';
import { BotAdminService } from './service/bot-admin.service';
import { BotResultsService } from './service/bot-results.service';
import { BotLeadsService } from './service/bot-leads.service';
import { BotCenterInfoService } from './service/bot-center-info.service';
import { BotCoursesService } from './service/bot-courses.service';
import { CreateAdminDto } from './service/dto/admin-dto/create-admin.dto';
import { SearchStudentDto } from './service/dto/admin-dto/search-student.dto';
import { CreateStudentResultDto } from './service/dto/results-dto/create-student-result.dto';
import { QueryStudentResultsDto } from './service/dto/results-dto/query-student-results.dto';
import { CreateLeadRequestDto } from './service/dto/leads-dto/create-lead-request.dto';
import { UpdateCenterInfoDto } from './service/dto/center-info-dto/update-center-info.dto';
import { CreateCourseDto } from './service/dto/courses-dto/create-course.dto';
import { UpdateCourseDto } from './service/dto/courses-dto/update-course.dto';
import { ExamType } from './service/exam-type';

function toSafeLimit(value: string, fallback = 10): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(1, Math.min(50, Math.trunc(parsed)));
}

@Controller('bot')
export class BotController {
  constructor(
    private readonly adminService: BotAdminService,
    private readonly resultsService: BotResultsService,
    private readonly leadsService: BotLeadsService,
    private readonly centerInfoService: BotCenterInfoService,
    private readonly coursesService: BotCoursesService,
  ) {}

  @Post('admin/users')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  createAdmin(@Body() dto: CreateAdminDto) {
    return this.adminService.create(dto);
  }

  @Get('admin/users')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  getAdmins() {
    return this.adminService.findAllAdmins();
  }

  @Get('admin/stats')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  getStats() {
    return this.adminService.getStats();
  }

  @Get('admin/results')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  getResults(
    @Query('examType') examType: ExamType = ExamType.CEFR,
    @Query('limit') limit = '10',
  ) {
    return this.adminService.getResultsByExamType(examType, toSafeLimit(limit));
  }

  @Get('admin/search')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  searchStudents(@Query() query: SearchStudentDto) {
    return this.adminService.searchStudents(query.query, query.limit ?? 10);
  }

  @Get('admin/leads')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  getLeads(@Query('limit') limit = '10') {
    return this.adminService.getRecentLeads(toSafeLimit(limit));
  }

  @Post('results')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  createResult(@Body() dto: CreateStudentResultDto) {
    return this.resultsService.create(dto);
  }

  @Get('results')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  findResults(@Query() query: QueryStudentResultsDto) {
    return this.resultsService.findAll(query);
  }

  @Get('results/search')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  searchResults(@Query('query') query: string, @Query('limit') limit = '10') {
    return this.resultsService.searchByStudent(query, toSafeLimit(limit));
  }

  @Get('results/summary')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  getResultsSummary() {
    return this.resultsService.getSummary();
  }

  @Get('results/:id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  findOneResult(@Param('id', ParseIntPipe) id: number) {
    return this.resultsService.findOne(id);
  }

  @Post('leads')
  createLead(@Body() dto: CreateLeadRequestDto) {
    return this.leadsService.create(dto);
  }

  @Get('leads')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  findLeads(@Query('limit') limit = '10') {
    return this.leadsService.findAll(toSafeLimit(limit));
  }

  @Get('center-info')
  getCenterInfo() {
    return this.centerInfoService.getCenterInfo();
  }

  @Put('center-info')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  upsertCenterInfo(@Body() dto: UpdateCenterInfoDto) {
    return this.centerInfoService.upsert(dto);
  }

  @Post('courses')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  createCourse(@Body() dto: CreateCourseDto) {
    return this.coursesService.create(dto);
  }

  @Get('courses')
  findCourses() {
    return this.coursesService.findAll();
  }

  @Get('courses/active')
  findActiveCourses() {
    return this.coursesService.findActive();
  }

  @Patch('courses/:id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  updateCourse(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCourseDto,
  ) {
    return this.coursesService.update(id, dto);
  }
}

