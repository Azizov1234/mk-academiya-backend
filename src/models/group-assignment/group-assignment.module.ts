import { Module } from '@nestjs/common';
import { GroupAssignmentService } from './group-assignment.service';
import { GroupAssignmentController } from './group-assignment.controller';
import { JwtModule } from '@nestjs/jwt';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [JwtModule, NotificationModule],
  controllers: [GroupAssignmentController],
  providers: [GroupAssignmentService],
  exports: [GroupAssignmentService],
})
export class GroupAssignmentModule {}
