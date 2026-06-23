import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/config/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService
  ) {}

  async login(payload: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: {
        phone: payload.phone
      }
    });

    // console.log(user?.passwordHash, payload.password);
    

    if (!user) {
      throw new BadRequestException('Phone and password do not found');
    }

    const isPasswordValid = await bcrypt.compare(payload.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new BadRequestException('Phone and password do not found');
    }

    if (user.isActive !== true) {
      throw new BadRequestException('User is not active');
    }

    const token = this.jwtService.sign({
      id: user.id,
      phone: user.phone,
      role: user.role
    });

    return {
      success: true,
      token
    };
  }
}
