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
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/role.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/core/enums';
import { QuestionsService } from './questions.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';

@ApiTags('questions')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('questions')
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Post('test/:testId')
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Add a question to a test' })
  create(
    @Param('testId', ParseIntPipe) testId: number,
    @Body() createQuestionDto: CreateQuestionDto,
    @Req() req: any,
  ) {
    return this.questionsService.create(testId, createQuestionDto, req['user']);
  }

  @Roles(
    UserRole.SUPERADMIN,
    UserRole.ADMIN,
    UserRole.TEACHER,
    UserRole.STUDENT,
  )
  @ApiOperation({
    summary: 'Get all questions (optional filter by testId/type)',
  })
  @ApiQuery({ name: 'testId', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'type', required: false, type: String, example: 'MCQ' })
  @Get()
  findAll(
    @Query('testId') testId: string | undefined,
    @Query('type') type: string | undefined,
    @Req() req: any,
  ) {
    return this.questionsService.findAll({ testId, type }, req['user']);
  }

  @Get('test/:testId')
  @Roles(
    UserRole.SUPERADMIN,
    UserRole.ADMIN,
    UserRole.TEACHER,
    UserRole.STUDENT,
  )
  @ApiOperation({ summary: 'Get all questions for a test' })
  findAllByTest(
    @Param('testId', ParseIntPipe) testId: number,
    @Req() req: any,
  ) {
    return this.questionsService.findAllByTest(testId, req['user']);
  }

  @Get('type/:type')
  @Roles(
    UserRole.SUPERADMIN,
    UserRole.ADMIN,
    UserRole.TEACHER,
    UserRole.STUDENT,
  )
  @ApiOperation({ summary: 'Get questions by question type' })
  @ApiQuery({ name: 'testId', required: false, type: Number, example: 1 })
  findByType(
    @Param('type') type: string,
    @Query('testId') testId: string | undefined,
    @Req() req: any,
  ) {
    return this.questionsService.findByType(type, testId, req['user']);
  }

  @Roles(
    UserRole.SUPERADMIN,
    UserRole.ADMIN,
    UserRole.TEACHER,
    UserRole.STUDENT,
  )
  @ApiOperation({ summary: 'Get one question by ID' })
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.questionsService.findOne(id, req['user']);
  }

  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Update question' })
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateQuestionDto: UpdateQuestionDto,
    @Req() req: any,
  ) {
    return this.questionsService.update(id, updateQuestionDto, req['user']);
  }

  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Remove question' })
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.questionsService.remove(id, req['user']);
  }
}
