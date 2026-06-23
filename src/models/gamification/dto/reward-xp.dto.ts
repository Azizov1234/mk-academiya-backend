import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class RewardXpDto {
  @ApiProperty({ example: 10, minimum: 1, maximum: 10000 })
  @IsInt()
  @Min(1)
  @Max(10000)
  amount: number;

  @ApiPropertyOptional({ example: 'manual_adjustment' })
  @IsOptional()
  @IsString()
  reason?: string;
}
