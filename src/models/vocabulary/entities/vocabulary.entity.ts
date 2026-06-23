import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VocabularyStatus } from '../interfaces';

export class VocabularyEntity {
  @ApiProperty() id: number;
  @ApiProperty() word: string;
  @ApiProperty() translation: string;
  @ApiPropertyOptional() pronunciation?: string;
  @ApiPropertyOptional() partOfSpeech?: string;
  @ApiPropertyOptional() exampleSentence?: string;
  @ApiPropertyOptional() exampleTranslation?: string;
  @ApiPropertyOptional() imageUrl?: string;
  @ApiPropertyOptional() audioUrl?: string;
  @ApiProperty() difficulty: number;
  @ApiPropertyOptional() cefrLevel?: string;
  @ApiProperty() isActive: boolean;
}

export class VocabularyProgressEntity {
  @ApiProperty() id: number;
  @ApiProperty() studentId: number;
  @ApiProperty() vocabularyId: number;
  @ApiProperty({ enum: VocabularyStatus }) status: string;
  @ApiProperty() easeFactor: number;
  @ApiProperty() intervalDays: number;
  @ApiPropertyOptional() nextReviewAt?: Date;
  @ApiProperty() correctCount: number;
  @ApiProperty() wrongCount: number;
  @ApiPropertyOptional() lastReviewedAt?: Date;
  @ApiProperty() isActive: boolean;
}
