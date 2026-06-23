import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { XPService } from './xp.service';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/role.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/core/enums';
import { RewardXpDto } from './dto';

@ApiTags('xp')
@Controller('xp')
export class XpController {
  constructor(private readonly service: XPService) {}

  @Post('add/:userId')
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Add XP to a student (Admin/System only)' })
  @ApiResponse({ status: 201, description: 'XP added successfully.' })
  addXP(
    @Param('userId') userId: string,
    @Body() body: RewardXpDto,
  ) {
    return this.service.addXP(+userId, body.amount, body.reason || 'manual_adjustment');
  }

  @Get('rank/:userId')
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Get current rank of a student' })
  @ApiResponse({ status: 200, description: 'Return student rank.' })
  getRank(@Param('userId') userId: string) {
    return this.service.getRank(+userId);
  }
}
