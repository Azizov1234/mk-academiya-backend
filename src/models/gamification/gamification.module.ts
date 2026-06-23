import { Module } from '@nestjs/common';
import { AchievementService } from './achievement.service';
import { AchievementController } from './achievement.controller';
import { XPService } from './xp.service';
import { XpController } from './xp.controller';
import { LeaderboardService } from './leaderboard.service';
import { LeaderboardController } from './leaderboard.controller';
import { PrismaModule } from 'src/core/config/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [
    AchievementController,
    XpController,
    LeaderboardController,
  ],
  providers: [
    AchievementService,
    XPService,
    LeaderboardService,
  ],
  exports: [AchievementService, XPService, LeaderboardService],
})
export class GamificationModule {}
