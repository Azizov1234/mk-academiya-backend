import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { CefrLevel } from 'src/core/enums';
import { PUBLIC_EXAM_DIRECTIONS, PUBLIC_EXAM_MODES } from './public-exam.dto';

export class QueryTestDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  courseId?: number;

  @ApiPropertyOptional({ enum: CefrLevel })
  @IsOptional()
  @IsString()
  cefrLevel?: CefrLevel;

  @ApiPropertyOptional({ example: 'PRACTICE' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ enum: ['true', 'false'] })
  @IsOptional()
  @IsString()
  isPublished?: string;

  @ApiPropertyOptional({ enum: ['true', 'false'] })
  @IsOptional()
  @IsString()
  isActive?: string;

  @ApiPropertyOptional({ enum: ['true', 'false'] })
  @IsOptional()
  @IsString()
  isPublicExam?: string;

  @ApiPropertyOptional({ enum: PUBLIC_EXAM_MODES })
  @IsOptional()
  @IsString()
  publicExamType?: (typeof PUBLIC_EXAM_MODES)[number];

  @ApiPropertyOptional({ enum: PUBLIC_EXAM_DIRECTIONS })
  @IsOptional()
  @IsString()
  publicExamDirection?: (typeof PUBLIC_EXAM_DIRECTIONS)[number];
}
