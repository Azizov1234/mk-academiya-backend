import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/core/config/prisma.service';
import * as os from 'node:os';

type AuditLogItem = {
  type: string;
  title: string;
  time: string;
  status: string;
  createdAt: Date;
};

@Injectable()
export class SystemService {
  constructor(private readonly prisma: PrismaService) {}

  private formatRelativeTime(date: Date) {
    const diffMs = Date.now() - date.getTime();
    const diffMinutes = Math.max(1, Math.floor(diffMs / 60_000));

    if (diffMinutes < 60) {
      return `${diffMinutes} min ago`;
    }

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    }

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  }

  private getLoadAveragePercent() {
    const cpuCount = os.cpus().length || 1;
    const load = os.loadavg()[0] || 0;
    return Number(Math.min(100, (load / cpuCount) * 100).toFixed(1));
  }

  private async getDatabasePingMs() {
    const startedAt = Date.now();
    await this.prisma.$queryRaw`SELECT 1`;
    return Date.now() - startedAt;
  }

  private async getPersistedSystemStats() {
    return this.prisma.systemStats.findFirst({
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getCompactSystemStats() {
    const [persistedStats, networkMs] = await Promise.all([
      this.getPersistedSystemStats(),
      this.getDatabasePingMs(),
    ]);

    const freeMemGb = Number((os.freemem() / 1024 / 1024 / 1024).toFixed(1));
    const totalMemGb = Number((os.totalmem() / 1024 / 1024 / 1024).toFixed(1));

    return {
      cpuUsage: Number(
        (persistedStats?.cpuUsage ?? this.getLoadAveragePercent()).toFixed(1),
      ),
      ramFree: Number((persistedStats?.ramFree ?? freeMemGb).toFixed(1)),
      ramTotal: totalMemGb,
      diskSpace: Number((persistedStats?.diskSpace ?? 0).toFixed(1)),
      networkMs: persistedStats?.network ?? networkMs,
      uptime: Number((persistedStats?.uptimePerc ?? 99.9).toFixed(1)),
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      updatedAt: persistedStats?.updatedAt ?? new Date(),
    };
  }

  async getAuditLogs(limit = 5) {
    const [recentUsers, recentLeads, recentNotifications] = await Promise.all([
        this.prisma.user.findMany({
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
          take: limit,
          select: {
            fullName: true,
            role: true,
            createdAt: true,
          },
        }),
        this.prisma.lead.findMany({
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
          take: limit,
          select: {
            fullName: true,
            status: true,
            createdAt: true,
          },
        }),
        this.prisma.notification.findMany({
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
          take: limit,
          select: {
            title: true,
            type: true,
            createdAt: true,
          },
        }),
      ]);

    const auditLogs: AuditLogItem[] = [
      ...recentUsers.map((user) => ({
        type: 'Audit',
        title: `New ${user.role.toLowerCase()} registered: ${user.fullName}`,
        time: this.formatRelativeTime(user.createdAt),
        status: 'Success',
        createdAt: user.createdAt,
      })),
      ...recentLeads.map((lead) => ({
        type: 'Lead',
        title: `New lead received: ${lead.fullName}`,
        time: this.formatRelativeTime(lead.createdAt),
        status: lead.status === 'NEW' ? 'Info' : 'Success',
        createdAt: lead.createdAt,
      })),
      ...recentNotifications.map((notification) => ({
        type: notification.type || 'System',
        title: notification.title,
        time: this.formatRelativeTime(notification.createdAt),
        status: 'Info',
        createdAt: notification.createdAt,
      })),
    ]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);

    return auditLogs.map(({ createdAt, ...log }) => log);
  }

  async getHealth() {
    let database = 'connected';

    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      database = 'disconnected';
    }

    return {
      success: true,
      data: {
        status: database === 'connected' ? 'ok' : 'degraded',
        timestamp: new Date(),
        uptimeSeconds: Number(process.uptime().toFixed(0)),
        database,
        nodeVersion: process.version,
        platform: process.platform,
      },
    };
  }

  async getStats() {
    const [system, auditLogs, totalUsers, totalGroups, totalCourses, totalLeads] =
      await Promise.all([
        this.getCompactSystemStats(),
        this.getAuditLogs(),
        this.prisma.user.count({ where: { isActive: true } }),
        this.prisma.group.count({ where: { isActive: true } }),
        this.prisma.course.count({ where: { isActive: true } }),
        this.prisma.lead.count({ where: { isActive: true } }),
      ]);

    return {
      success: true,
      data: {
        system,
        summary: {
          totalUsers,
          totalGroups,
          totalCourses,
          totalLeads,
        },
        auditLogs,
      },
    };
  }
}
