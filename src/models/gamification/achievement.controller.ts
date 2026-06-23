import { Controller, Get, Param } from '@nestjs/common';
import { AchievementService } from './achievement.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('achievements')
@Controller('achievements')
export class AchievementController {
  constructor(private readonly service: AchievementService) {}

  @Get()
  @ApiOperation({ summary: 'Find all achievements' })
  @ApiResponse({ status: 200, description: 'Return all achievements.' })
  findAll() {
    return this.service.findAll();
  }

  @Get('student/:id')
  @ApiOperation({ summary: 'Find student achievements' })
  @ApiResponse({ status: 200, description: 'Return achievements for a specific student.' })
  findByStudent(@Param('id') id: string) {
    return this.service.findByUserId(+id);
  }
}
