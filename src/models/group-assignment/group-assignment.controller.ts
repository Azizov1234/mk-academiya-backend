import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Req,
  ParseIntPipe,
} from '@nestjs/common';
import { GroupAssignmentService } from './group-assignment.service';
import { CreateGroupAssignmentDto, UpdateGroupAssignmentDto } from './dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/role.guard';
import { UserRole } from 'src/core/enums';
import { Roles } from 'src/common/decorators/roles.decorator';

@ApiTags('group-assignments')
@Controller('group-assignments')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
export class GroupAssignmentController {
  constructor(
    private readonly groupAssignmentService: GroupAssignmentService,
  ) {}

  /**
   * POST /group-assignments/create
   * Ruxsatlar: SUPERADMIN, ADMIN → istalgan guruhga;
   *            TEACHER → faqat o'z guruhiga
   */
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER)
  @Post('create')
  @ApiOperation({
    summary: `Yangi guruh vazifasi yaratish`,
    description:
      'SUPERADMIN va ADMIN istalgan guruhga vazifa qo\'sha oladi. ' +
      'TEACHER faqat o\'ziga tegishli guruhga vazifa qo\'sha oladi. ' +
      'taskId YOKI testId (bittasi) kiritilishi shart.',
  })
  @ApiResponse({ status: 201, description: 'Guruh vazifasi muvaffaqiyatli yaratildi' })
  @ApiResponse({ status: 400, description: 'Noto\'g\'ri ma\'lumot (taskId va testId ikkalasi yoki birortasi ham yo\'q)' })
  @ApiResponse({ status: 403, description: 'Ruxsat yo\'q (teacher boshqa guruhga qo\'shmoqchi)' })
  @ApiResponse({ status: 404, description: 'Guruh, vazifa yoki test topilmadi' })
  create(@Body() dto: CreateGroupAssignmentDto, @Req() req: any) {
    return this.groupAssignmentService.create(dto, req['user']);
  }

  /**
   * GET /group-assignments/get-all
   * Ruxsatlar: SUPERADMIN, ADMIN → barchasi;
   *            TEACHER → faqat o'z guruhlari;
   *            STUDENT → faqat a'zo bo'lgan guruhlari
   */
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT)
  @Get('get-all')
  @ApiOperation({
    summary: `Guruh vazifalarini ro'yxatini olish`,
    description:
      'SUPERADMIN va ADMIN barcha aktiv vazifalarni ko\'radi. ' +
      'TEACHER faqat o\'z guruhlaridagi vazifalarni ko\'radi. ' +
      'STUDENT faqat o\'zi a\'zo bo\'lgan guruhlardagi vazifalarni ko\'radi.',
  })
  @ApiQuery({
    name: 'groupName',
    required: false,
    type: String,
    description: 'Guruh nomi bo\'yicha qidirish (ixtiyoriy)',
  })
  @ApiResponse({ status: 200, description: 'Vazifalar ro\'yxati muvaffaqiyatli qaytarildi' })
  findAll(@Query('groupName') groupName: string, @Req() req: any) {
    return this.groupAssignmentService.findAll(groupName, req['user']);
  }

  /**
   * GET /group-assignments/get/:id
   * Ruxsatlar: SUPERADMIN, ADMIN → istalgan;
   *            TEACHER → faqat o'z guruhidagi;
   *            STUDENT → faqat a'zo bo'lgan guruhdagi
   */
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT)
  @Get('get/:id')
  @ApiOperation({
    summary: `Bitta guruh vazifasini ID orqali ko'rish`,
    description:
      'SUPERADMIN va ADMIN istalgan vazifani ko\'ra oladi. ' +
      'TEACHER faqat o\'z guruhidagi vazifani ko\'ra oladi. ' +
      'STUDENT faqat o\'zi a\'zo bo\'lgan guruhdagi vazifani ko\'ra oladi.',
  })
  @ApiResponse({ status: 200, description: 'Vazifa muvaffaqiyatli qaytarildi' })
  @ApiResponse({ status: 403, description: 'Ruxsat yo\'q' })
  @ApiResponse({ status: 404, description: 'Vazifa topilmadi' })
  findOne(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.groupAssignmentService.findOne(id, req['user']);
  }

  /**
   * PATCH /group-assignments/update/:id
   * Ruxsatlar: SUPERADMIN, ADMIN → istalgan;
   *            TEACHER → faqat o'z guruhidagi
   */
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER)
  @Patch('update/:id')
  @ApiOperation({
    summary: `Guruh vazifasini tahrirlash`,
    description:
      'SUPERADMIN va ADMIN istalgan vazifani tahrirlashi mumkin. ' +
      'TEACHER faqat o\'z guruhidagi vazifalarni tahrirlashi mumkin.',
  })
  @ApiResponse({ status: 200, description: 'Guruh vazifasi muvaffaqiyatli tahrirlandi' })
  @ApiResponse({ status: 403, description: 'Ruxsat yo\'q' })
  @ApiResponse({ status: 404, description: 'Vazifa topilmadi' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateGroupAssignmentDto,
    @Req() req: any,
  ) {
    return this.groupAssignmentService.update(id, dto, req['user']);
  }

  /**
   * DELETE /group-assignments/delete/:id
   * Ruxsatlar: SUPERADMIN, ADMIN → istalgan;
   *            TEACHER → faqat o'z guruhidagi
   */
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER)
  @Delete('delete/:id')
  @ApiOperation({
    summary: `Guruh vazifasini o'chirish (soft delete)`,
    description:
      'SUPERADMIN va ADMIN istalgan vazifani o\'chira oladi. ' +
      'TEACHER faqat o\'z guruhidagi vazifalarni o\'chira oladi. ' +
      'Bazadan o\'chirmaydi — isActive: false qiladi.',
  })
  @ApiResponse({ status: 200, description: 'Guruh vazifasi muvaffaqiyatli o\'chirildi' })
  @ApiResponse({ status: 403, description: 'Ruxsat yo\'q' })
  @ApiResponse({ status: 404, description: 'Vazifa topilmadi' })
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.groupAssignmentService.remove(id, req['user']);
  }
}
