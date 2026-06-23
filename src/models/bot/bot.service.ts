import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BotLeadRequest, BotStudentResult } from '@prisma/client';
import { InjectBot } from 'nestjs-telegraf';
import { Markup, Telegraf } from 'telegraf';
import {
  ADMIN_MENU,
  FLOW_MENU,
  RESULTS_SUBMENU,
  USER_MENU,
} from './service/menu-buttons';
import { ExamType } from './service/exam-type';

interface PublishResultInput {
  studentFullName: string;
  examType: ExamType;
  scoreOrLevel: string;
  examDate: string;
  certificateImage: string;
  note?: string;
}

interface PublishResultOutput {
  resultsChannelPostLink: string;
  mainChannelPostLink?: string;
}

interface PublishLeadInput {
  fullName: string;
  phone: string;
  courseType?: string;
}

@Injectable()
export class BotService implements OnModuleInit {
  private readonly logger = new Logger(BotService.name);
  private readonly phoneRegex = /^\+998\d{9}$/;

  constructor(
    @InjectBot() private readonly bot: Telegraf,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.bot.telegram.setMyCommands([
      { command: 'start', description: 'Botni ishga tushirish' },
      { command: 'help', description: 'Asosiy yordam va menyu' },
    ]);
    this.logger.log('Telegram bot buyruqlari sozlandi');
  }

  getAdminMenuKeyboard() {
    return Markup.keyboard([
      [ADMIN_MENU.STATS, ADMIN_MENU.LEADS],
      [ADMIN_MENU.CEFR_RESULTS, ADMIN_MENU.IELTS_RESULTS],
      [ADMIN_MENU.STUDENT_SEARCH, ADMIN_MENU.ADD_RESULT],
      [ADMIN_MENU.ADD_ADMIN, ADMIN_MENU.REMOVE_ADMIN],
      [ADMIN_MENU.ADMIN_LIST, ADMIN_MENU.ADD_COURSE],
      [ADMIN_MENU.EDIT_ABOUT, ADMIN_MENU.EDIT_ADDRESS],
      [ADMIN_MENU.EDIT_CONTACT],
      [ADMIN_MENU.USER_MENU],
    ]).resize();
  }

  getUserMenuKeyboard() {
    return Markup.keyboard([
      [USER_MENU.ABOUT],
      [USER_MENU.COURSES, USER_MENU.RESULTS],
      [USER_MENU.ADDRESS, USER_MENU.CONTACT],
      [USER_MENU.LEAD_REQUEST],
    ]).resize();
  }

  getResultsMenuKeyboard() {
    return Markup.keyboard([
      [RESULTS_SUBMENU.CEFR_RESULTS, RESULTS_SUBMENU.IELTS_RESULTS],
      [RESULTS_SUBMENU.BACK],
    ]).resize();
  }

  getCancelKeyboard() {
    return Markup.keyboard([[FLOW_MENU.CANCEL]]).resize();
  }

  getPhoneKeyboard() {
    return Markup.keyboard([
      [Markup.button.contactRequest('Telefon raqam yuborish')],
      [FLOW_MENU.CANCEL],
    ]).resize();
  }

  getCourseStepKeyboard() {
    return Markup.keyboard([[FLOW_MENU.SKIP], [FLOW_MENU.CANCEL]]).resize();
  }

  getExamTypeKeyboard() {
    return Markup.keyboard([
      [FLOW_MENU.EXAM_CEFR, FLOW_MENU.EXAM_IELTS],
      [FLOW_MENU.CANCEL],
    ]).resize();
  }

  buildResultsInlineKeyboard(results: BotStudentResult[]) {
    const buttons = results.map((result) =>
      Markup.button.callback(
        `${this.truncate(result.studentFullName, 18)} | ${result.scoreOrLevel}`,
        `result:${result.id}`,
      ),
    );

    const rows: Array<(typeof buttons)[number][]> = [];
    for (let index = 0; index < buttons.length; index += 2) {
      rows.push(buttons.slice(index, index + 2));
    }

    return Markup.inlineKeyboard(rows);
  }

  buildResultLinkKeyboard(result: BotStudentResult) {
    return Markup.inlineKeyboard([
      [Markup.button.url('Kanal postini ochish', result.channelPostLink)],
    ]);
  }

  formatStatsMessage(stats: {
    total: number;
    cefrCount: number;
    ieltsCount: number;
  }): string {
    return [
      'Statistika',
      '',
      `Jami studentlar: ${stats.total}`,
      `CEFR topshirganlar: ${stats.cefrCount}`,
      `IELTS topshirganlar: ${stats.ieltsCount}`,
    ].join('\n');
  }

  formatResultMessage(result: BotStudentResult): string {
    return [
      result.studentFullName,
      `Imtihon turi: ${this.formatExamType(result.examType)}`,
      `Natija: ${result.scoreOrLevel}`,
      `Sana: ${this.formatDate(result.examDate)}`,
      result.note ? `Izoh: ${result.note}` : null,
      `Post link: ${result.channelPostLink}`,
    ]
      .filter(Boolean)
      .join('\n');
  }

  formatResultsListTitle(examType: ExamType): string {
    return examType === ExamType.CEFR
      ? 'CEFR natijalari'
      : 'IELTS natijalari';
  }

  formatCoursesMessage(
    courses: Array<{ title: string; description: string }>,
  ): string {
    if (courses.length === 0) {
      return 'Hozircha faol kurslar mavjud emas.';
    }

    return [
      'Mavjud kurslar',
      '',
      ...courses.map(
        (course, index) =>
          `${index + 1}. ${course.title}\n${course.description}`,
      ),
    ].join('\n\n');
  }

  formatAboutMessage(aboutText: string): string {
    return `O'quv markaz haqida\n\n${aboutText}`;
  }

  formatAddressMessage(address: string): string {
    return `Manzil\n\n${address}`;
  }

  formatContactMessage(data: {
    phone1: string;
    phone2?: string | null;
    telegramUsername?: string | null;
  }): string {
    return [
      "Bog'lanish",
      '',
      `Telefon 1: ${data.phone1}`,
      data.phone2 ? `Telefon 2: ${data.phone2}` : null,
      data.telegramUsername
        ? `Telegram: ${data.telegramUsername}`
        : 'Telegram: kiritilmagan',
    ]
      .filter(Boolean)
      .join('\n');
  }

  formatLeadsMessage(leads: BotLeadRequest[]): string {
    if (leads.length === 0) {
      return "Hozircha murojaatlar yo'q.";
    }

    return [
      "So'nggi murojaatlar",
      '',
      ...leads.map(
        (lead, index) =>
          `${index + 1}. ${lead.fullName}\nTelefon: ${lead.phone}\nKurs: ${
            lead.courseType ?? "Ko'rsatilmagan"
          }\nVaqt: ${this.formatDateTime(lead.createdAt)}`,
      ),
    ].join('\n\n');
  }

  formatSearchPrompt(): string {
    return "Student ism-familiyasini yuboring. Qisman ism ham bo'lishi mumkin.";
  }

  formatLeadSuccessMessage(): string {
    return "Murojaatingiz qabul qilindi. Tez orada siz bilan bog'lanamiz.";
  }

  formatPublishedLeadMessage(payload: PublishLeadInput): string {
    return [
      'Yangi murojaat',
      '',
      `Ism-familiya: ${payload.fullName}`,
      `Telefon: ${payload.phone}`,
      `Kurs turi: ${payload.courseType ?? "Ko'rsatilmagan"}`,
      `Vaqt: ${this.formatDateTime(new Date())}`,
    ].join('\n');
  }

  formatExamType(examType: string): string {
    if (examType === ExamType.CEFR) {
      return 'CEFR';
    }

    if (examType === ExamType.IELTS) {
      return 'IELTS';
    }

    return examType;
  }

  parseExamTypeButton(text: string): ExamType | null {
    if (text === FLOW_MENU.EXAM_CEFR) {
      return ExamType.CEFR;
    }

    if (text === FLOW_MENU.EXAM_IELTS) {
      return ExamType.IELTS;
    }

    return null;
  }

  normalizePhoneNumber(raw: string): string | null {
    const cleaned = raw.replace(/[^\d+]/g, '');

    if (this.phoneRegex.test(cleaned)) {
      return cleaned;
    }

    if (/^998\d{9}$/.test(cleaned)) {
      return `+${cleaned}`;
    }

    if (/^\d{9}$/.test(cleaned)) {
      return `+998${cleaned}`;
    }

    return null;
  }

  parseExamDate(raw: string): string | null {
    const value = raw.trim().toLowerCase();
    if (value === 'bugun') {
      const today = new Date();
      return new Date(
        Date.UTC(
          today.getUTCFullYear(),
          today.getUTCMonth(),
          today.getUTCDate(),
          12,
        ),
      ).toISOString();
    }

    const dottedDate = /^(\d{2})\.(\d{2})\.(\d{4})$/;
    const isoDate = /^(\d{4})-(\d{2})-(\d{2})$/;

    let year = 0;
    let month = 0;
    let day = 0;

    if (dottedDate.test(value)) {
      const match = value.match(dottedDate);
      day = Number(match?.[1]);
      month = Number(match?.[2]);
      year = Number(match?.[3]);
    } else if (isoDate.test(value)) {
      const match = value.match(isoDate);
      year = Number(match?.[1]);
      month = Number(match?.[2]);
      day = Number(match?.[3]);
    } else {
      return null;
    }

    const parsedDate = new Date(Date.UTC(year, month - 1, day, 12));
    if (
      Number.isNaN(parsedDate.getTime()) ||
      parsedDate.getUTCFullYear() !== year ||
      parsedDate.getUTCMonth() !== month - 1 ||
      parsedDate.getUTCDate() !== day
    ) {
      return null;
    }

    return parsedDate.toISOString();
  }

  getStartUserMessage(): string {
    return [
      "Assalomu alaykum!",
      '',
      "CEFR va IELTS o'quv markazimiz botiga xush kelibsiz.",
      "Pastdagi menyudan kerakli bo'limni tanlang.",
    ].join('\n');
  }

  getStartAdminMessage(): string {
    return [
      'Xush kelibsiz, admin.',
      '',
      "Siz uchun boshqaruv bo'limi ochildi.",
    ].join('\n');
  }

  getNoResultsMessage(examType: ExamType): string {
    return `${this.formatResultsListTitle(examType)} bo'yicha hozircha natijalar topilmadi.`;
  }

  getNoSearchResultsMessage(query: string): string {
    return `"${query}" bo'yicha student topilmadi.`;
  }

  getResultsChannelLink(): string | null {
    const channelId = this.getOptionalChannelId('RESULTS_CHANNEL_ID');
    if (!channelId) {
      return null;
    }

    const normalized = channelId.trim();
    if (normalized.startsWith('@')) {
      return `https://t.me/${normalized.slice(1)}`;
    }

    if (normalized.startsWith('-100')) {
      return `https://t.me/c/${normalized.slice(4)}`;
    }

    if (normalized.startsWith('-')) {
      return `https://t.me/c/${normalized.slice(1)}`;
    }

    return `https://t.me/c/${normalized}`;
  }

  formatAdminListMessage(
    admins: Array<{
      fullName: string;
      telegramUserId?: string | null;
      telegramUsername?: string | null;
    }>,
  ): string {
    if (!admins.length) {
      return "Bazadagi adminlar ro'yxati bo'sh.";
    }

    return [
      "Bazadagi adminlar ro'yxati:",
      '',
      ...admins.map((admin, index) => {
        const identity = admin.telegramUsername
          ? `@${admin.telegramUsername}`
          : admin.telegramUserId
            ? `id:${admin.telegramUserId}`
            : 'unknown';
        return `${index + 1}. ${admin.fullName} (${identity})`;
      }),
    ].join('\n');
  }

  formatPublishedResultCaption(payload: PublishResultInput): string {
    return [
      payload.studentFullName,
      `Imtihon turi: ${this.formatExamType(payload.examType)}`,
      `Natija: ${payload.scoreOrLevel}`,
      `Sana: ${this.formatDate(new Date(payload.examDate))}`,
      payload.note ? `Izoh: ${payload.note}` : null,
    ]
      .filter(Boolean)
      .join('\n');
  }

  formatResultCreatedMessage(result: BotStudentResult): string {
    return [
      'Natija muvaffaqiyatli joylandi.',
      '',
      this.formatResultMessage(result),
    ].join('\n');
  }

  async publishResultToChannels(
    payload: PublishResultInput,
  ): Promise<PublishResultOutput> {
    const resultsChannelId = this.getRequiredChannelId('RESULTS_CHANNEL_ID');

    const sentMessage = await this.bot.telegram.sendPhoto(
      resultsChannelId,
      payload.certificateImage,
      {
        caption: this.formatPublishedResultCaption(payload),
      },
    );

    const resultsChannelPostLink = this.buildChannelPostLink(
      resultsChannelId,
      sentMessage.message_id,
    );

    const mainChannelId = this.getOptionalChannelId('MAIN_CHANNEL_ID');
    if (!mainChannelId || mainChannelId === resultsChannelId) {
      return { resultsChannelPostLink };
    }

    let mainChannelPostLink: string | undefined;
    try {
      const mainMessage = await this.bot.telegram.sendPhoto(
        mainChannelId,
        payload.certificateImage,
        {
          caption: this.formatPublishedResultCaption(payload),
        },
      );
      mainChannelPostLink = this.buildChannelPostLink(
        mainChannelId,
        mainMessage.message_id,
      );
    } catch (error) {
      this.logger.warn(
        `Natijani MAIN_CHANNEL_ID kanaliga yuborib bo'lmadi: ${
          error instanceof Error ? error.message : "noma'lum xatolik"
        }`,
      );
    }

    return {
      resultsChannelPostLink,
      mainChannelPostLink,
    };
  }

  async publishLeadToMainChannel(
    payload: PublishLeadInput,
  ): Promise<string | null> {
    const mainChannelId = this.getOptionalChannelId('MAIN_CHANNEL_ID');
    if (!mainChannelId) {
      return null;
    }

    const sentMessage = await this.bot.telegram.sendMessage(
      mainChannelId,
      this.formatPublishedLeadMessage(payload),
    );

    return this.buildChannelPostLink(mainChannelId, sentMessage.message_id);
  }

  private buildChannelPostLink(channelId: string, messageId: number): string {
    const normalizedChannelId = channelId.trim();

    if (normalizedChannelId.startsWith('@')) {
      return `https://t.me/${normalizedChannelId.slice(1)}/${messageId}`;
    }

    if (normalizedChannelId.startsWith('-100')) {
      return `https://t.me/c/${normalizedChannelId.slice(4)}/${messageId}`;
    }

    if (normalizedChannelId.startsWith('-')) {
      return `https://t.me/c/${normalizedChannelId.slice(1)}/${messageId}`;
    }

    return `https://t.me/c/${normalizedChannelId}/${messageId}`;
  }

  private getRequiredChannelId(configKey: string): string {
    const channelId = this.configService.getOrThrow<string>(configKey).trim();
    if (!channelId) {
      throw new Error(`${configKey} bo'sh bo'lmasligi kerak`);
    }

    return channelId;
  }

  private getOptionalChannelId(configKey: string): string | null {
    const channelId = this.configService.get<string>(configKey)?.trim();
    return channelId ? channelId : null;
  }

  private formatDate(value: Date): string {
    return new Intl.DateTimeFormat('uz-UZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'Asia/Tashkent',
    }).format(value);
  }

  private formatDateTime(value: Date): string {
    return new Intl.DateTimeFormat('uz-UZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Tashkent',
    }).format(value);
  }

  private truncate(value: string, maxLength: number): string {
    if (value.length <= maxLength) {
      return value;
    }

    return `${value.slice(0, maxLength - 3)}...`;
  }
}

