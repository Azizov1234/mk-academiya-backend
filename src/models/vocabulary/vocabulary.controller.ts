import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { VocabularyService } from './vocabulary.service';
import { CreateVocabularyDto, UpdateVocabularyDto, QueryVocabularyDto } from './dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/role.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/core/enums';

@ApiTags('vocabularies')
@Controller('vocabularies')
@ApiBearerAuth()
export class VocabularyController {
  constructor(private readonly vocabularyService: VocabularyService) {}

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  @Post('create')
  @ApiOperation({ summary: "Yangi so'z qo'shish (Faqat Adminlar)" })
  @ApiResponse({ status: 201, description: "So'z muvaffaqiyatli qo'shildi." })
  create(@Body() dto: CreateVocabularyDto) {
    return this.vocabularyService.create(dto);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT)
  @Get('get-all')
  @ApiOperation({ summary: "Barcha so'zlarni olish (Filterlash va sahifalash bilan)" })
  findAll(@Query() query: QueryVocabularyDto) {
    return this.vocabularyService.findAll(query);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT)
  @Get('get/:id')
  @ApiOperation({ summary: "Bitta so'zni ko'rish" })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.vocabularyService.findOne(id);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  @Patch('update/:id')
  @ApiOperation({ summary: "So'zni tahrirlash (Faqat Adminlar)" })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateVocabularyDto) {
    return this.vocabularyService.update(id, dto);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  @Delete('delete/:id')
  @ApiOperation({ summary: "So'zni o'chirish (Faqat Adminlar)" })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.vocabularyService.remove(id);
  }
}
