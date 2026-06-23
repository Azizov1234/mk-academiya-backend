import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsInt, Min, Max } from 'class-validator';

export class CreateRatingDto {
  @ApiProperty({ description: 'Student ID' })
  @IsInt()
  userId: number;

  @ApiProperty({ description: 'Score from 1 to 5' })
  @IsInt()
  @Min(1)
  @Max(5)
  score: number;

  @ApiProperty({ description: 'Target type, e.g. COURSE, TEACHER' })
  @IsString()
  targetType: string;

  @ApiProperty({ description: 'Target ID' })
  @IsString()
  targetId: string;

  @ApiPropertyOptional()
  @IsString()
  reviewText?: string;
}
