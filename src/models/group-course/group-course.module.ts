import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { GroupCourseService } from './group-course.service';
import { GroupCourseController } from './group-course.controller';
import { PrismaModule } from 'src/core/config/prisma.module';

@Module({
  imports: [PrismaModule, JwtModule],
  controllers: [GroupCourseController],
  providers: [GroupCourseService],
})
export class GroupCourseModule {}
