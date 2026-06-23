import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/core/config/prisma.service';

export type NotificationPayloadData =
  | Record<string, unknown>
  | string
  | null
  | undefined;

type NotificationRecord = {
  id: number;
  userId: number;
  type: string;
  title: string;
  body: string;
  data: string | null;
  isRead: boolean;
  createdAt: Date;
  isActive: boolean;
};

type CreateNotificationInput = {
  type: string;
  title: string;
  body: string;
  data?: NotificationPayloadData;
};

type CreateNotificationForUserInput = CreateNotificationInput & {
  userId: number;
};

@Injectable()
export class NotificationService {
  constructor(private readonly prisma: PrismaService) {}

  async getMyFeed(
    userId: number,
    options?: {
      limit?: number;
      unreadOnly?: boolean;
    },
  ) {
    const limit = Math.min(Math.max(options?.limit ?? 50, 1), 100);

    const where = {
      userId,
      isActive: true,
      ...(options?.unreadOnly ? { isRead: false } : {}),
    };

    const [items, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      this.prisma.notification.count({
        where: {
          userId,
          isActive: true,
          isRead: false,
        },
      }),
    ]);

    return {
      items: items.map((item) => this.toNotificationDto(item)),
      unreadCount,
    };
  }

  async markAsRead(userId: number, id: number) {
    await this.ensureOwnedNotification(userId, id);

    const notification = await this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });

    return this.toNotificationDto(notification);
  }

  async markAllAsRead(userId: number) {
    await this.prisma.notification.updateMany({
      where: {
        userId,
        isActive: true,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });

    return this.getMyFeed(userId);
  }

  async remove(userId: number, id: number) {
    await this.ensureOwnedNotification(userId, id);

    await this.prisma.notification.update({
      where: { id },
      data: {
        isActive: false,
      },
      select: {
        id: true,
      },
    });

    return {
      id,
    };
  }

  async createForUser(input: CreateNotificationForUserInput) {
    const notification = await this.prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        data: this.serializeData(input.data),
      },
    });

    return this.toNotificationDto(notification);
  }

  async createForUsers(userIds: number[], input: CreateNotificationInput) {
    const uniqueUserIds = Array.from(
      new Set(
        userIds
          .map((userId) => Number(userId))
          .filter((userId) => Number.isInteger(userId) && userId > 0),
      ),
    );

    if (!uniqueUserIds.length) {
      return { count: 0 };
    }

    await this.prisma.notification.createMany({
      data: uniqueUserIds.map((userId) => ({
        userId,
        type: input.type,
        title: input.title,
        body: input.body,
        data: this.serializeData(input.data),
      })),
    });

    return {
      count: uniqueUserIds.length,
    };
  }

  async createMany(entries: CreateNotificationForUserInput[]) {
    if (!entries.length) {
      return { count: 0 };
    }

    await this.prisma.notification.createMany({
      data: entries.map((entry) => ({
        userId: entry.userId,
        type: entry.type,
        title: entry.title,
        body: entry.body,
        data: this.serializeData(entry.data),
      })),
    });

    return {
      count: entries.length,
    };
  }

  private async ensureOwnedNotification(userId: number, id: number) {
    const notification = await this.prisma.notification.findFirst({
      where: {
        id,
        userId,
        isActive: true,
      },
      select: {
        id: true,
      },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return notification;
  }

  private serializeData(data: NotificationPayloadData) {
    if (data === undefined || data === null) {
      return null;
    }

    if (typeof data === 'string') {
      return data;
    }

    return JSON.stringify(data);
  }

  private parseData(raw: string | null) {
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return raw;
    }
  }

  private toNotificationDto(notification: NotificationRecord) {
    return {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      data: this.parseData(notification.data),
      isRead: notification.isRead,
      createdAt: notification.createdAt,
      isActive: notification.isActive,
    };
  }
}
