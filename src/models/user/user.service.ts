import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/config/prisma.service';
import {
  CreateUserDto,
  QueryUserDto,
  UpdateCurrentProfileDto,
  UpdateUserDto,
  QueryUserSuperAdminDto,
} from './dto';
import { Prisma } from '@prisma/client';
import { UserRole } from 'src/core/enums';
import { join } from 'path';
import * as fs from 'fs';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { QueryUserTeacherDto } from './dto/query.teacher.dto';
import { QueryUserAdminDto } from './dto/query.admin.dto';

const USER_LIST_SELECT = {
  id: true,
  fullName: true,
  phone: true,
  avatarUrl: true,
  cefrLevel: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

function getPagination(page?: number, limit?: number) {
  const safePage = Math.max(Number(page) || 1, 1);
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 200);

  return {
    skip: (safePage - 1) * safeLimit,
    take: safeLimit,
  };
}

function applyDirectoryFilters(
  where: Prisma.UserWhereInput,
  query: {
    fullName?: string;
    GroupName?: string;
    isActive?: boolean;
  },
) {
  const fullName = query.fullName?.trim();
  const groupName = query.GroupName?.trim();

  if (fullName) {
    where.fullName = {
      contains: fullName,
      mode: 'insensitive',
    };
  }

  if (typeof query.isActive === 'boolean') {
    where.isActive = query.isActive;
  }

  if (groupName) {
    const groupFilter: Prisma.UserWhereInput = {
      OR: [
        {
          groupsCreated: {
            some: {
              name: {
                contains: groupName,
                mode: 'insensitive',
              },
            },
          },
        },
        {
          groupMemberships: {
            some: {
              group: {
                name: {
                  contains: groupName,
                  mode: 'insensitive',
                },
              },
            },
          },
        },
      ],
    };

    where.AND = Array.isArray(where.AND)
      ? [...where.AND, groupFilter]
      : where.AND
        ? [where.AND, groupFilter]
        : [groupFilter];
  }

  return where;
}

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
          page: query.page,
          limit: query.limit,
          user:
            query.user === UserRole.STUDENT ||
              query.user === UserRole.TEACHER ||
              query.user === UserRole.GLOBAL_USER
              ? query.user
              : undefined,
        });
      case UserRole.TEACHER:
        return this.findAllTeacher(currentUser, {
          fullName: query.fullName,
          page: query.page,
          limit: query.limit,
        });
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

  async findAllSuperAdmin(query: QueryUserSuperAdminDto) {
    try {
      const where = applyDirectoryFilters({}, query);

      if (query.user) {
        where.role = query.user;
      }

      return await this.prisma.user.findMany({
        where,
        ...getPagination(query.page, query.limit),
        orderBy: {
          createdAt: 'desc',
        },
        select: USER_LIST_SELECT,
      });
    } catch (err) {
      console.error('findAllSuperAdmin error:', err);
      throw new BadRequestException(
        'Invalid query parameters or database error',
      );
    }
  }
  async findAllAdmin(query: QueryUserAdminDto) {
    try {
      const where = applyDirectoryFilters(
        {
          role: query.user
            ? query.user
            : {
              notIn: [UserRole.ADMIN, UserRole.SUPERADMIN],
            },
        },
        query,
      );

      return await this.prisma.user.findMany({
        where: {
          ...where,
          role: query.user
            ? query.user
            : {
              notIn: [UserRole.ADMIN, UserRole.SUPERADMIN],
            },
        },
        ...getPagination(query.page, query.limit),
        orderBy: {
          createdAt: 'desc',
        },
        select: USER_LIST_SELECT,
      });
    } catch (err) {
      console.error('findAllAdmin error:', err);
      throw new BadRequestException(
        'Invalid query parameters or database error',
      );
    }
  }

  async findAllTeacher(currentUser: { id: number }, query: QueryUserTeacherDto) {
    try {
      const where = applyDirectoryFilters(
        {
          isActive: true,
          role: UserRole.STUDENT,
          groupMemberships: {
            some: {
              isActive: true,
              group: {
                teacherId: currentUser.id,
              },
            }
          },
        },
        query,
      );

      return await this.prisma.user.findMany({
        where,
        ...getPagination(query.page, query.limit),
        orderBy: {
          fullName: 'asc',
        },
        select: USER_LIST_SELECT,
      });
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

  async update(
    id: number,
    payload: UpdateUserDto,
    currentUser: { id: number; role: UserRole },
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (currentUser.role !== UserRole.SUPERADMIN && currentUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Access denied');
    }

    if (
      currentUser.role === UserRole.ADMIN &&
      (user.role === UserRole.ADMIN || user.role === UserRole.SUPERADMIN)
    ) {
      throw new ForbiddenException('Admin cannot update admin or super admin');
    }

    if (typeof payload.isActive === 'boolean' && currentUser.id === id) {
      throw new ForbiddenException('You cannot change your own status');
    }

    const data: any = {};
    const phone = payload.phone?.trim();
    const fullName = payload.fullName?.trim();
    const password = payload.passwordHash?.trim();

    if (phone && phone !== user.phone) {
      const existingPhone = await this.prisma.user.findUnique({
        where: { phone },
      });

      if (existingPhone && existingPhone.id !== id) {
        throw new BadRequestException('User already exists');
      }

      data.phone = phone;
    }

    if (fullName) {
      data.fullName = fullName;
    }

    if (password) {
      data.passwordHash = await bcrypt.hash(password, 10);
    }

    if (payload.avatarUrl !== undefined) {
      data.avatarUrl = payload.avatarUrl?.trim() || null;
    }

    if (payload.cefrLevel !== undefined) {
      data.cefrLevel = payload.cefrLevel || null;
    }

    if (typeof payload.isActive === 'boolean') {
      data.isActive = payload.isActive;
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('No valid fields provided for update');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        fullName: true,
        phone: true,
        avatarUrl: true,
        cefrLevel: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (typeof payload.isActive === 'boolean') {
      await this.prisma.userProfile.updateMany({
        where: { userId: id },
        data: { isActive: payload.isActive },
      });
    }

    return {
      success: true,
      message: 'User updated successfully',
      data: updatedUser,
    };
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
