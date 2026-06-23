import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsInt,
  IsBoolean,
  IsEnum,
  IsNumber,
  Min,
  Max,
  MinLength,
} from 'class-validator';
import { PartOfSpeech, VocabularyStatus } from '../interfaces';

export class SubmitReviewDto {
  @ApiProperty({
    description: "So'z iD si",
    example: 1,
  })
  @IsInt()
  vocabularyId: number;

  @ApiProperty({
    description: 'SM-2 sifat bahosi (0 - eng yomon, 5 - eng yaxshi)',
    example: 4,
    minimum: 0,
    maximum: 5,
  })
  @IsInt()
  @Min(0)
  @Max(5)
  quality: number;
}
