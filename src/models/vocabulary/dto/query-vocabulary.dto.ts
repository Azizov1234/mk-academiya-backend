import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { PartOfSpeech } from '../interfaces';

export class QueryVocabularyDto {
  @ApiPropertyOptional({ description: "Sahifa raqami (default: 1)", example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: "Bir sahifada nechta (default: 20)", example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'CEFR darajasi (A1, A2, B1, B2, C1, C2)', example: 'B1' })
  @IsOptional()
  @IsString()
  cefrLevel?: string;

  @ApiPropertyOptional({ description: "Qiyinlik darajasi (1-5)", example: 2, minimum: 1, maximum: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  difficulty?: number;

  @ApiPropertyOptional({ description: "So'z turkumi", enum: PartOfSpeech })
  @IsOptional()
  @IsEnum(PartOfSpeech)
  partOfSpeech?: string;

  @ApiPropertyOptional({ description: "Qidiruv so'zi", example: 'ambig' })
  @IsOptional()
  @IsString()
  search?: string;
}
