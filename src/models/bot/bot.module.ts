import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TelegrafModule } from 'nestjs-telegraf';
import { BotController } from './bot.controller';
import { BotService } from './bot.service';
import { BotUpdate } from './bot/bot';
import { BotAdminService } from './service/bot-admin.service';
import { BotResultsService } from './service/bot-results.service';
import { BotLeadsService } from './service/bot-leads.service';
import { BotCenterInfoService } from './service/bot-center-info.service';
import { BotCoursesService } from './service/bot-courses.service';
import { BotStateService } from './service/bot-state.service';
import { BotDataBootstrapService } from './service/bot-data-bootstrap.service';

@Module({
  imports: [
    ConfigModule,
    TelegrafModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        token: configService.getOrThrow<string>('BOT_TOKEN'),
      }),
    }),
  ],
  controllers: [BotController],
  providers: [
    BotService,
    BotUpdate,
    BotStateService,
    BotAdminService,
    BotResultsService,
    BotLeadsService,
    BotCenterInfoService,
    BotCoursesService,
    BotDataBootstrapService,
  ],
  exports: [
    BotService,
    BotAdminService,
    BotResultsService,
    BotLeadsService,
    BotCenterInfoService,
    BotCoursesService,
  ],
})
export class BotModule {}
