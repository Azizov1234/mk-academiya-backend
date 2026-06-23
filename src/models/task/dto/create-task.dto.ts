import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { TaskType } from '../../../core/enums';

export class CreateTaskDto {
  @ApiProperty({ example: 'Letter Writing: Formal Request' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ enum: TaskType, default: TaskType.GRAMMAR })
  @IsEnum(TaskType)
  type: TaskType;

  @ApiPropertyOptional({
    description: 'Maximum score for the task. If xpReward is sent, it is mapped here.',
    example: 100,
    default: 100,
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  maxScore?: number;

  @ApiPropertyOptional({
    description: 'Backward-compatible alias for maxScore.',
    example: 100,
    deprecated: true,
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  xpReward?: number;

  @ApiPropertyOptional({
    description: 'Task instructions shown to students.',
    example: 'Write a 180-word essay using at least five complex sentences.',
  })
  @IsString()
  @IsOptional()
  instructions?: string;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  courseId?: number | null;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
