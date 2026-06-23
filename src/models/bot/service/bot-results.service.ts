import { Injectable, NotFoundException } from '@nestjs/common';
import { BotStudentResult } from '@prisma/client';
import { PrismaService } from '../../../core/config/prisma.service';
import { CreateStudentResultDto } from './dto/results-dto/create-student-result.dto';
import { QueryStudentResultsDto } from './dto/results-dto/query-student-results.dto';
import { ExamType } from './exam-type';

@Injectable()
export class BotResultsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateStudentResultDto): Promise<BotStudentResult> {
    return this.prisma.botStudentResult.create({
      data: {
        ...dto,
        examDate: new Date(dto.examDate),
      },
    });
  }

  async findAll(query: QueryStudentResultsDto): Promise<BotStudentResult[]> {
    return this.prisma.botStudentResult.findMany({
      where: {
        examType: query.examType,
        studentFullName: query.search
          ? {
              contains: query.search,
            }
          : undefined,
      },
      orderBy: [{ examDate: 'desc' }, { createdAt: 'desc' }],
      take: query.limit ?? 10,
    });
  }

  async findByExamType(
    examType: ExamType,
    limit = 10,
  ): Promise<BotStudentResult[]> {
    return this.findAll({
      examType,
      limit,
    });
  }

  async findOne(id: number): Promise<BotStudentResult> {
    const result = await this.prisma.botStudentResult.findUnique({
      where: { id },
    });

    if (!result) {
      throw new NotFoundException('Natija topilmadi');
    }

    return result;
  }

  async searchByStudent(query: string, limit = 10): Promise<BotStudentResult[]> {
    return this.findAll({
      search: query,
      limit,
    });
  }

  async getSummary(): Promise<{
    total: number;
    cefrCount: number;
    ieltsCount: number;
  }> {
    const [total, cefrCount, ieltsCount] = await Promise.all([
      this.prisma.botStudentResult.count(),
      this.prisma.botStudentResult.count({
        where: { examType: ExamType.CEFR },
      }),
      this.prisma.botStudentResult.count({
        where: { examType: ExamType.IELTS },
      }),
    ]);

    return {
      total,
      cefrCount,
      ieltsCount,
    };
  }
}

