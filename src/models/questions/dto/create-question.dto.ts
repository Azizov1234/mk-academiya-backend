import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateQuestionDto {
  @ApiPropertyOptional({ example: 'MCQ' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ example: 'OPTIONS' })
  @IsOptional()
  @IsString()
  inputType?: string;

  @ApiProperty({ example: 'Choose the correct answer.' })
  @IsString()
  questionText!: string;

  @ApiPropertyOptional({
    example: ['A', 'B', 'C', 'D'],
    description: 'Array, object, or string. Stored as JSON when needed.',
  })
  @IsOptional()
  options?: unknown;

  @ApiPropertyOptional({
    example: 'A',
    description:
      'Array, object, number, boolean, or string. Stored as JSON when needed.',
  })
  @IsOptional()
  correctAnswer?: unknown;

  @ApiPropertyOptional({
    example: 'Because this option matches the grammar rule.',
  })
  @IsOptional()
  @IsString()
  explanation?: string;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  points?: number;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  difficulty?: number;

  @ApiPropertyOptional({ example: 'GRAMMAR' })
  @IsOptional()
  @IsString()
  skill?: string;
}
