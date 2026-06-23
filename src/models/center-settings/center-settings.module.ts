import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from 'src/core/config/prisma.module';
import { CenterSettingsController } from './center-settings.controller';
import { CenterSettingsService } from './center-settings.service';

@Module({
  imports: [PrismaModule, JwtModule],
  controllers: [CenterSettingsController],
  providers: [CenterSettingsService],
  exports: [CenterSettingsService],
})
export class CenterSettingsModule {}
