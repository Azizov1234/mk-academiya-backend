import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDefined,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { CefrLevel } from 'src/core/enums';

export const PUBLIC_EXAM_MODES = ['LEVEL', 'TRACK'] as const;
export const PUBLIC_EXAM_DIRECTIONS = [
  'VOCABULARY',
  'WRITING',
  'SPEAKING',
  'READING',
  'LISTENING',
  'GRAMMAR',
] as const;

export class PublicExamCatalogQueryDto {
  @ApiPropertyOptional({ enum: PUBLIC_EXAM_MODES })
  @IsOptional()
  @IsString()
  @IsIn(PUBLIC_EXAM_MODES)
  mode?: (typeof PUBLIC_EXAM_MODES)[number];

  @ApiPropertyOptional({ enum: CefrLevel })
  @IsOptional()
  @IsString()
  @IsIn(Object.values(CefrLevel))
  level?: CefrLevel;

  @ApiPropertyOptional({ enum: PUBLIC_EXAM_DIRECTIONS })
  @IsOptional()
  @IsString()
  @IsIn(PUBLIC_EXAM_DIRECTIONS)
  direction?: (typeof PUBLIC_EXAM_DIRECTIONS)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ default: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}

export class SubmitPublicExamDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  participantName: string;

  @ApiProperty({ enum: PUBLIC_EXAM_MODES })
  @IsString()
  @IsIn(PUBLIC_EXAM_MODES)
  selectedMode: (typeof PUBLIC_EXAM_MODES)[number];

  @ApiPropertyOptional({ enum: CefrLevel })
  @IsOptional()
  @IsString()
  @IsIn(Object.values(CefrLevel))
  selectedLevel?: CefrLevel;

  @ApiPropertyOptional({ enum: PUBLIC_EXAM_DIRECTIONS })
  @IsOptional()
  @IsString()
  @IsIn(PUBLIC_EXAM_DIRECTIONS)
  selectedDirection?: (typeof PUBLIC_EXAM_DIRECTIONS)[number];

  @ApiProperty({
    description: 'Question answers keyed by question ID, or an array of answer objects.',
    type: 'object',
    additionalProperties: true,
  })
  @IsDefined()
  answers: unknown;

  @ApiPropertyOptional({ example: 420, description: 'Optional time spent in seconds.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  timeSpentSeconds?: number;
}

export class PublicExamRatingQueryDto {
  @ApiPropertyOptional({ enum: PUBLIC_EXAM_MODES })
  @IsOptional()
  @IsString()
  @IsIn(PUBLIC_EXAM_MODES)
  mode?: (typeof PUBLIC_EXAM_MODES)[number];

  @ApiPropertyOptional({ enum: CefrLevel })
  @IsOptional()
  @IsString()
  @IsIn(Object.values(CefrLevel))
  level?: CefrLevel;

  @ApiPropertyOptional({ enum: PUBLIC_EXAM_DIRECTIONS })
  @IsOptional()
  @IsString()
  @IsIn(PUBLIC_EXAM_DIRECTIONS)
  direction?: (typeof PUBLIC_EXAM_DIRECTIONS)[number];

  @ApiPropertyOptional({ example: 12 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  testId?: number;

  @ApiPropertyOptional({ default: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number;
}
