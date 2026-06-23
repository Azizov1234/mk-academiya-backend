import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { RatingService } from './rating.service';
import { CreateRatingDto } from './dto';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/role.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/core/enums';

@ApiTags('ratings')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
@Controller('ratings')
export class RatingController {
  constructor(private readonly service: RatingService) {}

  @Post()
  @ApiOperation({ summary: 'Create a rating' })
  create(@Body() dto: CreateRatingDto) {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all ratings' })
  findAll() {
    return this.service.findAll();
  }

  @Get('target')
  @ApiOperation({ summary: 'Get ratings by target' })
  findByTarget(@Query('type') type: string, @Query('id') id: string) {
    return this.service.findByTarget(type, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove a rating' })
  remove(@Param('id') id: string) {
    return this.service.remove(+id);
  }
}
