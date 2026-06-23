import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/core/config/prisma.module';
import { SeederService } from './seed.service';
import { SeedService } from './seeds/question.seeder';
import { UserSeeder } from './seeds/user.seeder';

@Module({
  imports: [PrismaModule],
  providers: [SeederService, UserSeeder, SeedService],
})
export class SeedModule {}
