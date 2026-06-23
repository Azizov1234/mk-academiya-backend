import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/config/prisma.service';
import {
  CreateUserDto,
  QueryUserDto,
  UpdateCurrentProfileDto,
  UpdateUserDto,
  QueryUserSuperAdminDto,
} from './dto';
import { User } from '@prisma/client';
import { UserRole } from 'src/core/enums';
import { join } from 'path';
import * as fs from 'fs';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { QueryUserTeacherDto } from './dto/query.teacher.dto';
import { QueryUserAdminDto } from './dto/query.admin.dto';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService, private jwtService: JwtService) { }

  async getCurrentProfile(currentUser: { id: number }) {
    const user = await this.prisma.user.findUnique({
      where: { id: currentUser.id },
      include: {
        profile: true,
      },
    });

    if (!user || !user.isActive) {
      throw new BadRequestException('User profile not found');
    }

    return {
      id: user.id,
      fullName: user.fullName,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      cefrLevel: user.cefrLevel,
      email: user.profile?.email ?? null,
      profile: {
        language: user.profile?.language ?? 'UZ',
        timezone: user.profile?.timezone ?? 'Asia/Tashkent',
        dateOfBirth: user.profile?.dateOfBirth ?? null,
        phone: user.phone,
      },
    };
  }

  async updateCurrentProfile(
    currentUser: { id: number },
    payload: UpdateCurrentProfileDto,
  ) {
    const existingUser = await this.prisma.user.findUnique({
      where: { id: currentUser.id },
      include: {
        profile: true,
      },
    });

    if (!existingUser || !existingUser.isActive) {
      throw new BadRequestException('User profile not found');
    }

    const fullName = payload.fullName?.trim();

    const updatedUser = await this.prisma.user.update({
      where: { id: currentUser.id },
      data: {
        ...(fullName ? { fullName } : {}),
      },
      include: {
        profile: true,
      },
    });

    return {
      success: true,
      data: {
        id: updatedUser.id,
        fullName: updatedUser.fullName,
        phone: updatedUser.phone,
        avatarUrl: updatedUser.avatarUrl,
        cefrLevel: updatedUser.cefrLevel,
        email: updatedUser.profile?.email ?? null,
        profile: {
          language: updatedUser.profile?.language ?? 'UZ',
          timezone: updatedUser.profile?.timezone ?? 'Asia/Tashkent',
          dateOfBirth: updatedUser.profile?.dateOfBirth ?? null,
          phone: updatedUser.phone,
        },
      },
    };
  }

  async findAll(
    currentUser: { id: number; role: UserRole },
    query: QueryUserSuperAdminDto,
  ) {
    switch (currentUser.role) {
      case UserRole.SUPERADMIN:
        return this.findAllSuperAdmin(query);
      case UserRole.ADMIN:
        return this.findAllAdmin({
          fullName: query.fullName,
          GroupName: query.GroupName,
          isActive: query.isActive,
          user:
            query.user === UserRole.STUDENT ||
            query.user === UserRole.TEACHER ||
            query.user === UserRole.GLOBAL_USER
              ? query.user
              : undefined,
        });
      case UserRole.TEACHER:
        return this.findAllTeacher(currentUser, { fullName: query.fullName });
      default:
        throw new ForbiddenException('Sizda foydalanuvchilar ro‘yxatini ko‘rish huquqi yo‘q');
    }
  }

  async createTeacher(payload: CreateUserDto, currentUser: { id: number, role: UserRole }, filename?: string) {

    const phone = await this.prisma.user.findUnique({ where: { phone: payload.phone } });

    if (phone) {
      if (filename) {
        const filePath = join(process.cwd(), 'src', 'uploads', filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
      throw new BadRequestException('User already exists');
    }

    const passHash = await bcrypt.hash(payload.passwordHash, 10);

    const user = await this.prisma.user.create({
      data: {
        ...payload,
        avatarUrl: filename ?? null,
        passwordHash: passHash,
        role: UserRole.TEACHER
      },
      select: {
        id: true,
        fullName: true,
        isActive: true,
        phone: true,
        avatarUrl: true,
        role: true
      }
    })

    await this.prisma.userProfile.create({
      data: {
        userId: user.id,
        isActive: true
      }
    })

    return {
      success: true,
      message: `${UserRole.TEACHER} created successfully`
    }
  }

  async createStudent(payload: CreateUserDto, currentUser: { id: number, role: UserRole }, filename?: string) {

    const phone = await this.prisma.user.findUnique({ where: { phone: payload.phone } });

    if (phone) {
      if (filename) {
        const filePath = join(process.cwd(), 'src', 'uploads', filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
      throw new BadRequestException('User already exists');
    }

    const passHash = await bcrypt.hash(payload.passwordHash, 10);

    const user = await this.prisma.user.create({
      data: {
        ...payload,
        avatarUrl: filename ?? null,
        passwordHash: passHash,
        role: UserRole.STUDENT
      }
    })

    //User profile yaratiladi bir vaqtda
    await this.prisma.userProfile.create({
      data: {
        userId: user.id
      }
    })

    return {
      success: true,
      message: `${UserRole.STUDENT} created successfully`
    }
  }

  async createAdmin(payload: CreateUserDto, currentUser: { id: number, role: UserRole }, filename?: string) {

    const phone = await this.prisma.user.findUnique({ where: { phone: payload.phone } });

    if (phone) {
      if (filename) {
        const filePath = join(process.cwd(), 'src', 'uploads', filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
      throw new BadRequestException('User already exists');
    }

    const passHash = await bcrypt.hash(payload.passwordHash, 10);

    const user = await this.prisma.user.create({
      data: {
        ...payload,
        avatarUrl: filename ?? null,
        passwordHash: passHash,
        role: UserRole.ADMIN
      }
    })

    await this.prisma.userProfile.create({
      data: {
        userId: user.id,
      }
    })

    return {
      success: true,
      message: `${UserRole.ADMIN} created successfully`,
    }
  }

  async findAllSuperAdmin(query: QueryUserSuperAdminDto): Promise<User[]> {
    const page = query.page || 1;
    const limit = query.limit;
    try {
      let users = await this.prisma.user.findMany({
        include: {
          groupsCreated: true,
          groupMemberships: {
            include: {
              group: true,
            },
          },
        },
      });


      if (query.fullName) {
        const search = query.fullName.toLowerCase();
        users = users.filter(user =>
          user.fullName.toLowerCase().includes(search),
        );
      }


      if (query.GroupName) {
        const groupSearch = query.GroupName.toLowerCase();
        users = users.filter(user => {
          // Teacher bo'lsa
          const teacherMatch = user.groupsCreated?.some(group =>
            group.name.toLowerCase().includes(groupSearch),
          );


          const studentMatch = user.groupMemberships?.some(m =>
            m.group.name.toLowerCase().includes(groupSearch),
          );

          return teacherMatch || studentMatch;
        });
      }


      if (query.user) {
        users = users.filter(user => user.role === query.user);
      }


      if (query.isActive !== undefined) {
        users = users.filter(user => user.isActive === query.isActive);
      }

      if (limit) {
        const start = (page - 1) * limit;
        const end = start + limit;
        users = users.slice(start, end);
      }


      users = users.map(user => {
        if (['STUDENT', 'TEACHER', 'ADMIN', 'GLOBAL_USER'].includes(user.role)) {
          return {
            ...user,
            groupsCreated: [],
            groupMemberships: [],
          };
        }
        return user;
      });

      return users;
    } catch (err) {
      console.error('findAllSuperAdmin error:', err);
      throw new BadRequestException(
        'Invalid query parameters or database error',
      );
    }
  }
  async findAllAdmin(query: QueryUserAdminDto) {
    const page = query.page || 1;
    const limit = query.limit;
    try {
      const page = query.page || 1;
      const limit = query.limit || 10;
      const skip = (page - 1) * limit;

      let users = await this.prisma.user.findMany({
        skip,
        take: limit,
        where: {
          role: {
            notIn: [UserRole.ADMIN, UserRole.SUPERADMIN],
          },
        },
        include: {
          groupsCreated: true,
          groupMemberships: {
            include: {
              group: true,
            },
          },
        },
      });

      if (query.fullName) {
        const search = query.fullName.toLowerCase();
        users = users.filter(user =>
          user.fullName.toLowerCase().includes(search),
        );
      }

      if (query.GroupName) {
        const groupSearch = query.GroupName.toLowerCase();

        users = users.filter(user => {
          const teacherMatch = user.groupsCreated?.some(group =>
            group.name.toLowerCase().includes(groupSearch),
          );

          const studentMatch = user.groupMemberships?.some(m =>
            m.group.name.toLowerCase().includes(groupSearch),
          );

          return teacherMatch || studentMatch;
        });
      }

      if (query.user) {
        users = users.filter(user => user.role === query.user);
      }

      if (query.isActive !== undefined) {
        users = users.filter(user => user.isActive === query.isActive);
      }

      if (limit) {
        const start = (page - 1) * limit;
        const end = start + limit;
        users = users.slice(start, end);
      }

      users = users.map(user => {
        if (
          user.role === UserRole.STUDENT ||
          user.role === UserRole.TEACHER ||
          user.role === UserRole.GLOBAL_USER
        ) {
          return {
            ...user,
            groupsCreated: [],
            groupMemberships: [],
          };
        }
        return user;
      });

      return users;
    } catch (err) {
      console.error('findAllAdmin error:', err);
      throw new BadRequestException(
        'Invalid query parameters or database error',
      );
    }
  }

  async findAllTeacher(currentUser: { id: number }, query: QueryUserTeacherDto) {
    const page = query.page || 1;
    const limit = query.limit;
    try {
      let users = await this.prisma.user.findMany({
        where: {
          isActive: true,
          role: UserRole.STUDENT,
          groupMemberships: {
            some: {
              isActive: true,
              group: {
                teacherId: currentUser.id
              }
            }
          }
        }
      });

      if (query.fullName) {
        const search = query.fullName.toLowerCase();
        users = users.filter(user =>
          user.fullName.toLowerCase().includes(search),
        );
      }

      if (limit) {
        const start = (page - 1) * limit;
        const end = start + limit;
        users = users.slice(start, end);
      }

      return users;
    } catch (err) {
      throw new BadRequestException(
        'Invalid query parameters or database error',
      );
    }

  }

  async findOne(id: number, currentUser: { id: number, role: UserRole }) {
    if (currentUser.role === UserRole.SUPERADMIN) {
      return await this.prisma.user.findUnique({ where: { id: id }, include: { groupsCreated: true } });
    }
    if (currentUser.role === UserRole.ADMIN) {
      return this.prisma.user.findFirst({
        where: {
          id,
          role: {
            notIn: [UserRole.ADMIN, UserRole.SUPERADMIN],
          },
        },
        include: { groupsCreated: true },
      });
    }

    return await this.prisma.user.findUnique({ where: { id: id, groupsCreated: { some: { teacherId: currentUser.id } } } });
  }

  async remove(id: number, currentUser: { id: number; role: UserRole }) {

    const user = await this.prisma.user.findFirst({
      where: { id, isActive: true },
    });

    if (!user || !user.isActive) {
      throw new BadRequestException('User not found or already deleted');
    }

    if (currentUser.id === id) {
      throw new ForbiddenException('You cannot delete yourself');
    }

    if (currentUser.role === UserRole.SUPERADMIN) {
      return await this.prisma.user.update({
        where: { id },
        data: { isActive: false },
      });
    }

    if (currentUser.role === UserRole.ADMIN) {
      if (
        user.role === UserRole.ADMIN ||
        user.role === UserRole.SUPERADMIN
      ) {
        throw new ForbiddenException(
          'Admin cannot delete admin or super admin',
        );
      }

      await this.prisma.userProfile.update({
        where: { userId: id },
        data: { isActive: false },
      });

      await this.prisma.user.update({
        where: { id },
        data: { isActive: false },
      });

      return {
        success: true,
        message: 'User deleted successfully'
      };
    }
    throw new ForbiddenException('Access denied');
  }

  async active(id: number, currentUser: { id: number; role: UserRole }) {

    const user = await this.prisma.user.findFirst({
      where: { id, isActive: false }
    });

    if (!user) {
      throw new BadRequestException('User not found or already active');
    }

    if (currentUser.id === id) {
      throw new ForbiddenException('You cannot activate yourself');
    }

    if (currentUser.role === UserRole.SUPERADMIN) {
      await this.prisma.userProfile.update({
        where: { userId: id },
        data: { isActive: true },
      })
      await this.prisma.user.update({
        where: { id },
        data: { isActive: true },
      });

      return {
        success: true,
        message: 'User activated successfully'
      };
    }

    if (currentUser.role === UserRole.ADMIN) {
      if (
        user.role === UserRole.ADMIN ||
        user.role === UserRole.SUPERADMIN
      ) {
        throw new ForbiddenException(
          'Admin cannot active admin or super admin',
        );
      }

      await this.prisma.userProfile.update({
        where: { userId: id },
        data: { isActive: true },
      })

      await this.prisma.user.update({
        where: { id },
        data: { isActive: true },
      });

      return {
        success: true,
        message: 'User activated successfully'
      };
    }

    throw new ForbiddenException('Access denied');
  }
}
