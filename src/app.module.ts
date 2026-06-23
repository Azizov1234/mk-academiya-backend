import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { StringValue } from 'ms';
import { PrismaModule } from './core/config/prisma.module';
import { SeedModule } from './common/seeder/seed.module';
import { HttpThrottlerGuard } from './common/guards/http-throttler.guard';

// Explicitly import all models to ensure they are properly registered in the NestJS context
import { AuthModule } from './models/auth/auth.module';
import { UserModule } from './models/user/user.module';
import { UserProfileModule } from './models/user-profile/user-profile.module';
import { CourseModule } from './models/course/course.module';
import { GroupModule } from './models/group/group.module';
import { GroupCourseModule } from './models/group-course/group-course.module';
import { GroupAssignmentModule } from './models/group-assignment/group-assignment.module';
import { BookModule } from './models/book/book.module';
import { VocabularyModule } from './models/vocabulary/vocabulary.module';
import { TaskModule } from './models/task/task.module';
import { RatingModule } from './models/rating/rating.module';
import { GamificationModule } from './models/gamification/gamification.module';
import { TestModule } from './models/test/test.module';
import { NotificationModule } from './models/notification/notification.module';
import { SystemModule } from './models/system/system.module';
import { LeadModule } from './models/lead/lead.module';
import { DashboardModule } from './models/dashboard/dashboard.module';
import { BotModule } from './models/bot/bot.module';
import { CenterSettingsModule } from './models/center-settings/center-settings.module';
import { QuestionsModule } from './models/questions/questions.module';
import { GroupMemberModule } from './models/group-member/group-member.module';

function resolveJwtExpiresIn(value: string): StringValue | number {
  const normalized = value.trim();
  if (/^\d+$/.test(normalized)) {
    return Number(normalized);
  }
  return normalized as StringValue;
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: Number(process.env.THROTTLE_TTL ?? 60_000),
        limit: Number(process.env.THROTTLE_LIMIT ?? 120),
      },
    ]),
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: resolveJwtExpiresIn(
            configService.get<string>('JWT_EXPIRES_IN', '30d'),
          ),
        },
      }),
    }),
    PrismaModule,
    SeedModule,
    // Add all modules explicitly
    AuthModule,
    UserModule,
    UserProfileModule,
    CourseModule,
    GroupModule,
    GroupCourseModule,
    GroupAssignmentModule,
    BookModule,
    VocabularyModule,
    TaskModule,
    RatingModule,
    GamificationModule,
    TestModule,
    NotificationModule,
    SystemModule,
    LeadModule,
    DashboardModule,
    BotModule,
    CenterSettingsModule,
    QuestionsModule,
    GroupMemberModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: HttpThrottlerGuard,
    },
  ],
})
export class AppModule {}
