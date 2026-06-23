import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { TestService } from './test.service';
import { CreateTestDto, QueryTestDto, SubmitAttemptDto, UpdateTestDto } from './dto';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { TestAttemptService } from './test-attempt.service';
import { RolesGuard } from 'src/common/guards/role.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/core/enums';

@ApiTags('tests')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('tests')
export class TestController {
  constructor(
    private readonly testService: TestService,
    private readonly testAttemptService: TestAttemptService,
  ) {}

  @Post()
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Create a new test template' })
  @ApiResponse({ status: 201, description: 'Test created.' })
  create(@Body() dto: CreateTestDto, @Req() req: any) {
    return this.testService.create(dto, req['user']);
  }

  @Get()
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT)
  @ApiOperation({ summary: 'Get all tests' })
  findAll(@Query() query: QueryTestDto, @Req() req: any) {
    return this.testService.findAll(query, req['user']);
  }

  @Get('my-attempts')
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT)
  @ApiOperation({ summary: 'Get test attempts for the current user scope' })
  findMyAttempts(@Req() req: any) {
    return this.testAttemptService.findForCurrentUser(req['user']);
  }

  @Post(':id/start')
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT)
  @ApiOperation({ summary: 'Start a test attempt for the current user' })
  startAttempt(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.testAttemptService.startAttempt(id, req['user']);
  }

  @Post(':id/submit')
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT)
  @ApiOperation({ summary: 'Submit a test attempt for the current user' })
  submitAttempt(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SubmitAttemptDto,
    @Req() req: any,
  ) {
    return this.testAttemptService.submitAttempt(req['user'], dto, id);
  }

  @Get(':id')
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT)
  @ApiOperation({ summary: 'Get test by ID' })
  findOne(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.testService.findOne(id, req['user']);
  }

  @Patch(':id')
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Update test' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTestDto, @Req() req: any) {
    return this.testService.update(id, dto, req['user']);
  }

  @Delete(':id')
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Delete test' })
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.testService.remove(id, req['user']);
  }
}
