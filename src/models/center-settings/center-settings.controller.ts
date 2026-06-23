import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CenterSettingsService } from './center-settings.service';
import { UpdateCenterSettingsDto } from './dto';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/role.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/core/enums';

@ApiTags('center-settings')
@Controller('center-settings')
export class CenterSettingsController {
  constructor(
    private readonly centerSettingsService: CenterSettingsService,
  ) {}

  @Get('public')
  @ApiOperation({ summary: 'Get public center branding settings' })
  @ApiResponse({ status: 200, description: 'Return center branding settings.' })
  findPublic() {
    return this.centerSettingsService.findPublic();
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get editable center branding settings' })
  findPrivate() {
    return this.centerSettingsService.findPrivate();
  }

  @Patch()
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update center branding settings' })
  update(@Body() dto: UpdateCenterSettingsDto) {
    return this.centerSettingsService.update(dto);
  }
}
