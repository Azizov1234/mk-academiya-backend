import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/config/prisma.service';
import { CreateUserProfileDto, UpdateUserProfileDto } from './dto';
import { UserRole } from 'src/core/enums';
import { join } from 'path';
import * as fs from 'fs';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserProfileService {
  constructor(private prisma: PrismaService) { }

  async create(dto: CreateUserProfileDto) {
    return this.prisma.userProfile.create({ data: dto as any });
  }

  async findMe(currentUser: { id: number }) {
    const userProfile = await this.prisma.userProfile.findUnique({
      where: { userId: currentUser.id, user: { isActive: true } },
      select: {
        id: true,
        email: true,
        dateOfBirth: true,
        language: true,
        timezone: true,
        user: {
          select: {
            id: true,
            phone: true,
            fullName: true,
            avatarUrl: true,
            cefrLevel: true
          }
        }
      }
    });

    if (!userProfile) {
      throw new BadRequestException('User profile not found');
    }
    return userProfile;
  }

  async update(payload: UpdateUserProfileDto, currentUser: { id: number }, filename?: string) {
    const userProfile = await this.prisma.userProfile.findUnique({
      where: { userId: currentUser.id, user: { isActive: true } },
      select: {
        id: true,
        email: true,
        dateOfBirth: true,
        language: true,
        timezone: true,
        user: {
          select: {
            id: true,
            phone: true,
            passwordHash: true,
            fullName: true,
            avatarUrl: true,
            cefrLevel: true
          }
        }
      }
    });

    if (!userProfile) {
      if (filename) {
        const filePath = join(process.cwd(), 'src', 'uploads', filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
      throw new BadRequestException('User profile not found');
    }
    
    let photo = userProfile.user.avatarUrl
    if (filename) {
      if (userProfile.user.avatarUrl) {
        const filePath = join(process.cwd(), 'src', 'uploads', userProfile.user.avatarUrl);
        await fs.unlinkSync(filePath);
      }
      photo = filename;
    }

    let passHash = userProfile.user.passwordHash;
    if (payload.passwordHash?.trim()) {
      passHash = await bcrypt.hash(payload.passwordHash.trim(), 10);
    }

    let fullname = userProfile.user.fullName;
    if (payload.fullName?.trim()) {
      fullname = payload.fullName.trim()
    }

    let telefon = userProfile.user.phone;
    if (payload.phone?.trim()) {
      telefon = payload.phone.trim()
    }

    let pochta = userProfile.email;
    if (payload.email?.trim()) {
      pochta = payload.email.trim()
    }

    let tugulgan = userProfile.dateOfBirth;
    if (payload.dateOfBirth) {
      tugulgan = new Date(payload.dateOfBirth)
    }

    let til = userProfile.language;
    if (payload.language?.trim()) {
      til = payload.language.trim().toUpperCase()
    }

    await this.prisma.user.update({
      where: { id: currentUser.id },
      data: {
        fullName : fullname,
        avatarUrl: photo,
        passwordHash: passHash,
        phone: telefon
      },
    })

    await this.prisma.userProfile.update({
      where: { id: userProfile.id },
      data: {
        userId: currentUser.id,
        email: pochta,
        dateOfBirth: tugulgan,
        language: til
      },
    })

    return {
      success: true,
      message: 'User profile updated successfully'
    }
  }
}
