import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from 'src/core/config/prisma.module';
import { SystemModule } from '../system/system.module';

@Module({
  imports: [JwtModule, PrismaModule, SystemModule],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [JwtModule]
})
export class DashboardModule { }
