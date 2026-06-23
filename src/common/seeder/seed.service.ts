import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SeedService } from './seeds/question.seeder';
import { UserSeeder } from './seeds/user.seeder';

@Injectable()
export class SeederService implements OnModuleInit {
  private readonly logger = new Logger(SeederService.name);

  constructor(
    private readonly userSeeder: UserSeeder,
    private readonly questionSeeder: SeedService,
  ) {}

  async onModuleInit() {
    this.logger.log('Running seeders...');

    try {
      await this.userSeeder.seedUsers();
      const result = await this.questionSeeder.seedQuestionsIfMissing();
      this.logger.log(
        `Question seed done: testsCreated=${result.testsCreated}, questionsCreated=${result.questionsCreated}, questionsReactivated=${result.questionsReactivated}, totalSeedQuestions=${result.totalSeedQuestions}`,
      );
      this.logger.log('All seeders completed');
    } catch (error) {
      this.logger.error(
        'Seeder execution failed',
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }
}
