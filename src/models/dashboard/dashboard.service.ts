import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/config/prisma.service';
import { UserRole } from 'src/core/enums';
import { SystemService } from '../system/system.service';

interface CurrentUser {
  id: number;
  role: string;
}

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly systemService: SystemService,
  ) {}

  private normalizeRole(role?: string | null) {
    return (role || UserRole.STUDENT).toUpperCase();
  }

  private formatShortDate(date?: Date | null) {
    if (!date) {
      return 'No deadline';
    }

    const now = new Date();
    const sameDay = now.toDateString() === date.toDateString();

    if (sameDay) {
      return date.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
      });
    }

    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
    });
  }

  private async getLeaderboardSummary(studentId: number) {
    const leaderboard = await this.prisma.leaderboard
      .findFirst({
        where: { studentId, isActive: true },
        orderBy: { id: 'desc' },
        select: { rank: true, score: true },
      })
      .catch(() => null);

    return {
      rank: leaderboard?.rank ? `#${leaderboard.rank}` : 'Top 10%',
      streak: leaderboard?.score ? Math.max(0, Math.round(leaderboard.score / 100)) : 0,
    };
  }

  private async getStudentStats(currentUser: CurrentUser) {
    const [groupMemberships, pendingHomeworks, personalAverage, totalAttempts, leaderboard] =
      await Promise.all([
        this.prisma.groupMember.findMany({
          where: {
            studentId: currentUser.id,
            isActive: true,
            group: { isActive: true },
          },
          include: {
            group: {
              include: {
                teacher: {
                  select: {
                    fullName: true,
                  },
                },
                _count: {
                  select: {
                    members: true,
                    courses: true,
                    assignments: true,
                  },
                },
              },
            },
          },
          orderBy: { joinedAt: 'desc' },
        }),
        this.prisma.studentTask.count({
          where: {
            studentId: currentUser.id,
            isActive: true,
            status: 'PENDING',
          },
        }),
        this.prisma.testAttempt.aggregate({
          where: { studentId: currentUser.id, isActive: true },
          _avg: { score: true },
        }),
        this.prisma.testAttempt.count({
          where: { studentId: currentUser.id, isActive: true },
        }),
        this.getLeaderboardSummary(currentUser.id),
      ]);

    const myGroups = groupMemberships.map((membership) => ({
      id: membership.group.id,
      name: membership.group.name,
      mentor: membership.group.teacher?.fullName || 'Teacher',
      students: membership.group._count.members,
      courses: membership.group._count.courses,
      assignments: membership.group._count.assignments,
    }));

    const progress = Math.round(Number(personalAverage._avg.score || 0));

    return {
      activeGroups: myGroups.length,
      myGroups,
      pendingHomeworks,
      progress,
      averageResult: progress,
      totalAttempts,
      ...leaderboard,
      system: await this.systemService.getCompactSystemStats(),
    };
  }

  private async getTeacherStats(currentUser: CurrentUser) {
    const [groups, pendingHomeworks, averageResultAggregate, totalStudents] = await Promise.all([
      this.prisma.group.findMany({
        where: { teacherId: currentUser.id, isActive: true },
        include: {
          _count: {
            select: {
              members: true,
              assignments: true,
              courses: true,
            },
          },
          assignments: {
            where: {
              isActive: true,
              dueDate: { not: null },
            },
            select: { dueDate: true },
            orderBy: { dueDate: 'asc' },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.studentTask.count({
        where: {
          isActive: true,
          status: 'PENDING',
          task: {
            assignments: {
              some: {
                isActive: true,
                group: {
                  teacherId: currentUser.id,
                  isActive: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.testAttempt.aggregate({
        where: {
          isActive: true,
          student: {
            groupMemberships: {
              some: {
                isActive: true,
                status: 'ACTIVE',
                group: {
                  teacherId: currentUser.id,
                  isActive: true,
                },
              },
            },
          },
          test: {
            assignments: {
              some: {
                isActive: true,
                group: {
                  teacherId: currentUser.id,
                  isActive: true,
                },
              },
            },
          },
        },
        _avg: { score: true },
      }),
      this.prisma.groupMember.count({
        where: {
          isActive: true,
          group: {
            teacherId: currentUser.id,
            isActive: true,
          },
        },
      }),
    ]);

    const myGroups = groups.map((group) => ({
      id: group.id,
      name: group.name,
      students: group._count.members,
      lessons: `${group._count.assignments}/${Math.max(group._count.assignments, group._count.courses, 1)}`,
      nextLesson: this.formatShortDate(group.assignments[0]?.dueDate),
      status: pendingHomeworks > 0 ? 'Reviewing' : 'Active',
    }));

    return {
      activeGroups: groups.length,
      myGroups,
      totalStudents,
      pendingHomeworks,
      averageResult: Math.round(Number(averageResultAggregate._avg.score || 0)),
      system: await this.systemService.getCompactSystemStats(),
    };
  }

  private async getAdminStats() {
    const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalStudents,
      totalTeachers,
      recentRegistrations,
      activeGroups,
      totalCourses,
      pendingHomeworks,
      averageResultAggregate,
    ] = await Promise.all([
      this.prisma.user.count({
        where: { role: UserRole.STUDENT, isActive: true },
      }),
      this.prisma.user.count({
        where: { role: UserRole.TEACHER, isActive: true },
      }),
      this.prisma.user.count({
        where: {
          role: UserRole.STUDENT,
          isActive: true,
          createdAt: { gte: last30Days },
        },
      }),
      this.prisma.group.count({
        where: { isActive: true },
      }),
      this.prisma.course.count({
        where: { isActive: true },
      }),
      this.prisma.studentTask.count({
        where: {
          isActive: true,
          status: 'PENDING',
        },
      }),
      this.prisma.testAttempt.aggregate({
        where: { isActive: true },
        _avg: { score: true },
      }),
    ]);

    return {
      totalStudents,
      totalTeachers,
      totalCourses,
      recentRegistrations,
      activeGroups,
      pendingHomeworks,
      averageResult: Math.round(Number(averageResultAggregate._avg.score || 0)),
      centerScore: 4.8,
      system: await this.systemService.getCompactSystemStats(),
    };
  }

  private async getSuperadminStats() {
    const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      totalStudents,
      totalTeachers,
      totalAdmins,
      recentRegistrations,
      activeGroups,
      totalCourses,
      pendingHomeworks,
      averageResultAggregate,
      auditLogs,
      system,
    ] = await Promise.all([
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.user.count({ where: { role: UserRole.STUDENT, isActive: true } }),
      this.prisma.user.count({ where: { role: UserRole.TEACHER, isActive: true } }),
      this.prisma.user.count({ where: { role: UserRole.ADMIN, isActive: true } }),
      this.prisma.user.count({
        where: {
          role: UserRole.STUDENT,
          isActive: true,
          createdAt: { gte: last30Days },
        },
      }),
      this.prisma.group.count({ where: { isActive: true } }),
      this.prisma.course.count({ where: { isActive: true } }),
      this.prisma.studentTask.count({
        where: { isActive: true, status: 'PENDING' },
      }),
      this.prisma.testAttempt.aggregate({
        where: { isActive: true },
        _avg: { score: true },
      }),
      this.systemService.getAuditLogs(),
      this.systemService.getCompactSystemStats(),
    ]);

    return {
      totalUsers,
      totalStudents,
      totalTeachers,
      totalAdmins,
      recentRegistrations,
      activeGroups,
      totalCourses,
      pendingHomeworks,
      subscribers: totalStudents,
      averageResult: Math.round(Number(averageResultAggregate._avg.score || 0)),
      auditLogs,
      system,
    };
  }

  async getStats(currentUser: CurrentUser) {
    const role = this.normalizeRole(currentUser.role);

    let data: Record<string, any>;

    switch (role) {
      case UserRole.SUPERADMIN:
        data = await this.getSuperadminStats();
        break;
      case UserRole.ADMIN:
        data = await this.getAdminStats();
        break;
      case UserRole.TEACHER:
        data = await this.getTeacherStats(currentUser);
        break;
      case UserRole.STUDENT:
      default:
        data = await this.getStudentStats(currentUser);
        break;
    }

    return {
      success: true,
      data,
    };
  }
}
