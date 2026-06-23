import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class GradeTaskDto {
  @ApiProperty({
    description: 'Final score for the submission. Must be <= task maxScore.',
    example: 87,
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  score: number;

  @ApiPropertyOptional({
    description: 'Teacher feedback for the student.',
    example: 'Good structure, work on paragraph transitions.',
  })
  @IsOptional()
  @IsString()
  teacherFeedback?: string;
}
