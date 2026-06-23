import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TestService } from './test.service';
import { TestController } from './test.controller';
import { TestAttemptService } from './test-attempt.service';
import { TestAttemptController } from './test-attempt.controller';
import { GamificationModule } from '../gamification/gamification.module';
import { PrismaModule } from 'src/core/config/prisma.module';
import { PublicTestController } from './public-test.controller';
import { PublicTestService } from './public-test.service';

@Module({
  imports: [GamificationModule, PrismaModule, JwtModule],
  controllers: [TestController, TestAttemptController, PublicTestController],
  providers: [TestService, TestAttemptService, PublicTestService],
  exports: [TestService, TestAttemptService, PublicTestService],
})
export class TestModule {}
