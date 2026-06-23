import {
  Controller,
  Post,
  Body,
  Param,
  Get,
  UseGuards,
  Req,
  ParseIntPipe,
} from '@nestjs/common';
import { VocabularyProgressService } from './vocabulary-progress.service';
import { SubmitReviewDto } from './dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/role.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/core/enums';

@ApiTags('vocabulary-progress')
@Controller('vocabulary-progress')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
export class VocabularyProgressController {
  constructor(private readonly service: VocabularyProgressService) {}

  @Roles(UserRole.STUDENT)
  @Post('submit-review')
  @ApiOperation({
    summary: "So'z takrorini baholash (SM-2 algoritmiga asoslanadi) - Faqat O'quvchilar",
  })
  submitReview(@Body() dto: SubmitReviewDto, @Req() req: any) {
    return this.service.submitReview(dto, req['user']);
  }

  @Roles(UserRole.STUDENT)
  @Get('due-reviews')
  @ApiOperation({ summary: "Bugun takrorlash kerak bo'lgan so'zlar - Faqat O'quvchilar" })
  getDueReviews(@Req() req: any) {
    return this.service.getDueReviews(req['user']);
  }

  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT)
  @Get('student/:studentId')
  @ApiOperation({
    summary: "O'quvchining barcha so'z progressini ko'rish (O'quvchi o'zini, O'qituvchi guruhnikini ko'radi)",
  })
  findByStudent(@Param('studentId', ParseIntPipe) studentId: number, @Req() req: any) {
    return this.service.findByStudent(studentId, req['user']);
  }

  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER)
  @Get('get/:id')
  @ApiOperation({ summary: "Bitta progress yozuvini ko'rish - Adminlar va O'qituvchilar uchun" })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }
}
