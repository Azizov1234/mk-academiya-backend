import { Controller, Get, Post, Delete, Body, Param, ParseIntPipe, UseGuards, Req } from '@nestjs/common';
import { WordListItemService } from './word-list-item.service';
import { AddWordListItemDto } from './dto/add-word-list-item.dto';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/role.guard';
import { UserRole } from 'src/core/enums';
import { Roles } from 'src/common/decorators/roles.decorator';

@ApiTags('word-list-items')
@Controller('word-list-items')
@ApiBearerAuth()
export class WordListItemController {
  constructor(private readonly wordListItemService: WordListItemService) {}

  @UseGuards(AuthGuard, RolesGuard)
  @Post(':wordListId/add')
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Ro\'yxatga so\'z qo\'shish (Faqat Oqituvchi/Admin)' })
  @ApiResponse({ status: 201, description: 'So\'z muvaffaqiyatli qo\'shildi.' })
  addItem(
    @Param('wordListId', ParseIntPipe) wordListId: number,
    @Body() dto: AddWordListItemDto,
    @Req() req: any,
  ) {
    return this.wordListItemService.create(wordListId, dto, req['user']);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Get(':wordListId/all')
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT)
  @ApiOperation({ summary: 'Ro\'yxatdagi so\'zlarni olish (O\'quvchi faqati o\'zinikini, Teacher guruhinikini)' })
  findAllByList(
    @Param('wordListId', ParseIntPipe) wordListId: number,
    @Req() req: any,
  ) {
    return this.wordListItemService.findAllByList(wordListId, req['user']);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Delete(':wordListId/remove/:vocabularyId')
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Ro\'yxatdan so\'zni o\'chirish (Faqat Oqituvchi/Admin)' })
  removeItem(
    @Param('wordListId', ParseIntPipe) wordListId: number,
    @Param('vocabularyId', ParseIntPipe) vocabularyId: number,
    @Req() req: any,
  ) {
    return this.wordListItemService.remove(wordListId, vocabularyId, req['user']);
  }
}
