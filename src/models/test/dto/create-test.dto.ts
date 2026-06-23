import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { CefrLevel } from 'src/core/enums';
import { CreateQuestionDto } from '../../questions/dto/create-question.dto';
import { PUBLIC_EXAM_DIRECTIONS, PUBLIC_EXAM_MODES } from './public-exam.dto';

export class CreateTestDto {
  @ApiProperty({ example: 'Final Exam: B2 Level' })
  @IsString()
  title: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 'PRACTICE' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ enum: CefrLevel, example: CefrLevel.B2 })
  @IsOptional()
  @IsString()
  cefrLevel?: CefrLevel;

  @ApiPropertyOptional({
    example: 60,
    description: 'Legacy alias for timeLimitMinutes.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  duration?: number;

  @ApiPropertyOptional({ example: 60, description: 'Time limit in minutes.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  timeLimitMinutes?: number;

  @ApiProperty({ example: 70, description: 'Passing score percentage' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  passingScore: number;

  @ApiPropertyOptional({ description: 'ID of the course this test belongs to' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  courseId?: number | null;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  shuffleQuestions?: boolean;

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxAttempts?: number | null;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isAdaptive?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isPublicExam?: boolean;

  @ApiPropertyOptional({ enum: PUBLIC_EXAM_MODES })
  @IsOptional()
  @IsString()
  @IsIn(PUBLIC_EXAM_MODES)
  publicExamType?: (typeof PUBLIC_EXAM_MODES)[number] | null;

  @ApiPropertyOptional({ enum: PUBLIC_EXAM_DIRECTIONS })
  @IsOptional()
  @IsString()
  @IsIn(PUBLIC_EXAM_DIRECTIONS)
  publicExamDirection?: (typeof PUBLIC_EXAM_DIRECTIONS)[number] | null;

  @ApiPropertyOptional({ type: [CreateQuestionDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuestionDto)
  questions?: CreateQuestionDto[];
}
