import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/config/prisma.service';
import { CreateVocabularyDto, UpdateVocabularyDto, QueryVocabularyDto } from './dto';

@Injectable()
export class VocabularyService {
  private readonly logger = new Logger(VocabularyService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Free Dictionary API dan audio URL ni avtomatik olish
   * https://dictionaryapi.dev/ — bepul, API kalit kerak emas
   */
  private async fetchAudioFromDictionary(word: string): Promise<string | null> {
    try {
      const response = await fetch(
        `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`,
      );

      if (!response.ok) return null;

      const data: any[] = await response.json();
      const phonetics: any[] = data[0]?.phonetics ?? [];

      // Audio URL bo'lgan birinchi fonetikani topish
      const audioUrl = phonetics.find((p) => p.audio && p.audio.trim() !== '')?.audio ?? null;

      if (audioUrl) {
        this.logger.log(`Audio topildi: "${word}" → ${audioUrl}`);
      } else {
        this.logger.warn(`"${word}" uchun audio topilmadi (Free Dictionary API)`);
      }

      return audioUrl;
    } catch (error) {
      // Tarmoq xatosi yoki API ishlamasa — xato chiqarmasdan davom etamiz
      this.logger.error(`Free Dictionary API xatosi ("${word}"): ${error.message}`);
      return null;
    }
  }

  async create(dto: CreateVocabularyDto) {
    // Agar admin audio URL bergan bo'lsa — u ishlatiladi
    // Agar berilmagan bo'lsa — Free Dictionary API dan avtomatik olinadi
    if (!dto.audioUrl) {
      dto.audioUrl = (await this.fetchAudioFromDictionary(dto.word)) ?? undefined;
    }

    return this.prisma.vocabulary.create({ data: dto });
  }

  async findAll(query: QueryVocabularyDto) {
    const { page = 1, limit = 20, cefrLevel, difficulty, partOfSpeech, search } = query;
    const skip = (page - 1) * limit;

    const where: any = { isActive: true };

    if (cefrLevel) where.cefrLevel = cefrLevel;
    if (difficulty) where.difficulty = difficulty;
    if (partOfSpeech) where.partOfSpeech = partOfSpeech;
    if (search) {
      where.OR = [
        { word: { contains: search } },
        { translation: { contains: search } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.vocabulary.findMany({
        where,
        skip,
        take: limit,
        orderBy: { word: 'asc' },
      }),
      this.prisma.vocabulary.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const vocab = await this.prisma.vocabulary.findUnique({ where: { id } });
    if (!vocab || !vocab.isActive) throw new NotFoundException("So'z topilmadi");
    return vocab;
  }

  async update(id: number, dto: UpdateVocabularyDto) {
    await this.findOne(id);
    return this.prisma.vocabulary.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.vocabulary.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
