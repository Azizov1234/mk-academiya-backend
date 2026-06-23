import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
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
import { Roles } from 'src/common/decorators/roles.decorator';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/role.guard';
import { UserRole } from 'src/core/enums';
import { QuestionAnalyticsService } from './question-analytics.service';

@ApiTags('question-analytics')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('questions/analytics')
export class QuestionAnalyticsController {
  constructor(
    private readonly questionAnalyticsService: QuestionAnalyticsService,
  ) {}

  @Get()
  @Roles(
    UserRole.SUPERADMIN,
    UserRole.ADMIN,
    UserRole.TEACHER,
    UserRole.STUDENT,
  )
  @ApiOperation({
    summary:
      'Get all question analytics (optional test filter). Analytics are auto-calculated.',
  })
  @ApiQuery({ name: 'testId', required: false, type: Number, example: 1 })
  findAll(@Query('testId') testId: string | undefined, @Req() req: any) {
    return this.questionAnalyticsService.findAll(testId, req['user']);
  }

  @Get(':questionId')
  @Roles(
    UserRole.SUPERADMIN,
    UserRole.ADMIN,
    UserRole.TEACHER,
    UserRole.STUDENT,
  )
  @ApiOperation({ summary: 'Get analytics by question ID' })
  findOne(
    @Param('questionId', ParseIntPipe) questionId: number,
    @Req() req: any,
  ) {
    return this.questionAnalyticsService.findOneByQuestionId(
      questionId,
      req['user'],
    );
  }
}
