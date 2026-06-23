import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, ParseIntPipe } from '@nestjs/common';
import { WordListService } from './word-list.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/role.guard';
import { UserRole } from 'src/core/enums';
import { Roles } from 'src/common/decorators/roles.decorator';

@ApiTags('word-lists')
@Controller('word-lists')
@ApiBearerAuth()
export class WordListController {
  constructor(private readonly wordListService: WordListService) {}

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER)
  @Post('create')
  @ApiOperation({ summary: 'Yangi so\'z ro\'yxati yaratish (Faqat Oqituvchi va Adminlar)' })
  create(@Body() dto: any, @Req() req: any) {
    return this.wordListService.create(dto, req['user']);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT)
  @Get('get-all')
  @ApiOperation({ summary: 'Barcha ro\'yxatlarni olish (O\'quvchi o\'zini, o\'qituvchi o\'z gruhnikini ko\'radi)' })
  findAll(@Req() req: any) {
    return this.wordListService.findAll(req['user']);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT)
  @Get('get/:id')
  @ApiOperation({ summary: 'Bitta ro\'yxatni ko\'rish' })
  findOne(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.wordListService.findOne(id, req['user']);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER)
  @Patch('update/:id')
  @ApiOperation({ summary: 'Ro\'yxatni tahrirlash (Faqat Oqituvchi va Adminlar)' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: any, @Req() req: any) {
    return this.wordListService.update(id, dto, req['user']);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER)
  @Delete('delete/:id')
  @ApiOperation({ summary: 'Ro\'yxatni o\'chirish (Faqat Oqituvchi va Adminlar)' })
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.wordListService.remove(id, req['user']);
  }
}
