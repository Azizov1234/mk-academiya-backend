import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, IsEnum, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { PartOfSpeech } from '../interfaces';

export class CreateVocabularyDto {
  @ApiProperty({ description: "Inglizcha so'z", example: 'Ambiguous' })
  @IsString()
  word: string;

  @ApiProperty({ description: "O'zbekcha tarjimasi", example: "Noaniq, ikki ma'noli" })
  @IsString()
  translation: string;

  @ApiPropertyOptional({ description: "Talaffuz (IPA yoki fonetik)", example: "æmˈbɪɡjuəs" })
  @IsString()
  @IsOptional()
  pronunciation?: string;

  @ApiPropertyOptional({ description: "So'z turkumi", enum: PartOfSpeech, example: PartOfSpeech.ADJECTIVE })
  @IsOptional()
  @IsEnum(PartOfSpeech)
  partOfSpeech?: string;

  @ApiPropertyOptional({ description: "Misol jumla (inglizcha)", example: 'The instructions were ambiguous.' })
  @IsString()
  @IsOptional()
  exampleSentence?: string;

  @ApiPropertyOptional({ description: "Misol jumlasi tarjimasi", example: "Ko'rsatmalar noaniq edi." })
  @IsString()
  @IsOptional()
  exampleTranslation?: string;

  @ApiPropertyOptional({ description: "Rasm URL", example: 'https://example.com/image.png' })
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiPropertyOptional({ description: "Audio URL", example: 'https://example.com/audio.mp3' })
  @IsString()
  @IsOptional()
  audioUrl?: string;

  @ApiPropertyOptional({ description: "Qiyinlik darajasi (1-5)", example: 3, minimum: 1, maximum: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  difficulty?: number;

  @ApiPropertyOptional({ description: 'CEFR darajasi (A1, A2, B1, B2, C1, C2)', example: 'B2' })
  @IsOptional()
  @IsString()
  cefrLevel?: string;
}
