import { Module } from '@nestjs/common';
import { VocabularyService } from './vocabulary.service';
import { VocabularyController } from './vocabulary.controller';
import { VocabularyProgressService } from './vocabulary-progress.service';
import { VocabularyProgressController } from './vocabulary-progress.controller';
import { WordListService } from './word-list.service';
import { WordListController } from './word-list.controller';
import { WordListItemService } from './word-list-item.service';
import { WordListItemController } from './word-list-item.controller';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [JwtModule],
  controllers: [
    VocabularyController,
    VocabularyProgressController,
    WordListController,
    WordListItemController,
  ],
  providers: [
    VocabularyService,
    VocabularyProgressService,
    WordListService,
    WordListItemService,
  ],
  exports: [
    VocabularyService,
    VocabularyProgressService,
    WordListService,
    WordListItemService,
  ],
})
export class VocabularyModule {}
