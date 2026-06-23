import { Injectable, Logger } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'src/core/config/prisma.service';
import { UserRole } from 'src/core/enums';

@Injectable()
export class UserSeeder {
  private readonly logger = new Logger(UserSeeder.name);

  constructor(private readonly prisma: PrismaService) {}

  async seedUsers(): Promise<void> {
    const phone = '998999992000';
    const password = process.env.SUPERADMIN_PASSWORD || 'mcacademy';
    const passwordHash = await bcrypt.hash(password, 10);

    const superAdmin = await this.prisma.user.upsert({
      where: { phone },
      update: {
        fullName: 'SUPERADMIN',
        passwordHash,
        role: UserRole.SUPERADMIN,
        avatarUrl: null,
        isActive: true,
      },
      create: {
        fullName: 'SUPERADMIN',
        phone,
        passwordHash,
        role: UserRole.SUPERADMIN,
        avatarUrl: null,
        isActive: true,
      },
      select: { id: true },
    });

    await this.prisma.userProfile.upsert({
      where: { userId: superAdmin.id },
      update: { isActive: true },
      create: { userId: superAdmin.id, isActive: true },
    });

    this.logger.log('SUPERADMIN seed synced');
  }
}
