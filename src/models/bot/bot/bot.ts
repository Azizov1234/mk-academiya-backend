import { Logger } from '@nestjs/common';
import { Action, Ctx, Hears, Help, On, Start, Update } from 'nestjs-telegraf';
import { BotStudentResult } from '@prisma/client';
import { Context } from 'telegraf';
import { BotAdminService } from '../service/bot-admin.service';
import {
  ADMIN_MENU,
  FLOW_MENU,
  KNOWN_BUTTONS,
  RESULTS_SUBMENU,
  USER_MENU,
} from '../service/menu-buttons';
import { BotCenterInfoService } from '../service/bot-center-info.service';
import { BotCoursesService } from '../service/bot-courses.service';
import { CreateLeadRequestDto } from '../service/dto/leads-dto/create-lead-request.dto';
import { BotLeadsService } from '../service/bot-leads.service';
import { BotResultsService } from '../service/bot-results.service';
import { BotService } from '../bot.service';
import { BotStateService } from '../service/bot-state.service';
import { ExamType } from '../service/exam-type';

type BotContext = Context & {
  match?: RegExpExecArray;
  message?: Record<string, unknown>;
  callbackQuery?: Record<string, unknown>;
};

@Update()
export class BotUpdate {
  private readonly logger = new Logger(BotUpdate.name);

  constructor(
    private readonly botService: BotService,
    private readonly botStateService: BotStateService,
    private readonly adminService: BotAdminService,
    private readonly resultsService: BotResultsService,
    private readonly leadsService: BotLeadsService,
    private readonly centerInfoService: BotCenterInfoService,
    private readonly coursesService: BotCoursesService,
  ) {}

  @Start()
  async onStart(@Ctx() ctx: BotContext): Promise<void> {
    await this.runSafely(ctx, async () => {
      this.botStateService.clear(this.getUserId(ctx));
      const isAdmin = await this.adminService.isAdmin(
        this.getAdminIdentity(ctx),
      );

      if (isAdmin) {
        await ctx.reply(
          this.botService.getStartAdminMessage(),
          this.botService.getAdminMenuKeyboard(),
        );
        return;
      }

      await ctx.reply(
        this.botService.getStartUserMessage(),
        this.botService.getUserMenuKeyboard(),
      );
    });
  }

  @Help()
  async onHelp(@Ctx() ctx: BotContext): Promise<void> {
    await this.onStart(ctx);
  }

  @Hears(ADMIN_MENU.STATS)
  async showStats(@Ctx() ctx: BotContext): Promise<void> {
    await this.runSafely(ctx, async () => {
      if (!(await this.assertAdmin(ctx))) {
        return;
      }

      this.botStateService.clear(this.getUserId(ctx));
      const stats = await this.adminService.getStats();
      await ctx.reply(this.botService.formatStatsMessage(stats));
    });
  }

  @Hears(ADMIN_MENU.STUDENT_SEARCH)
  async requestStudentSearch(@Ctx() ctx: BotContext): Promise<void> {
    await this.runSafely(ctx, async () => {
      if (!(await this.assertAdmin(ctx))) {
        return;
      }

      this.botStateService.clear(this.getUserId(ctx));
      this.botStateService.setStep(this.getUserId(ctx), 'student_search');
      await ctx.reply(
        this.botService.formatSearchPrompt(),
        this.botService.getCancelKeyboard(),
      );
    });
  }

  @Hears(ADMIN_MENU.ADD_RESULT)
  async startResultCreateFlow(@Ctx() ctx: BotContext): Promise<void> {
    await this.runSafely(ctx, async () => {
      if (!(await this.assertAdmin(ctx))) {
        return;
      }

      this.botStateService.clear(this.getUserId(ctx));
      this.botStateService.setStep(this.getUserId(ctx), 'result_student_name');
      await ctx.reply(
        "Yangi natija joylash boshlandi.\n\n1. O'quvchi ism-familiyasini yuboring.",
        this.botService.getCancelKeyboard(),
      );
    });
  }

  @Hears(ADMIN_MENU.LEADS)
  async showLeads(@Ctx() ctx: BotContext): Promise<void> {
    await this.runSafely(ctx, async () => {
      if (!(await this.assertAdmin(ctx))) {
        return;
      }

      this.botStateService.clear(this.getUserId(ctx));
      const leads = await this.adminService.getRecentLeads(10);
      await ctx.reply(this.botService.formatLeadsMessage(leads));
    });
  }

  @Hears(ADMIN_MENU.EDIT_ABOUT)
  async startEditAbout(@Ctx() ctx: BotContext): Promise<void> {
    await this.runSafely(ctx, async () => {
      if (!(await this.assertAdmin(ctx))) {
        return;
      }

      this.botStateService.clear(this.getUserId(ctx));
      this.botStateService.setStep(this.getUserId(ctx), 'admin_edit_about');
      await ctx.reply(
        "Yangi 'Haqimizda' matnini yuboring.",
        this.botService.getCancelKeyboard(),
      );
    });
  }

  @Hears(ADMIN_MENU.EDIT_ADDRESS)
  async startEditAddress(@Ctx() ctx: BotContext): Promise<void> {
    await this.runSafely(ctx, async () => {
      if (!(await this.assertAdmin(ctx))) {
        return;
      }

      this.botStateService.clear(this.getUserId(ctx));
      this.botStateService.setStep(this.getUserId(ctx), 'admin_edit_address');
      await ctx.reply(
        'Yangi manzil matnini yuboring.',
        this.botService.getCancelKeyboard(),
      );
    });
  }

  @Hears(ADMIN_MENU.EDIT_CONTACT)
  async startEditContact(@Ctx() ctx: BotContext): Promise<void> {
    await this.runSafely(ctx, async () => {
      if (!(await this.assertAdmin(ctx))) {
        return;
      }

      this.botStateService.clear(this.getUserId(ctx));
      this.botStateService.setStep(this.getUserId(ctx), 'admin_edit_contact');
      await ctx.reply(
        "Bog'lanish ma'lumotini quyidagi formatda yuboring:\n+998901234567, +998971112233, @yourusername\n\nphone2 yoki username bo'sh bo'lsa '-' deb yuboring.",
        this.botService.getCancelKeyboard(),
      );
    });
  }

  @Hears(ADMIN_MENU.ADD_COURSE)
  async startAddCourse(@Ctx() ctx: BotContext): Promise<void> {
    await this.runSafely(ctx, async () => {
      if (!(await this.assertAdmin(ctx))) {
        return;
      }

      this.botStateService.clear(this.getUserId(ctx));
      this.botStateService.setStep(this.getUserId(ctx), 'admin_course_title');
      await ctx.reply(
        "Yangi kurs nomini yuboring.",
        this.botService.getCancelKeyboard(),
      );
    });
  }

  @Hears(ADMIN_MENU.ADMIN_LIST)
  async showAdminList(@Ctx() ctx: BotContext): Promise<void> {
    await this.runSafely(ctx, async () => {
      if (!(await this.assertAdmin(ctx))) {
        return;
      }

      this.botStateService.clear(this.getUserId(ctx));
      const admins = await this.adminService.findAllAdmins();
      await ctx.reply(this.botService.formatAdminListMessage(admins));
      await ctx.reply(
        'Admin menyu ochiq.',
        this.botService.getAdminMenuKeyboard(),
      );
    });
  }

  @Hears(ADMIN_MENU.ADD_ADMIN)
  async startAddAdminFlow(@Ctx() ctx: BotContext): Promise<void> {
    await this.runSafely(ctx, async () => {
      if (!(await this.assertAdmin(ctx))) {
        return;
      }

      this.botStateService.clear(this.getUserId(ctx));
      this.botStateService.setStep(this.getUserId(ctx), 'admin_add_username');
      await ctx.reply(
        "Admin qilinadigan username ni yuboring.\nMasalan: @username",
        this.botService.getCancelKeyboard(),
      );
    });
  }

  @Hears(ADMIN_MENU.REMOVE_ADMIN)
  async startRemoveAdminFlow(@Ctx() ctx: BotContext): Promise<void> {
    await this.runSafely(ctx, async () => {
      if (!(await this.assertAdmin(ctx))) {
        return;
      }

      this.botStateService.clear(this.getUserId(ctx));
      this.botStateService.setStep(
        this.getUserId(ctx),
        'admin_remove_username',
      );
      await ctx.reply(
        "O'chiriladigan admin username ni yuboring.\nMasalan: @username",
        this.botService.getCancelKeyboard(),
      );
    });
  }

  @Hears(ADMIN_MENU.USER_MENU)
  async openUserMenu(@Ctx() ctx: BotContext): Promise<void> {
    await this.runSafely(ctx, async () => {
      this.botStateService.clear(this.getUserId(ctx));
      await ctx.reply(
        "User menyu ochildi. Admin panelga qaytish uchun /start ni bosing.",
        this.botService.getUserMenuKeyboard(),
      );
    });
  }

  @Hears(USER_MENU.ABOUT)
  async showAbout(@Ctx() ctx: BotContext): Promise<void> {
    await this.runSafely(ctx, async () => {
      this.botStateService.clear(this.getUserId(ctx));
      const centerInfo = await this.centerInfoService.getCenterInfo();
      await ctx.reply(this.botService.formatAboutMessage(centerInfo.aboutText));
    });
  }

  @Hears(USER_MENU.COURSES)
  async showCourses(@Ctx() ctx: BotContext): Promise<void> {
    await this.runSafely(ctx, async () => {
      this.botStateService.clear(this.getUserId(ctx));
      const courses = await this.coursesService.findActive();
      await ctx.reply(this.botService.formatCoursesMessage(courses));
    });
  }

  @Hears(USER_MENU.RESULTS)
  async openResultsMenu(@Ctx() ctx: BotContext): Promise<void> {
    await this.runSafely(ctx, async () => {
      this.botStateService.clear(this.getUserId(ctx));
      await ctx.reply(
        'Natija turini tanlang:',
        this.botService.getResultsMenuKeyboard(),
      );

      const channelLink = this.botService.getResultsChannelLink();
      if (channelLink) {
        await ctx.reply(`Natijalar kanal linki:\n${channelLink}`);
      }
    });
  }

  @Hears(USER_MENU.ADDRESS)
  async showAddress(@Ctx() ctx: BotContext): Promise<void> {
    await this.runSafely(ctx, async () => {
      this.botStateService.clear(this.getUserId(ctx));
      const centerInfo = await this.centerInfoService.getCenterInfo();
      await ctx.reply(this.botService.formatAddressMessage(centerInfo.address));
    });
  }

  @Hears(USER_MENU.CONTACT)
  async showContact(@Ctx() ctx: BotContext): Promise<void> {
    await this.runSafely(ctx, async () => {
      this.botStateService.clear(this.getUserId(ctx));
      const centerInfo = await this.centerInfoService.getCenterInfo();
      await ctx.reply(this.botService.formatContactMessage(centerInfo));
    });
  }

  @Hears(USER_MENU.LEAD_REQUEST)
  async startLeadFlow(@Ctx() ctx: BotContext): Promise<void> {
    await this.runSafely(ctx, async () => {
      this.botStateService.clear(this.getUserId(ctx));
      this.botStateService.setStep(this.getUserId(ctx), 'lead_full_name');
      await ctx.reply(
        "Iltimos, ism va familiyangizni yuboring.",
        this.botService.getCancelKeyboard(),
      );
    });
  }

  @Hears(RESULTS_SUBMENU.BACK)
  async goBackFromResults(@Ctx() ctx: BotContext): Promise<void> {
    await this.runSafely(ctx, async () => {
      this.botStateService.clear(this.getUserId(ctx));
      const isAdmin = await this.adminService.isAdmin(
        this.getAdminIdentity(ctx),
      );
      await ctx.reply(
        isAdmin
          ? 'Asosiy admin menyu qayta ochildi.'
          : 'Asosiy menyu qayta ochildi.',
        isAdmin
          ? this.botService.getAdminMenuKeyboard()
          : this.botService.getUserMenuKeyboard(),
      );
    });
  }

  @Hears(RESULTS_SUBMENU.CEFR_RESULTS)
  @Hears(ADMIN_MENU.CEFR_RESULTS)
  async showCefrResults(@Ctx() ctx: BotContext): Promise<void> {
    await this.sendResultsList(ctx, ExamType.CEFR);
  }

  @Hears(RESULTS_SUBMENU.IELTS_RESULTS)
  @Hears(ADMIN_MENU.IELTS_RESULTS)
  async showIeltsResults(@Ctx() ctx: BotContext): Promise<void> {
    await this.sendResultsList(ctx, ExamType.IELTS);
  }

  @Action(/result:(\d+)/)
  async showResultDetails(@Ctx() ctx: BotContext): Promise<void> {
    await this.runSafely(ctx, async () => {
      const resultId = Number(ctx.match?.[1]);
      const result = await this.resultsService.findOne(resultId);
      const isAdmin = await this.adminService.isAdmin(
        this.getAdminIdentity(ctx),
      );
      const intro = isAdmin ? "Mana shu o'quvchi:" : 'Tanlangan natija:';

      await ctx.answerCbQuery();
      await this.sendResultCard(ctx, result, intro);
    });
  }

  @On('contact')
  async onContact(@Ctx() ctx: BotContext): Promise<void> {
    await this.runSafely(ctx, async () => {
      const session = this.botStateService.getSession(this.getUserId(ctx));
      if (session.step !== 'lead_phone') {
        return;
      }

      const contact = (ctx.message as { contact?: { phone_number?: string } })
        ?.contact;

      if (!contact?.phone_number) {
        await ctx.reply("Telefon raqamni o'qib bo'lmadi. Qayta yuboring.");
        return;
      }

      await this.handleLeadPhone(ctx, contact.phone_number);
    });
  }

  @On('photo')
  async onPhoto(@Ctx() ctx: BotContext): Promise<void> {
    await this.runSafely(ctx, async () => {
      const session = this.botStateService.getSession(this.getUserId(ctx));
      if (session.step !== 'result_certificate') {
        return;
      }

      const photos = (ctx.message as { photo?: Array<{ file_id: string }> })
        ?.photo;
      const fileId = photos?.[photos.length - 1]?.file_id;

      if (!fileId) {
        await ctx.reply(
          "Rasmni o'qib bo'lmadi. Iltimos, qayta yuboring.",
          this.botService.getCancelKeyboard(),
        );
        return;
      }

      await this.handleResultCertificate(ctx, fileId);
    });
  }

  @On('document')
  async onDocument(@Ctx() ctx: BotContext): Promise<void> {
    await this.runSafely(ctx, async () => {
      const session = this.botStateService.getSession(this.getUserId(ctx));
      if (session.step !== 'result_certificate') {
        return;
      }

      await ctx.reply(
        "Iltimos, sertifikatni oddiy rasm ko'rinishida yuboring. File sifatida emas.",
        this.botService.getCancelKeyboard(),
      );
    });
  }

  @On('text')
  async onText(@Ctx() ctx: BotContext): Promise<void> {
    await this.runSafely(ctx, async () => {
      const text = this.getMessageText(ctx);
      if (!text) {
        return;
      }

      const session = this.botStateService.getSession(this.getUserId(ctx));

      if (text === FLOW_MENU.CANCEL) {
        await this.cancelFlow(ctx);
        return;
      }

      if (session.step === 'lead_course_type' && text === FLOW_MENU.SKIP) {
        await this.handleLeadCourseType(ctx, text);
        return;
      }

      if (session.step === 'result_note' && text === FLOW_MENU.SKIP) {
        await this.handleResultNote(ctx, text);
        return;
      }

      if (session.step === 'result_exam_type') {
        const examType = this.botService.parseExamTypeButton(text);
        if (examType) {
          await this.handleResultExamType(ctx, examType);
          return;
        }

        await ctx.reply(
          "Imtihon turini pastdagi tugmalar orqali tanlang.",
          this.botService.getExamTypeKeyboard(),
        );
        return;
      }

      if (session.step === 'result_certificate') {
        await ctx.reply(
          "Iltimos, sertifikat rasmini oddiy photo qilib yuboring.",
          this.botService.getCancelKeyboard(),
        );
        return;
      }

      if (KNOWN_BUTTONS.has(text) || text.startsWith('/')) {
        return;
      }

      if (session.step === 'lead_full_name') {
        await this.handleLeadFullName(ctx, text);
        return;
      }

      if (session.step === 'lead_phone') {
        await this.handleLeadPhone(ctx, text);
        return;
      }

      if (session.step === 'lead_course_type') {
        await this.handleLeadCourseType(ctx, text);
        return;
      }

      if (session.step === 'admin_edit_about') {
        await this.handleAdminEditAbout(ctx, text);
        return;
      }

      if (session.step === 'admin_edit_address') {
        await this.handleAdminEditAddress(ctx, text);
        return;
      }

      if (session.step === 'admin_edit_contact') {
        await this.handleAdminEditContact(ctx, text);
        return;
      }

      if (session.step === 'admin_course_title') {
        await this.handleAdminCourseTitle(ctx, text);
        return;
      }

      if (session.step === 'admin_course_description') {
        await this.handleAdminCourseDescription(ctx, text);
        return;
      }

      if (session.step === 'student_search') {
        await this.handleStudentSearch(ctx, text);
        return;
      }

      if (session.step === 'admin_add_username') {
        await this.handleAdminAddUsername(ctx, text);
        return;
      }

      if (session.step === 'admin_remove_username') {
        await this.handleAdminRemoveUsername(ctx, text);
        return;
      }

      if (session.step === 'result_student_name') {
        await this.handleResultStudentName(ctx, text);
        return;
      }

      if (session.step === 'result_score') {
        await this.handleResultScore(ctx, text);
        return;
      }

      if (session.step === 'result_exam_date') {
        await this.handleResultExamDate(ctx, text);
        return;
      }

      if (session.step === 'result_note') {
        await this.handleResultNote(ctx, text);
        return;
      }

      const isAdmin = await this.adminService.isAdmin(
        this.getAdminIdentity(ctx),
      );
      await ctx.reply(
        "Buyruq tushunilmadi. Menyudagi tugmalardan foydalaning.",
        isAdmin
          ? this.botService.getAdminMenuKeyboard()
          : this.botService.getUserMenuKeyboard(),
      );
    });
  }

  private async sendResultsList(
    ctx: BotContext,
    examType: ExamType,
  ): Promise<void> {
    await this.runSafely(ctx, async () => {
      this.botStateService.clear(this.getUserId(ctx));
      const results = await this.resultsService.findByExamType(examType, 10);

      if (results.length === 0) {
        await ctx.reply(this.botService.getNoResultsMessage(examType));
        return;
      }

      await ctx.reply(
        `${this.botService.formatResultsListTitle(examType)}\n\nKerakli studentni tanlang:`,
        this.botService.buildResultsInlineKeyboard(results),
      );
    });
  }

  private async handleLeadFullName(
    ctx: BotContext,
    fullName: string,
  ): Promise<void> {
    if (fullName.trim().length < 3) {
      await ctx.reply(
        "Ism va familiya kamida 3 ta belgidan iborat bo'lishi kerak.",
      );
      return;
    }

    this.botStateService.setLeadDraft(this.getUserId(ctx), {
      fullName: fullName.trim(),
    });
    this.botStateService.setStep(this.getUserId(ctx), 'lead_phone');

    await ctx.reply(
      "Endi telefon raqamingizni yuboring. Masalan: +998901234567",
      this.botService.getPhoneKeyboard(),
    );
  }

  private async handleLeadPhone(
    ctx: BotContext,
    rawPhone: string,
  ): Promise<void> {
    const normalizedPhone = this.botService.normalizePhoneNumber(rawPhone);
    if (!normalizedPhone) {
      await ctx.reply(
        "Telefon raqam noto'g'ri formatda. Masalan: +998901234567",
      );
      return;
    }

    this.botStateService.setLeadDraft(this.getUserId(ctx), {
      phone: normalizedPhone,
    });
    this.botStateService.setStep(this.getUserId(ctx), 'lead_course_type');

    await ctx.reply(
      "Qiziqayotgan kurs turini yozing yoki o'tkazib yuboring.",
      this.botService.getCourseStepKeyboard(),
    );
  }

  private async handleLeadCourseType(
    ctx: BotContext,
    courseType: string,
  ): Promise<void> {
    const session = this.botStateService.getSession(this.getUserId(ctx));
    if (!session.leadDraft?.fullName || !session.leadDraft?.phone) {
      this.botStateService.clear(this.getUserId(ctx));
      await ctx.reply(
        "Murojaat jarayoni uzilib qolgan. Iltimos, qaytadan boshlang.",
        this.botService.getUserMenuKeyboard(),
      );
      return;
    }

    const dto: CreateLeadRequestDto = {
      fullName: session.leadDraft.fullName,
      phone: session.leadDraft.phone,
      courseType:
        courseType === FLOW_MENU.SKIP ? undefined : courseType.trim(),
    };

    await this.leadsService.create(dto);

    this.botStateService.clear(this.getUserId(ctx));

    await ctx.reply(
      this.botService.formatLeadSuccessMessage(),
      this.botService.getUserMenuKeyboard(),
    );
  }

  private async handleAdminEditAbout(
    ctx: BotContext,
    aboutText: string,
  ): Promise<void> {
    const trimmed = aboutText.trim();
    if (trimmed.length < 10) {
      await ctx.reply(
        "Matn juda qisqa. Kamida 10 ta belgi kiriting.",
        this.botService.getCancelKeyboard(),
      );
      return;
    }

    await this.updateCenterInfoPartial({ aboutText: trimmed });
    this.botStateService.clear(this.getUserId(ctx));
    await ctx.reply(
      "'Haqimizda' matni yangilandi.",
      this.botService.getAdminMenuKeyboard(),
    );
  }

  private async handleAdminEditAddress(
    ctx: BotContext,
    address: string,
  ): Promise<void> {
    const trimmed = address.trim();
    if (trimmed.length < 5) {
      await ctx.reply(
        "Manzil juda qisqa. Qayta kiriting.",
        this.botService.getCancelKeyboard(),
      );
      return;
    }

    await this.updateCenterInfoPartial({ address: trimmed });
    this.botStateService.clear(this.getUserId(ctx));
    await ctx.reply(
      'Manzil yangilandi.',
      this.botService.getAdminMenuKeyboard(),
    );
  }

  private async handleAdminEditContact(
    ctx: BotContext,
    raw: string,
  ): Promise<void> {
    const parts = raw.split(',').map((item) => item.trim());
    if (parts.length < 1) {
      await ctx.reply(
        "Format noto'g'ri. Masalan: +998901234567, +998971112233, @username",
        this.botService.getCancelKeyboard(),
      );
      return;
    }

    const phone1 = this.botService.normalizePhoneNumber(parts[0] ?? '');
    if (!phone1) {
      await ctx.reply(
        "phone1 noto'g'ri. Masalan: +998901234567",
        this.botService.getCancelKeyboard(),
      );
      return;
    }

    const phone2Raw = parts[1];
    const phone2 =
      !phone2Raw || phone2Raw === '-'
        ? undefined
        : this.botService.normalizePhoneNumber(phone2Raw) ?? null;
    if (phone2 === null) {
      await ctx.reply(
        "phone2 noto'g'ri. Masalan: +998971112233 yoki '-'",
        this.botService.getCancelKeyboard(),
      );
      return;
    }

    const usernameRaw = parts[2];
    const telegramUsername =
      !usernameRaw || usernameRaw === '-'
        ? undefined
        : usernameRaw.replace(/^@+/, '').trim();

    await this.updateCenterInfoPartial({
      phone1,
      phone2,
      telegramUsername,
    });

    this.botStateService.clear(this.getUserId(ctx));
    await ctx.reply(
      "Bog'lanish ma'lumotlari yangilandi.",
      this.botService.getAdminMenuKeyboard(),
    );
  }

  private async handleAdminCourseTitle(
    ctx: BotContext,
    title: string,
  ): Promise<void> {
    const trimmed = title.trim();
    if (trimmed.length < 3) {
      await ctx.reply(
        "Kurs nomi kamida 3 ta belgi bo'lsin.",
        this.botService.getCancelKeyboard(),
      );
      return;
    }

    this.botStateService.setMeta(this.getUserId(ctx), { courseTitle: trimmed });
    this.botStateService.setStep(
      this.getUserId(ctx),
      'admin_course_description',
    );
    await ctx.reply(
      'Kurs tavsifini yuboring.',
      this.botService.getCancelKeyboard(),
    );
  }

  private async handleAdminCourseDescription(
    ctx: BotContext,
    description: string,
  ): Promise<void> {
    const session = this.botStateService.getSession(this.getUserId(ctx));
    const title = String(session.meta?.courseTitle ?? '').trim();
    if (!title) {
      this.botStateService.clear(this.getUserId(ctx));
      await ctx.reply(
        "Kurs qo'shish jarayoni uzildi. Qaytadan boshlang.",
        this.botService.getAdminMenuKeyboard(),
      );
      return;
    }

    const trimmed = description.trim();
    if (trimmed.length < 5) {
      await ctx.reply(
        "Kurs tavsifi kamida 5 ta belgi bo'lsin.",
        this.botService.getCancelKeyboard(),
      );
      return;
    }

    const created = await this.coursesService.create({
      title,
      description: trimmed,
      isActive: true,
    });

    this.botStateService.clear(this.getUserId(ctx));
    await ctx.reply(
      `Kurs qo'shildi: ${created.title}`,
      this.botService.getAdminMenuKeyboard(),
    );
  }

  private async handleStudentSearch(
    ctx: BotContext,
    query: string,
  ): Promise<void> {
    const results = await this.adminService.searchStudents(query, 10);
    this.botStateService.clear(this.getUserId(ctx));

    if (results.length === 0) {
      await ctx.reply(
        this.botService.getNoSearchResultsMessage(query),
        this.botService.getAdminMenuKeyboard(),
      );
      return;
    }

    await ctx.reply(
      'Topilgan studentlar:',
      this.botService.buildResultsInlineKeyboard(results),
    );
    await ctx.reply(
      "Kerakli studentni tanlang. Admin panel menyusi qayta ochildi.",
      this.botService.getAdminMenuKeyboard(),
    );
  }

  private async handleAdminAddUsername(
    ctx: BotContext,
    rawUsername: string,
  ): Promise<void> {
    const username = this.normalizeUsernameInput(rawUsername);
    if (!username) {
      await ctx.reply(
        "Username noto'g'ri. Masalan: @username (5-32 belgi, harf/raqam/_)",
        this.botService.getCancelKeyboard(),
      );
      return;
    }

    const createdAdmin = await this.adminService.addAdminByUsername(username);
    this.botStateService.clear(this.getUserId(ctx));

    await ctx.reply(
      `Yangi admin qo'shildi: @${createdAdmin.telegramUsername}`,
      this.botService.getAdminMenuKeyboard(),
    );
  }

  private async handleAdminRemoveUsername(
    ctx: BotContext,
    rawUsername: string,
  ): Promise<void> {
    const username = this.normalizeUsernameInput(rawUsername);
    if (!username) {
      await ctx.reply(
        "Username noto'g'ri. Masalan: @username (5-32 belgi, harf/raqam/_)",
        this.botService.getCancelKeyboard(),
      );
      return;
    }

    const requesterUsername = this.normalizeUsernameInput(
      this.getAdminIdentity(ctx).telegramUsername ?? '',
    );
    if (requesterUsername && requesterUsername === username) {
      await ctx.reply(
        "O'zingizni admindan o'chirib bo'lmaydi.",
        this.botService.getAdminMenuKeyboard(),
      );
      this.botStateService.clear(this.getUserId(ctx));
      return;
    }

    const removed = await this.adminService.removeAdminByUsername(username);
    this.botStateService.clear(this.getUserId(ctx));

    if (!removed) {
      await ctx.reply(
        `@${username} bazadagi adminlar ichida topilmadi.`,
        this.botService.getAdminMenuKeyboard(),
      );
      return;
    }

    await ctx.reply(
      `@${username} adminlar ro'yxatidan o'chirildi.`,
      this.botService.getAdminMenuKeyboard(),
    );
  }

  private async handleResultStudentName(
    ctx: BotContext,
    fullName: string,
  ): Promise<void> {
    if (fullName.trim().length < 3) {
      await ctx.reply(
        "O'quvchi ism-familiyasi kamida 3 ta belgidan iborat bo'lishi kerak.",
      );
      return;
    }

    this.botStateService.setResultDraft(this.getUserId(ctx), {
      studentFullName: fullName.trim(),
    });
    this.botStateService.setStep(this.getUserId(ctx), 'result_exam_type');

    await ctx.reply(
      "2. Imtihon turini tanlang.",
      this.botService.getExamTypeKeyboard(),
    );
  }

  private async handleResultExamType(
    ctx: BotContext,
    examType: ExamType,
  ): Promise<void> {
    this.botStateService.setResultDraft(this.getUserId(ctx), { examType });
    this.botStateService.setStep(this.getUserId(ctx), 'result_score');

    await ctx.reply(
      "3. Natija yoki darajani yuboring. Masalan: C1 yoki 7.5",
      this.botService.getCancelKeyboard(),
    );
  }

  private async handleResultScore(
    ctx: BotContext,
    scoreOrLevel: string,
  ): Promise<void> {
    const value = scoreOrLevel.trim();
    if (value.length < 1 || value.length > 40) {
      await ctx.reply(
        "Natija qisqa va aniq bo'lsin. Masalan: B2, C1, 6.5 yoki 7.0",
      );
      return;
    }

    this.botStateService.setResultDraft(this.getUserId(ctx), {
      scoreOrLevel: value,
    });
    this.botStateService.setStep(this.getUserId(ctx), 'result_exam_date');

    await ctx.reply(
      "4. Sana yuboring. Masalan: 23.04.2026 yoki 2026-04-23",
      this.botService.getCancelKeyboard(),
    );
  }

  private async handleResultExamDate(
    ctx: BotContext,
    rawDate: string,
  ): Promise<void> {
    const examDate = this.botService.parseExamDate(rawDate);
    if (!examDate) {
      await ctx.reply(
        "Sana noto'g'ri. 23.04.2026 yoki 2026-04-23 formatida yuboring.",
      );
      return;
    }

    this.botStateService.setResultDraft(this.getUserId(ctx), { examDate });
    this.botStateService.setStep(this.getUserId(ctx), 'result_note');

    await ctx.reply(
      "5. Qo'shimcha izoh yuboring yoki o'tkazib yuboring.",
      this.botService.getCourseStepKeyboard(),
    );
  }

  private async handleResultNote(
    ctx: BotContext,
    note: string,
  ): Promise<void> {
    const normalizedNote =
      note === FLOW_MENU.SKIP ? undefined : note.trim().slice(0, 300);

    this.botStateService.setResultDraft(this.getUserId(ctx), {
      note: normalizedNote,
    });
    this.botStateService.setStep(this.getUserId(ctx), 'result_certificate');

    await ctx.reply(
      "6. Endi sertifikat rasmini yuboring. Bot shu rasmni natijalar kanaliga yuboradi (main kanalga ham jo'natadi).",
      this.botService.getCancelKeyboard(),
    );
  }

  private async handleResultCertificate(
    ctx: BotContext,
    certificateFileId: string,
  ): Promise<void> {
    const session = this.botStateService.getSession(this.getUserId(ctx));
    const draft = session.resultDraft;

    if (
      !draft?.studentFullName ||
      !draft.examType ||
      !draft.scoreOrLevel ||
      !draft.examDate
    ) {
      this.botStateService.clear(this.getUserId(ctx));
      await ctx.reply(
        "Natija joylash jarayoni uzilib qolgan. Iltimos, qaytadan boshlang.",
        this.botService.getAdminMenuKeyboard(),
      );
      return;
    }

    let channelPostLink: string;
    let mainChannelPostLink: string | undefined;
    try {
      const publishResult = await this.botService.publishResultToChannels({
        studentFullName: draft.studentFullName,
        examType: draft.examType,
        scoreOrLevel: draft.scoreOrLevel,
        examDate: draft.examDate,
        note: draft.note,
        certificateImage: certificateFileId,
      });
      channelPostLink = publishResult.resultsChannelPostLink;
      mainChannelPostLink = publishResult.mainChannelPostLink;
    } catch (error) {
      this.logger.error(
        'Natijani channelga yuborishda xatolik',
        error instanceof Error ? error.stack : undefined,
      );
      await ctx.reply(
        "Natijani results kanalga joylab bo'lmadi. Bot kanalga admin qilinganini tekshiring.",
        this.botService.getAdminMenuKeyboard(),
      );
      return;
    }

    try {
      const result = await this.resultsService.create({
        studentFullName: draft.studentFullName,
        examType: draft.examType,
        scoreOrLevel: draft.scoreOrLevel,
        certificateImage: certificateFileId,
        examDate: draft.examDate,
        channelPostLink,
        note: draft.note,
      });

      this.botStateService.clear(this.getUserId(ctx));

      await ctx.reply(
        this.botService.formatResultCreatedMessage(result),
        this.botService.buildResultLinkKeyboard(result),
      );
      if (mainChannelPostLink) {
        await ctx.reply(`Main kanalga ham yuborildi.\nLink: ${mainChannelPostLink}`);
      }
      await ctx.reply(
        "Admin menyu qayta ochildi.",
        this.botService.getAdminMenuKeyboard(),
      );
    } catch (error) {
      this.logger.error(
        'Natijani bazaga saqlashda xatolik',
        error instanceof Error ? error.stack : undefined,
      );
      this.botStateService.clear(this.getUserId(ctx));
      await ctx.reply(
        `Kanalga post joylandi, lekin bazaga yozishda xatolik bo'ldi.\nLink: ${channelPostLink}`,
        this.botService.getAdminMenuKeyboard(),
      );
    }
  }

  private async sendResultCard(
    ctx: BotContext,
    result: BotStudentResult,
    intro: string,
  ): Promise<void> {
    const caption = `${intro}\n\n${this.botService.formatResultMessage(result)}`;

    try {
      await ctx.replyWithPhoto(result.certificateImage, {
        caption,
        ...this.botService.buildResultLinkKeyboard(result),
      });
    } catch {
      await ctx.reply(caption, this.botService.buildResultLinkKeyboard(result));
    }
  }

  private async cancelFlow(ctx: BotContext): Promise<void> {
    this.botStateService.clear(this.getUserId(ctx));
    const isAdmin = await this.adminService.isAdmin(this.getAdminIdentity(ctx));
    await ctx.reply(
      "Joriy amal bekor qilindi.",
      isAdmin
        ? this.botService.getAdminMenuKeyboard()
        : this.botService.getUserMenuKeyboard(),
    );
  }

  private getUserId(ctx: BotContext): number | string {
    return ctx.from?.id ?? 'unknown';
  }

  private getAdminIdentity(ctx: BotContext): {
    telegramUserId?: number | string;
    telegramUsername?: string;
  } {
    return {
      telegramUserId: ctx.from?.id,
      telegramUsername: ctx.from?.username,
    };
  }

  private getMessageText(ctx: BotContext): string | undefined {
    const message = ctx.message as { text?: string } | undefined;
    return message?.text?.trim();
  }

  private normalizeUsernameInput(value: string): string | null {
    const normalized = value.trim().replace(/^@+/, '').toLowerCase();
    if (!/^[a-z0-9_]{5,32}$/.test(normalized)) {
      return null;
    }
    return normalized;
  }

  private async updateCenterInfoPartial(partial: {
    aboutText?: string;
    address?: string;
    phone1?: string;
    phone2?: string;
    telegramUsername?: string;
  }): Promise<void> {
    const current = await this.centerInfoService.getCenterInfo();
    await this.centerInfoService.upsert({
      aboutText: partial.aboutText ?? current.aboutText,
      address: partial.address ?? current.address,
      phone1: partial.phone1 ?? current.phone1,
      phone2:
        partial.phone2 !== undefined ? partial.phone2 : (current.phone2 ?? undefined),
      telegramUsername:
        partial.telegramUsername !== undefined
          ? partial.telegramUsername
          : (current.telegramUsername ?? undefined),
    });
  }

  private async assertAdmin(ctx: BotContext): Promise<boolean> {
    const isAdmin = await this.adminService.isAdmin(this.getAdminIdentity(ctx));
    if (!isAdmin) {
      await ctx.reply(
        'Bu bo\'lim faqat adminlar uchun.',
        this.botService.getUserMenuKeyboard(),
      );
      return false;
    }

    return true;
  }

  private async runSafely(
    ctx: BotContext,
    handler: () => Promise<void>,
  ): Promise<void> {
    try {
      await handler();
    } catch (error) {
      this.logger.error(
        'Bot handler xatosi',
        error instanceof Error ? error.stack : undefined,
      );
      await ctx.reply(
        "Xatolik yuz berdi. Iltimos, yana urinib ko'ring yoki /start ni bosing.",
      );
    }
  }
}


