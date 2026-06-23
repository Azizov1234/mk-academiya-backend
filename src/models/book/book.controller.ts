import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { mkdirSync } from 'fs';
import { Express } from 'express';

import { BookService } from './book.service';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/role.guard';
import { UserRole } from 'src/core/enums';
import { Roles } from 'src/common/decorators/roles.decorator';
import { validateFile, validateImage } from 'src/common/functions/check.file';
import { BookQueryDto } from './dto';


// enum pathni o'zingdagi joyga mosla
// yoki:
// import { UserRole } from 'src/common/enums/user-role.enum';

function editFileName(
  _req: any,
  file: Express.Multer.File,
  callback: (error: Error | null, filename: string) => void,
) {
  const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  const fileExtName = extname(file.originalname);
  const baseName = file.originalname
    .replace(fileExtName, '')
    .toLowerCase()
    .replace(/\s+/g, '-');

  callback(null, `${baseName}-${uniqueSuffix}${fileExtName}`);
}

const storage = diskStorage({
  destination: (_req, file, callback) => {
    if (file.fieldname === 'coverImage') {
      const uploadPath = join(process.cwd(), 'uploads', 'books', 'covers');
      mkdirSync(uploadPath, { recursive: true });
      return callback(null, uploadPath);
    }

    if (file.fieldname === 'bookFile') {
      const uploadPath = join(process.cwd(), 'uploads', 'books', 'files');
      mkdirSync(uploadPath, { recursive: true });
      return callback(null, uploadPath);
    }

    return callback(new BadRequestException('Unexpected field') as any, '');
  },
  filename: editFileName,
});

@ApiTags('Books')
@Controller('books')
export class BookController {
  constructor(private readonly bookService: BookService) { }

  @Post()
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.SUPERADMIN)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'coverImage', maxCount: 1 },
        { name: 'bookFile', maxCount: 1 },
      ],
      { storage },
    ),
  )
  @ApiBody({
    schema: {
      type: 'object',
      required: ['title', 'bookFile'],
      properties: {
        title: { type: 'string', example: 'Essential Grammar in Use' },
        author: { type: 'string', example: 'Raymond Murphy' },
        description: { type: 'string', example: 'Grammar book for A1-A2 students' },
        cefrLevel: { type: 'string', example: 'A2' },
        isActive: { type: 'boolean', example: true },
        coverImage: { type: 'string', format: 'binary' },
        bookFile: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiOperation({ summary: `${UserRole.ADMIN}, ${UserRole.TEACHER}, ${UserRole.SUPERADMIN}` })
  @ApiResponse({ status: 201, description: 'Book created successfully' })
  create(
    @Body() dto: CreateBookDto,
    @UploadedFiles()
    files: {
      coverImage?: Express.Multer.File[];
      bookFile?: Express.Multer.File[];
    },
  ) {
    const coverImage = files?.coverImage?.[0];
    const bookFile = files?.bookFile?.[0];

    if (!bookFile) {
      throw new BadRequestException('bookFile majburiy');
    }

    if (coverImage) {
      validateImage(coverImage);
      dto.coverImageUrl = `/uploads/books/covers/${coverImage.filename}`;
    }

    validateFile(bookFile);
    dto.fileUrl = `/uploads/books/files/${bookFile.filename}`;

    return this.bookService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all books with search, pagination and filters' })
  @ApiResponse({ status: 200, description: 'Books fetched successfully' })
  findAll(@Query() query: BookQueryDto) {
    return this.bookService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one book by id' })
  @ApiResponse({ status: 200, description: 'Book fetched successfully' })
  @ApiResponse({ status: 404, description: 'Book not found' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.bookService.findOne(id);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.SUPERADMIN)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'coverImage', maxCount: 1 },
        { name: 'bookFile', maxCount: 1 },
      ],
      { storage },
    ),
  )
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string', example: 'Essential Grammar in Use' },
        author: { type: 'string', example: 'Raymond Murphy' },
        description: { type: 'string', example: 'Grammar book for A1-A2 students' },
        cefrLevel: { type: 'string', example: 'A2' },
        isActive: { type: 'boolean', example: true },
        coverImage: { type: 'string', format: 'binary' },
        bookFile: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiOperation({ summary: `${UserRole.ADMIN}, ${UserRole.TEACHER}, ${UserRole.SUPERADMIN}` })
  @ApiResponse({ status: 200, description: 'Book updated successfully' })
  @ApiResponse({ status: 404, description: 'Book not found' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBookDto,
    @UploadedFiles()
    files: {
      coverImage?: Express.Multer.File[];
      bookFile?: Express.Multer.File[];
    },
  ) {
    const coverImage = files?.coverImage?.[0];
    const bookFile = files?.bookFile?.[0];

    if (coverImage) {
      validateImage(coverImage);
      dto.coverImageUrl = `/uploads/books/covers/${coverImage.filename}`;
    }

    if (bookFile) {
      validateFile(bookFile);
      dto.fileUrl = `/uploads/books/files/${bookFile.filename}`;
    }

    return this.bookService.update(id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.SUPERADMIN)
  @ApiOperation({ summary: `${UserRole.ADMIN}, ${UserRole.TEACHER}, ${UserRole.SUPERADMIN}`})
  @ApiResponse({ status: 200, description: 'Book deleted successfully' })
  @ApiResponse({ status: 404, description: 'Book not found' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.bookService.remove(id);
  }
}
