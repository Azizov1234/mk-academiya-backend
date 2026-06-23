import { Module } from '@nestjs/common';
import { UserProfileService } from './user-profile.service';
import { UserProfileController } from './user-profile.controller';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from 'src/core/config/prisma.module';

@Module({
  imports: [JwtModule, PrismaModule],
  controllers: [UserProfileController],
  providers: [UserProfileService],
  exports: [UserProfileService],
})
export class UserProfileModule {}
