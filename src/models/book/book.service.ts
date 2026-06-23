import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaService } from 'src/core/config/prisma.service';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { BookQueryDto } from './dto';

@Injectable()
export class BookService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateBookDto) {
    if (!dto.fileUrl) {
      throw new BadRequestException('fileUrl is required');
    }

    const existingByFileUrl = await this.prisma.book.findUnique({
      where: { fileUrl: dto.fileUrl },
    });

    if (existingByFileUrl) {
      throw new BadRequestException('Bu file bilan book allaqachon mavjud');
    }

    try {
      const created = await this.prisma.book.create({
        data: {
          title: dto.title,
          author: dto.author,
          description: dto.description,
          coverImageUrl: dto.coverImageUrl ?? null,
          fileUrl: dto.fileUrl,
          cefrLevel: dto.cefrLevel,
          isActive: dto.isActive ?? true,
        },
      });

      return {
        success: true,
        message: 'Book created successfully',
        data: created,
      };
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async findAll(query: BookQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: Prisma.BookWhereInput = {};

    if (query.search) {
      where.OR = [
        {
          title: {
            contains: query.search,
          },
        },
        {
          author: {
            contains: query.search,
          },
        },
        {
          description: {
            contains: query.search,
          },
        },
      ];
    }

    if (query.cefrLevel) {
      where.cefrLevel = query.cefrLevel;
    }

    if (query.author) {
      where.author = {
        contains: query.author,
      };
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive === 'true';
    }

    const [data, total] = await Promise.all([
      this.prisma.book.findMany({
        where,
        skip,
        take: limit,
        orderBy: { id: 'desc' },
      }),
      this.prisma.book.count({ where }),
    ]);

    return {
      success: true,
      message: 'Books fetched successfully',
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      },
    };
  }

  async findOne(id: number) {
    const book = await this.prisma.book.findUnique({
      where: { id },
    });

    if (!book) {
      throw new NotFoundException('Book not found');
    }

    return {
      success: true,
      message: 'Book fetched successfully',
      data: book,
    };
  }

  async update(id: number, dto: UpdateBookDto) {
    const existingBook = await this.ensureExists(id);

    if (dto.fileUrl && dto.fileUrl !== existingBook.fileUrl) {
      const existingByFileUrl = await this.prisma.book.findUnique({
        where: { fileUrl: dto.fileUrl },
      });

      if (existingByFileUrl) {
        throw new BadRequestException('Bu file bilan boshqa book mavjud');
      }
    }

    try {
      const updated = await this.prisma.book.update({
        where: { id },
        data: {
          title: dto.title,
          author: dto.author,
          description: dto.description,
          cefrLevel: dto.cefrLevel,
          isActive: dto.isActive,
          fileUrl: dto.fileUrl,
          coverImageUrl: dto.coverImageUrl,
        },
      });

      return {
        success: true,
        message: 'Book updated successfully',
        data: updated,
      };
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async remove(id: number) {
    await this.ensureExists(id);

    const deleted = await this.prisma.book.update({
      where: { id },
      data: {
        isActive: false,
      },
    });

    return {
      success: true,
      message: 'Book deleted successfully',
      data: deleted,
    };
  }

  private async ensureExists(id: number) {
    const book = await this.prisma.book.findUnique({
      where: { id },
    });

    if (!book) {
      throw new NotFoundException('Book not found');
    }

    return book;
  }

  private handlePrismaError(error: unknown): never {
    if (error instanceof PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new BadRequestException('Duplicate value detected');
      }
    }

    throw error;
  }
}