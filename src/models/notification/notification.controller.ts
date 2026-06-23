import {
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { NotificationService } from './notification.service';
import { QueryNotificationDto } from './dto/query-notification.dto';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get notifications for the current user' })
  async findMine(@Req() req: any, @Query() query: QueryNotificationDto) {
    const feed = await this.notificationService.getMyFeed(req.user.id, {
      limit: query.limit,
      unreadOnly: query.unreadOnly,
    });

    return {
      success: true,
      data: feed,
    };
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark one notification as read' })
  async markAsRead(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    const notification = await this.notificationService.markAsRead(
      req.user.id,
      id,
    );

    return {
      success: true,
      data: notification,
    };
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllAsRead(@Req() req: any) {
    const feed = await this.notificationService.markAllAsRead(req.user.id);

    return {
      success: true,
      data: feed,
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete one notification' })
  async remove(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    const result = await this.notificationService.remove(req.user.id, id);

    return {
      success: true,
      data: result,
    };
  }
}
