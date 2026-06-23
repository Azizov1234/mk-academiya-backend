import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from 'src/core/config/prisma.service';
import { UpdateCenterSettingsDto } from './dto';

const DEFAULT_CENTER_SETTINGS = {
  name: 'MK Academy',
  shortName: 'MK Academy',
  logoUrl:
    'https://res.cloudinary.com/dpfbu9aid/image/upload/v1775282809/academy_kaomaq.jpg',
  description:
    "Ingliz tilini CEFR standarti bo'yicha noldan professional darajagacha o'rganish platformasi.",
  aboutText:
    "MK Academy - ingliz tilini noldan C2 darajagacha o'rgatishga ixtisoslashgan ta'lim platformasi. Biz CEFR standartiga asoslangan darsliklar va interaktiv testlar orqali har bir o'quvchiga individual yondashamiz.",
  aboutPoints:
    '["CEFR darajalariga moslashgan darslar (A1 - C2)","IELTS va General English tayyorgarlik","So\'z boyligini SM-2 algoritmi bilan mustahkamlash","Guruh ichida do\'stlar bilan raqobatlashish"]',
  teamMembers:
    '[{"name":"Maqsud Aliyev","role":"IELTS Mentor","image":"https://images.unsplash.com/photo-1560250097-0b93528c311a?w=800&q=80","focus":"Reading va Writing strategiyalari"},{"name":"Nigina Tursunova","role":"Speaking Coach","image":"https://images.unsplash.com/photo-1580894732444-8ecded7900cd?w=800&q=80","focus":"Fluency, pronunciation va confidence"},{"name":"Dilshod Karimov","role":"Academic Coordinator","image":"https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=800&q=80","focus":"Guruhlar, natijalar va o\'quv reja"}]',
  courseTracks:
    '[{"title":"General English","level":"A1 - B2","desc":"Noldan boshlab mustahkam grammatika, so\'z boyligi va speaking asoslari."},{"title":"IELTS Preparation","level":"B1 - C1","desc":"IELTS reading, listening, writing va speaking bo\'yicha intensiv tayyorgarlik."},{"title":"Speaking Club Pro","level":"B1+","desc":"Real suhbat, debate, presentation va IELTS speaking formatlari."}]',
  address: "Toshkent shahri, O'zbekiston",
  phoneNumber: '+998 90 000 00 00',
  workingHours: 'Dushanba - Shanba, 09:00 - 20:00',
  socialLinks: '{"telegram":"","instagram":"","youtube":""}',
  mapEmbedUrl: '',
};

@Injectable()
export class CenterSettingsService {
  private readonly logger = new Logger(CenterSettingsService.name);

  constructor(private readonly prisma: PrismaService) {}

  private isMissingCenterSettingsTable(error: unknown) {
    const prismaError = error as { code?: string; meta?: { table?: string } };
    return (
      prismaError?.code === 'P2021' &&
      String(prismaError?.meta?.table || '').includes('center_settings')
    );
  }

  private buildFallbackSettings() {
    const now = new Date();
    return {
      id: 1,
      isFallback: true,
      ...DEFAULT_CENTER_SETTINGS,
      createdAt: now,
      updatedAt: now,
    };
  }

  private normalizeRecord(record: any) {
    return {
      id: record.id,
      name: record.name || DEFAULT_CENTER_SETTINGS.name,
      shortName:
        record.shortName || record.name || DEFAULT_CENTER_SETTINGS.shortName,
      logoUrl: record.logoUrl || DEFAULT_CENTER_SETTINGS.logoUrl,
      description: record.description || DEFAULT_CENTER_SETTINGS.description,
      aboutText: record.aboutText || DEFAULT_CENTER_SETTINGS.aboutText,
      aboutPoints: record.aboutPoints || DEFAULT_CENTER_SETTINGS.aboutPoints,
      teamMembers: record.teamMembers || DEFAULT_CENTER_SETTINGS.teamMembers,
      courseTracks: record.courseTracks || DEFAULT_CENTER_SETTINGS.courseTracks,
      address: record.address || DEFAULT_CENTER_SETTINGS.address,
      phoneNumber: record.phoneNumber || DEFAULT_CENTER_SETTINGS.phoneNumber,
      workingHours: record.workingHours || DEFAULT_CENTER_SETTINGS.workingHours,
      socialLinks: record.socialLinks || DEFAULT_CENTER_SETTINGS.socialLinks,
      mapEmbedUrl: record.mapEmbedUrl || DEFAULT_CENTER_SETTINGS.mapEmbedUrl,
      updatedAt: record.updatedAt,
      createdAt: record.createdAt,
    };
  }

  private async ensureSettings() {
    try {
      const existing = await this.prisma.centerSettings.findFirst({
        where: { isActive: true },
        orderBy: { id: 'asc' },
      });

      if (existing) return existing;

      return await this.prisma.centerSettings.create({
        data: { ...DEFAULT_CENTER_SETTINGS, isActive: true },
      });
    } catch (error) {
      if (this.isMissingCenterSettingsTable(error)) {
        this.logger.warn('center_settings table missing. Using fallback.');
        return this.buildFallbackSettings();
      }
      throw error;
    }
  }

  async findPublic() {
    const settings = await this.ensureSettings();
    return { success: true, data: this.normalizeRecord(settings) };
  }

  async findPrivate() {
    return this.findPublic();
  }

  async update(dto: UpdateCenterSettingsDto) {
    const current = await this.ensureSettings();

    if ((current as any)?.isFallback) {
      throw new ServiceUnavailableException(
        'Center branding table is not ready yet. Apply the latest Prisma migration first.',
      );
    }

    const data: Record<string, unknown> = {};
    const stringFields: (keyof UpdateCenterSettingsDto)[] = [
      'name',
      'shortName',
      'logoUrl',
      'description',
      'aboutText',
      'aboutPoints',
      'teamMembers',
      'courseTracks',
      'address',
      'phoneNumber',
      'workingHours',
      'socialLinks',
      'mapEmbedUrl',
    ];

    for (const field of stringFields) {
      if (typeof dto[field] === 'string') {
        data[field] = (dto[field] as string).trim() || null;
      }
    }

    // name and shortName must remain non-empty strings
    if (data['name'] === null) delete data['name'];
    if (data['shortName'] === null) delete data['shortName'];

    try {
      const updated = await this.prisma.centerSettings.update({
        where: { id: current.id },
        data,
      });
      return { success: true, data: this.normalizeRecord(updated) };
    } catch (error) {
      if (this.isMissingCenterSettingsTable(error)) {
        throw new ServiceUnavailableException(
          'Center branding table not ready.',
        );
      }
      throw error;
    }
  }
}
