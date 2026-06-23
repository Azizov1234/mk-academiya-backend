import { Body, Controller, Get, Param, ParseIntPipe, Post, Req, UseGuards } from '@nestjs/common';
import { TestAttemptService } from './test-attempt.service';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SubmitAttemptDto } from './dto';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/role.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/core/enums';

@ApiTags('test-attempts')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('test-attempts')
export class TestAttemptController {
  constructor(private readonly service: TestAttemptService) {}

  @Post('submit')
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT)
  @ApiOperation({ summary: 'Submit a test attempt' })
  @ApiResponse({ status: 201, description: 'Attempt recorded (XP awarded if passed).' })
  submit(@Body() dto: SubmitAttemptDto, @Req() req: any) {
    return this.service.submitAttempt(req['user'], dto);
  }

  @Get('student/:id')
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT)
  @ApiOperation({ summary: 'Get all attempts for a student' })
  findByStudent(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.service.findByStudent(id, req['user']);
  }
}
