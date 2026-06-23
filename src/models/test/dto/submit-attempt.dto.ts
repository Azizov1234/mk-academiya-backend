import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';

export class SubmitAttemptDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  testId?: number;

  @ApiPropertyOptional({ example: 1, description: 'Existing in-progress attempt ID.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  attemptId?: number;

  @ApiPropertyOptional({
    example: { '1': 'A', '2': ['B', 'C'] },
    description: 'Question answers keyed by question ID, or an array of answer objects.',
  })
  @IsOptional()
  answers?: unknown;

  @ApiPropertyOptional({ example: 480 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  timeSpentSeconds?: number;

  @ApiPropertyOptional({
    example: 10,
    description: 'Legacy/manual mode. Students must send answers instead.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  score?: number;

  @ApiPropertyOptional({
    example: 75,
    description: 'Legacy/manual mode percentage. Students must send answers instead.',
  })
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  percentage?: number;

  @ApiPropertyOptional({
    example: true,
    description: 'Legacy/manual mode. Final pass value is derived from percentage.',
  })
  @IsOptional()
  @IsBoolean()
  passed?: boolean;

  @ApiPropertyOptional({
    example: 12,
    description: 'Managers can record an attempt for a specific student.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  studentId?: number;
}
