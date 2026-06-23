import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum } from 'class-validator';
import { AchievementType } from '../../../core/enums';

export class CreateAchievementDto {
  @ApiProperty({ example: 'First Test Passed' })
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ enum: AchievementType, example: AchievementType.TEST_PASSED })
  @IsEnum(AchievementType)
  type: AchievementType;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  iconUrl?: string;
}
