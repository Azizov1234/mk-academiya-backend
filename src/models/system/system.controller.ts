import { Controller, Get, UseGuards } from '@nestjs/common';
import { SystemService } from './system.service';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/role.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/core/enums';

@ApiTags('system')
@Controller('system')
export class SystemController {
  constructor(private readonly systemService: SystemService) {}

  @Get('health')
  @ApiOperation({ summary: 'Check API health status' })
  @ApiResponse({ status: 200, description: 'System is healthy.' })
  getHealth() {
    return this.systemService.getHealth();
  }

  @Get('stats')
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Get system resource statistics' })
  @ApiResponse({ status: 200, description: 'Return stats.' })
  getStats() {
    return this.systemService.getStats();
  }
}
