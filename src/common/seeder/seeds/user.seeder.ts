import { Injectable, Logger } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'src/core/config/prisma.service';
import { UserRole } from 'src/core/enums';

@Injectable()
export class UserSeeder {
  private readonly logger = new Logger(UserSeeder.name);

  constructor(private readonly prisma: PrismaService) {}

  async seedUsers(): Promise<void> {
    const assignmentCount = await this.prisma.groupAssignment.count();
    const studentCount = await this.prisma.user.count({
      where: { role: UserRole.STUDENT },
    });
    const vocabCount = await this.prisma.vocabulary.count();

    if (studentCount >= 500 && vocabCount >= 15 && process.env.FORCE_SEED !== '1') {
      this.logger.log('🌱 Database is already seeded (students >= 500, vocabularies >= 15). Skipping user seeder...');
      if (assignmentCount < 10) {
        await this.seedGroupAssignments();
      }
      return;
    }

    this.logger.log('🌱 Seeder ishga tushdi: SuperAdmin, Admin, Teacher, 500 Student, Groups, Attempts...');

    // 1. Pre-calculate password hash for "123456" to ensure speed
    const defaultPassword = '123456';
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    // 2. Ensure Superadmin (Asosiy Superadmin)
    const superAdminPhone = '998999992000';
    const superAdmin = await this.prisma.user.upsert({
      where: { phone: superAdminPhone },
      update: {
        fullName: 'Muhammadkarim To\'xtayev',
        passwordHash,
        role: UserRole.SUPERADMIN,
        isActive: true,
      },
      create: {
        fullName: 'Muhammadkarim To\'xtayev',
        phone: superAdminPhone,
        passwordHash,
        role: UserRole.SUPERADMIN,
        isActive: true,
      },
    });

    await this.prisma.userProfile.upsert({
      where: { userId: superAdmin.id },
      update: { isActive: true },
      create: { userId: superAdmin.id, isActive: true },
    });

    // Custom Superadmin in ENV if exists
    if (process.env.SUPERADMIN_PHONE && process.env.SUPERADMIN_PHONE !== superAdminPhone) {
      const envPhone = process.env.SUPERADMIN_PHONE.trim();
      const envName = process.env.SUPERADMIN_FULL_NAME || 'Abdulaziz';
      const envSuper = await this.prisma.user.upsert({
        where: { phone: envPhone },
        update: {
          fullName: envName,
          passwordHash,
          role: UserRole.SUPERADMIN,
          isActive: true,
        },
        create: {
          fullName: envName,
          phone: envPhone,
          passwordHash,
          role: UserRole.SUPERADMIN,
          isActive: true,
        },
      });

      await this.prisma.userProfile.upsert({
        where: { userId: envSuper.id },
        update: { isActive: true },
        create: { userId: envSuper.id, isActive: true },
      });
    }

    // 3. Seed 2 Admins
    const adminsData = [
      { phone: '+998991112233', fullName: 'Jasur Mavlonov' },
      { phone: '+998991112244', fullName: 'Nilufar Umarova' },
    ];

    const admins: any[] = [];
    for (const adminItem of adminsData) {
      const admin = await this.prisma.user.upsert({
        where: { phone: adminItem.phone },
        update: {
          fullName: adminItem.fullName,
          passwordHash,
          role: UserRole.ADMIN,
          isActive: true,
        },
        create: {
          fullName: adminItem.fullName,
          phone: adminItem.phone,
          passwordHash,
          role: UserRole.ADMIN,
          isActive: true,
        },
      });
      admins.push(admin);

      await this.prisma.userProfile.upsert({
        where: { userId: admin.id },
        update: { isActive: true },
        create: { userId: admin.id, isActive: true },
      });
    }

    // 4. Seed 5 Teachers
    const teachersData = [
      { phone: '+998992223341', fullName: 'Shohruh Rahmatov' },
      { phone: '+998992223342', fullName: 'Lobar Karimova' },
      { phone: '+998992223343', fullName: "Ulug'bek Qodirov" },
      { phone: '+998992223344', fullName: 'Malika Axmedova' },
      { phone: '+998992223345', fullName: 'Jahongir Gofurov' },
    ];

    const teachers: any[] = [];
    for (const teacherItem of teachersData) {
      const teacher = await this.prisma.user.upsert({
        where: { phone: teacherItem.phone },
        update: {
          fullName: teacherItem.fullName,
          passwordHash,
          role: UserRole.TEACHER,
          isActive: true,
        },
        create: {
          fullName: teacherItem.fullName,
          phone: teacherItem.phone,
          passwordHash,
          role: UserRole.TEACHER,
          isActive: true,
        },
      });
      teachers.push(teacher);

      await this.prisma.userProfile.upsert({
        where: { userId: teacher.id },
        update: { isActive: true },
        create: { userId: teacher.id, isActive: true },
      });
    }

    // 5. Seed 5 Groups (managed by Teachers)
    const groups: any[] = [];
    const groupNames = [
      'Elementary Group A',
      'IELTS Target 7.5',
      'CEFR B2 Intermediate',
      'General English E1',
      'Beginner Intensive',
    ];

    for (let i = 0; i < 5; i++) {
      const groupInviteCode = `GRP_${1000 + i}`;
      const group = await this.prisma.group.upsert({
        where: { inviteCode: groupInviteCode },
        update: {
          name: groupNames[i],
          description: `Seeded course group for active students (Teacher: ${teachers[i].fullName})`,
          teacherId: teachers[i].id,
          isActive: true,
        },
        create: {
          name: groupNames[i],
          description: `Seeded course group for active students (Teacher: ${teachers[i].fullName})`,
          teacherId: teachers[i].id,
          inviteCode: groupInviteCode,
          isActive: true,
        },
      });
      groups.push(group);
    }

    // 6. Seed 500 Students (chiroyli o'zbek ismlari bilan) & Add to Groups
    const students: any[] = [];
    const cefrLevels = ['A1', 'A2', 'B1', 'B2', 'C1'];

    // Chiroyli o'zbek ismlari 🎯
    const uzbekFirstNames = [
      "Abdulla", "Azizbek", "Bekzod", "Davron", "Eldor",
      "Farrux", "G'ani", "Husan", "Islom", "Javohir",
      "Kamron", "Laziz", "Muhammad", "Nodir", "O'tkir",
      "Po'lat", "Qodir", "Rustam", "Sarvar", "Temur",
      "Ulug'bek", "Valisher", "Xurshid", "Yodgor", "Zafar",
      "Asilbek", "Botir", "Dilmurod", "Erkin", "Firdavs",
      "G'iyos", "Hakim", "Ibrohim", "Jahongir", "Komil",
      "Lutfulla", "Murod", "Nurmuhammad", "Olim", "Polvon",
      "Ravshan", "Sardor", "Tohir", "Umid", "Vohid",
      "Xolmat", "Yorqin", "Zokir", "Anvar", "Bobur",
    ];

    const uzbekLastNames = [
      "Karimov", "Rahimov", "Aliyev", "Yusupov", "Tursunov",
      "Xasanov", "Xusanov", "Toirov", "Nazarov", "Ismoilov",
      "Ochilov", "Saidov", "G'aniyev", "Hakimov", "Jabborov",
      "Kamolov", "Latipov", "Mahmudov", "Norboyev", "Ortiqov",
      "Primov", "Qodirov", "Raxmatov", "Sobirov", "Toshmatov",
      "Umarov", "Fayzullayev", "Xaydarov", "Choriyev", "Shodiyev",
      "Ergashev", "Yo'ldoshev", "Baxtiyorov", "Dushanov", "Eshonqulov",
      "Jo'rayev", "Zoirov", "Ibragimov", "Komilov", "Mo'minov",
      "Normatov", "Omonov", "Pardayev", "Ro'ziyev", "Sultonov",
      "Toshpo'latov", "Usmonov", "Xolmirzayev", "Yodgorov", "Jo'rayev",
    ];

    for (let i = 1; i <= 500; i++) {
      const pad = String(i).padStart(4, '0');
      const studentPhone = `+99899333${pad}`;
      const firstName = uzbekFirstNames[i % uzbekFirstNames.length];
      const lastName = uzbekLastNames[Math.floor(i / uzbekFirstNames.length) % uzbekLastNames.length];
      const studentName = `${firstName} ${lastName}`;
      const level = cefrLevels[i % cefrLevels.length];

      const student = await this.prisma.user.upsert({
        where: { phone: studentPhone },
        update: {
          fullName: studentName,
          passwordHash,
          role: UserRole.STUDENT,
          cefrLevel: level,
          isActive: true,
        },
        create: {
          fullName: studentName,
          phone: studentPhone,
          passwordHash,
          role: UserRole.STUDENT,
          cefrLevel: level,
          isActive: true,
        },
      });
      students.push(student);

      await this.prisma.userProfile.upsert({
        where: { userId: student.id },
        update: { isActive: true },
        create: { userId: student.id, isActive: true },
      });

      // Add student to one of the 5 groups (round-robin)
      const targetGroup = groups[i % groups.length];
      await this.prisma.groupMember.upsert({
        where: {
          groupId_studentId: {
            groupId: targetGroup.id,
            studentId: student.id,
          },
        },
        update: {
          status: 'ACTIVE',
          isActive: true,
        },
        create: {
          groupId: targetGroup.id,
          studentId: student.id,
          status: 'ACTIVE',
          isActive: true,
        },
      });
    }

    // 7. Seed 15 Vocabularies
    const vocabData = [
      { word: 'apple', translation: 'olma', level: 'A1' },
      { word: 'banana', translation: 'banan', level: 'A1' },
      { word: 'cat', translation: 'mushuk', level: 'A1' },
      { word: 'dog', translation: 'it', level: 'A1' },
      { word: 'elephant', translation: 'fil', level: 'A2' },
      { word: 'fish', translation: 'baliq', level: 'A1' },
      { word: 'giraffe', translation: 'jirafa', level: 'A2' },
      { word: 'house', translation: 'uy', level: 'A1' },
      { word: 'internet', translation: 'internet', level: 'A1' },
      { word: 'jacket', translation: 'kurtka', level: 'A2' },
      { word: 'kangaroo', translation: 'kenguru', level: 'B1' },
      { word: 'lion', translation: 'sher', level: 'A2' },
      { word: 'monkey', translation: 'maymun', level: 'A2' },
      { word: 'nurse', translation: 'hamshira', level: 'A2' },
      { word: 'orange', translation: 'apelsin', level: 'A1' },
    ];

    const vocabularies: any[] = [];
    for (const item of vocabData) {
      const vocab = await this.prisma.vocabulary.upsert({
        where: { word: item.word },
        update: {
          translation: item.translation,
          cefrLevel: item.level,
          difficulty: item.level === 'A1' ? 1 : item.level === 'A2' ? 2 : 3,
        },
        create: {
          word: item.word,
          translation: item.translation,
          cefrLevel: item.level,
          difficulty: item.level === 'A1' ? 1 : item.level === 'A2' ? 2 : 3,
        },
      });
      vocabularies.push(vocab);
    }

    // 8. Seed Vocabulary Progress for students (3-5 random words each)
    for (const student of students) {
      // Pick 4 random words
      const shuffled = [...vocabularies].sort(() => 0.5 - Math.random());
      const selectedVocabs = shuffled.slice(0, 4);

      const statuses = ['NEW', 'LEARNED', 'REVIEW'];
      for (let j = 0; j < selectedVocabs.length; j++) {
        const vocab = selectedVocabs[j];
        const status = statuses[j % statuses.length];
        
        await this.prisma.vocabularyProgress.upsert({
          where: {
            studentId_vocabularyId: {
              studentId: student.id,
              vocabularyId: vocab.id,
            },
          },
          update: {
            status,
            correctCount: status === 'LEARNED' ? 3 : status === 'REVIEW' ? 1 : 0,
            wrongCount: status === 'REVIEW' ? 1 : 0,
          },
          create: {
            studentId: student.id,
            vocabularyId: vocab.id,
            status,
            correctCount: status === 'LEARNED' ? 3 : status === 'REVIEW' ? 1 : 0,
            wrongCount: status === 'REVIEW' ? 1 : 0,
          },
        });
      }
    }

    // 9. Seed Test Attempts for "Demo Test" (testId: 9)
    // Check if testId 9 exists and has questions
    const demoTest = await this.prisma.test.findUnique({
      where: { id: 9 },
      include: { questions: true },
    });

    if (demoTest && demoTest.questions.length > 0) {
      const questions = demoTest.questions;
      this.logger.log(`Seeding test attempts for testId: 9 (${questions.length} questions)...`);

      // We will create test attempts for 420 out of the 500 students to make it realistic
      const activeAttemptStudents = students.slice(0, 420);
      
      // Clear old attempts for clean slate
      await this.prisma.testAttempt.deleteMany({
        where: { testId: 9 },
      });

      const attemptsToCreate: any[] = [];
      const questionStatsMap = new Map<number, { total: number; correct: number; times: number }>();
      
      // Initialize analytics map
      for (const q of questions) {
        questionStatsMap.set(q.id, { total: 0, correct: 0, times: 0 });
      }

      for (const student of activeAttemptStudents) {
        const studentScore = Math.floor(Math.random() * 7) + 4; // Score between 4 and 10
        const percentage = (studentScore / questions.length) * 100;
        const passed = percentage >= demoTest.passingScore;
        const timeSpent = Math.floor(Math.random() * 200) + 100; // 100 to 300 seconds
        const avgTimePerQuestion = timeSpent / questions.length;

        const resultsDetails: any[] = [];
        const submittedAnswers: Record<string, string> = {};

        // Randomize correct/incorrect answers based on the student's final score
        const correctQuestionIndices = new Set<number>();
        while (correctQuestionIndices.size < studentScore) {
          correctQuestionIndices.add(Math.floor(Math.random() * questions.length));
        }

        questions.forEach((question, index) => {
          const isCorrect = correctQuestionIndices.has(index);
          const points = Number(question.points || 1);
          let studentAnswer = question.correctAnswer || '';
          
          if (!isCorrect) {
            // Find a wrong option
            const opts = JSON.parse(question.options || '[]');
            const wrongOpts = opts.filter((o: string) => o !== question.correctAnswer);
            studentAnswer = wrongOpts[Math.floor(Math.random() * wrongOpts.length)] || 'wrong';
          }

          submittedAnswers[String(question.id)] = studentAnswer;
          resultsDetails.push({
            questionId: question.id,
            answer: studentAnswer,
            correctAnswer: question.correctAnswer,
            isCorrect,
            points,
            earnedPoints: isCorrect ? points : 0,
            explanation: question.explanation,
          });

          // Aggregate analytics
          const stats = questionStatsMap.get(question.id)!;
          stats.total += 1;
          if (isCorrect) stats.correct += 1;
          stats.times += avgTimePerQuestion;
        });

        const submittedAt = new Date(Date.now() - Math.random() * 10 * 24 * 60 * 60 * 1000); // within last 10 days
        const startedAt = new Date(submittedAt.getTime() - timeSpent * 1000);

        const feedback = {
          mode: 'AUTO_GRADED',
          maxScore: questions.length,
          earnedScore: studentScore,
          percentage,
          passingScore: demoTest.passingScore,
          totalQuestions: questions.length,
          answeredQuestions: questions.length,
          correctQuestions: studentScore,
          timeLimitMinutes: demoTest.timeLimitMinutes || null,
          timeLimitExceeded: false,
          submittedAt: submittedAt.toISOString(),
        };

        const answersPayload = {
          submitted: submittedAnswers,
          results: resultsDetails,
        };

        attemptsToCreate.push({
          studentId: student.id,
          testId: 9,
          startedAt,
          submittedAt,
          score: studentScore,
          percentage,
          passed,
          timeSpentSeconds: timeSpent,
          answers: JSON.stringify(answersPayload),
          feedback: JSON.stringify(feedback),
        });
      }

      // Bulk create attempts
      await this.prisma.testAttempt.createMany({
        data: attemptsToCreate,
      });

      // 10. Update Question Analytics directly from aggregate data
      for (const q of questions) {
        const stats = questionStatsMap.get(q.id)!;
        const avgTime = stats.total > 0 ? stats.times / stats.total : 0;
        
        await this.prisma.questionAnalytics.upsert({
          where: { questionId: q.id },
          update: {
            totalAttempts: stats.total,
            correctCount: stats.correct,
            avgTimeSeconds: avgTime,
          },
          create: {
            questionId: q.id,
            totalAttempts: stats.total,
            correctCount: stats.correct,
            avgTimeSeconds: avgTime,
          },
        });
      }

      this.logger.log(`Seeded ${attemptsToCreate.length} test attempts and updated analytics tables!`);
    }

    const assignmentCount = await this.prisma.groupAssignment.count();
    if (assignmentCount < 10) {
      await this.seedGroupAssignments();
    }

    this.logger.log('Comprehensive seeding completed successfully!');
  }

  private async seedGroupAssignments(): Promise<void> {
    this.logger.log('🌱 Seeding fallback group assignments...');
    const groups = await this.prisma.group.findMany({ where: { isActive: true } });
    const tests = await this.prisma.test.findMany({ where: { isActive: true } });

    if (!groups.length) {
      this.logger.warn('No active groups found to seed assignments.');
      return;
    }

    let course = await this.prisma.course.findFirst();
    if (!course) {
      course = await this.prisma.course.create({
        data: {
          title: 'General English',
          description: 'General English Course for CEFR',
          level: 'A2',
          isActive: true,
        },
      });
    }

    const taskCount = await this.prisma.task.count();
    const taskTitles = [
      "Writing: Introduce Yourself",
      "Reading: Modern Technology",
      "Grammar: Present Perfect vs Past Simple",
      "Listening: Daily Conversations",
      "Speaking: My Dream Job",
      "Vocabulary: Advanced Adjectives",
      "Essay: Climate Change Solutions",
      "Letter: Asking for Information",
      "Grammar: Conditional Sentences",
      "Speaking: Audio Blog Post"
    ];
    const tasks: any[] = [];
    if (taskCount < 10) {
      for (const title of taskTitles) {
        const task = await this.prisma.task.create({
          data: {
            title,
            description: `Seeded homework task for ${title}. Complete and submit via attachments.`,
            course: { connect: { id: course.id } },
            maxScore: 100,
            isActive: true,
          }
        });
        tasks.push(task);
      }
    } else {
      tasks.push(...(await this.prisma.task.findMany({ take: 10 })));
    }

    for (let i = 0; i < 15; i++) {
      const group = groups[i % groups.length];
      const task = tasks[i % tasks.length];
      const test = tests.length > 0 ? tests[i % tests.length] : null;
      
      const isTask = i % 2 === 0;
      
      const members = await this.prisma.groupMember.findMany({
        where: { groupId: group.id, status: 'ACTIVE', isActive: true },
        take: 5
      });
      const randomMember = members.length > 0 ? members[Math.floor(Math.random() * members.length)] : null;
      
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + (i % 7) + 1);

      await this.prisma.groupAssignment.create({
        data: {
          groupId: group.id,
          studentId: i % 3 === 0 && randomMember ? randomMember.studentId : null,
          taskId: isTask && task ? task.id : null,
          testId: !isTask && test ? test.id : null,
          dueDate,
          isRequired: i % 4 !== 0,
          isActive: true,
        }
      });
    }
    this.logger.log('🌱 Finished seeding fallback group assignments.');
  }
}
