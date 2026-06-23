import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { ExamType } from '../service/exam-type';

const prisma = new PrismaClient();

function getSeedAdminId(): string {
  const rawIds = process.env.ADMIN_TELEGRAM_IDS ?? '';
  const adminId = rawIds
    .split(',')
    .map((value) => value.trim())
    .find(Boolean);

  if (!adminId) {
    throw new Error(
      'ADMIN_TELEGRAM_IDS is required for bot seed in production-safe mode',
    );
  }

  return adminId;
}

function getSeedAdminUsername(): string | undefined {
  const rawUsernames = process.env.ADMIN_TELEGRAM_USERNAMES ?? '';
  const username = rawUsernames
    .split(',')
    .map((value) => value.trim())
    .find(Boolean);

  if (!username) {
    return undefined;
  }

  return username.replace(/^@+/, '').toLowerCase();
}

async function main(): Promise<void> {
  const adminId = getSeedAdminId();
  const adminUsername = getSeedAdminUsername();

  await prisma.botAdmin.upsert({
    where: { telegramUserId: adminId },
    update: {
      fullName: 'System Admin',
      telegramUsername: adminUsername,
    },
    create: {
      telegramUserId: adminId,
      telegramUsername: adminUsername,
      fullName: 'System Admin',
    },
  });

  const centerInfo = await prisma.botCenterInfo.findFirst();
  if (!centerInfo) {
    await prisma.botCenterInfo.create({
      data: {
        aboutText:
          "CEFR va IELTS o'quv markazimizda xalqaro imtihonlarga tayyorlov kurslari, tajribali ustozlar va natijaga yo'naltirilgan dars jarayoni mavjud.",
        address: "Toshkent shahri, Chilonzor tumani, namunaviy ko'cha 12-uy",
        phone1: '+998901234567',
        phone2: '+998971112233',
        telegramUsername: '@cefrieltscenter',
      },
    });
  }

  const courses = [
    {
      title: 'CEFR intensiv kursi',
      description:
        "CEFR imtihoniga puxta tayyorlaydigan intensiv dastur. Grammar, vocabulary va writing amaliyoti mavjud.",
    },
    {
      title: 'IELTS Foundation',
      description:
        "IELTS boshlang'ich tayyorlov kursi. Listening, reading, writing va speaking bo'yicha bosqichma-bosqich tayyorlov.",
    },
    {
      title: 'IELTS Advanced',
      description:
        "Yuqori ball olishni maqsad qilgan o'quvchilar uchun mock exam va individual feedback bilan kurs.",
    },
  ];

  for (const course of courses) {
    const existingCourse = await prisma.botCourse.findFirst({
      where: { title: course.title },
    });

    if (!existingCourse) {
      await prisma.botCourse.create({
        data: course,
      });
    }
  }

  const existingResultsCount = await prisma.botStudentResult.count();
  if (existingResultsCount === 0) {
    await prisma.botStudentResult.createMany({
      data: [
        {
          studentFullName: 'Aliyev Bekzod Anvar o\'g\'li',
          examType: ExamType.CEFR,
          scoreOrLevel: 'C1',
          certificateImage: 'https://example.com/certificates/bekzod-c1.jpg',
          examDate: new Date('2026-03-14'),
          channelPostLink: 'https://t.me/your_results_channel/101',
          note: "Yuqori natija bilan sertifikat qo'lga kiritdi.",
        },
        {
          studentFullName: 'Karimova Mohira Ilhom qizi',
          examType: ExamType.IELTS,
          scoreOrLevel: '7.5',
          certificateImage: 'https://example.com/certificates/mohira-75.jpg',
          examDate: new Date('2026-03-20'),
          channelPostLink: 'https://t.me/your_results_channel/102',
          note: 'Writing va speaking bo\'limlarida kuchli natija ko\'rsatdi.',
        },
        {
          studentFullName: 'Rustamov Azizbek Jamshid o\'g\'li',
          examType: ExamType.CEFR,
          scoreOrLevel: 'B2',
          certificateImage: 'https://example.com/certificates/azizbek-b2.jpg',
          examDate: new Date('2026-04-01'),
          channelPostLink: 'https://t.me/your_results_channel/103',
        },
      ],
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    // eslint-disable-next-line no-console
    console.error('Seed jarayonida xatolik:', error);
    await prisma.$disconnect();
    process.exit(1);
  });
