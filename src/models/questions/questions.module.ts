import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from 'src/core/config/prisma.module';
import { QuestionsService } from './questions.service';
import { QuestionsController } from './questions.controller';
import { QuestionAnalyticsController } from './question-analytics.controller';
import { QuestionAnalyticsService } from './question-analytics.service';
import { TestModule } from '../test/test.module';

@Module({
  imports: [PrismaModule, JwtModule, TestModule],
  controllers: [QuestionAnalyticsController, QuestionsController],
  providers: [QuestionsService, QuestionAnalyticsService],
  exports: [QuestionsService, QuestionAnalyticsService],
})
export class QuestionsModule {}
