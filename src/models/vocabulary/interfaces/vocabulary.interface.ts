export enum VocabularyStatus {
  NEW = 'NEW',
  LEARNING = 'LEARNING',
  REVIEWING = 'REVIEWING',
  MASTERED = 'MASTERED',
}

export enum PartOfSpeech {
  NOUN = 'NOUN',
  VERB = 'VERB',
  ADJECTIVE = 'ADJECTIVE',
  ADVERB = 'ADVERB',
  PREPOSITION = 'PREPOSITION',
  CONJUNCTION = 'CONJUNCTION',
  PRONOUN = 'PRONOUN',
  INTERJECTION = 'INTERJECTION',
  PHRASE = 'PHRASE',
  OTHER = 'OTHER',
}

export interface IVocabulary {
  id: number;
  word: string;
  translation: string;
  pronunciation?: string;
  partOfSpeech?: string;
  exampleSentence?: string;
  exampleTranslation?: string;
  imageUrl?: string;
  audioUrl?: string;
  difficulty: number;
  cefrLevel?: string;
  isActive: boolean;
}

export interface IVocabularyProgress {
  id: number;
  studentId: number;
  vocabularyId: number;
  status: VocabularyStatus;
  easeFactor: number;
  intervalDays: number;
  nextReviewAt?: Date;
  correctCount: number;
  wrongCount: number;
  lastReviewedAt?: Date;
  isActive: boolean;
}

export interface IWordList {
  id: number;
  studentId: number;
  name: string;
  isPublic: boolean;
  isActive: boolean;
}

export interface IWordListItem {
  id: number;
  wordListId: number;
  vocabularyId: number;
  addedAt: Date;
  isActive: boolean;
}
