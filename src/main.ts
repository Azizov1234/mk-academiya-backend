import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { join } from 'path';

function normalizeOrigin(origin: string): string {
  return origin.replace(/\/$/, '');
}

function isLocalhostOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    return url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

function resolveAllowedOrigins(): string[] {
  const isProduction = process.env.NODE_ENV === 'production';
  const allowLocalhost =
    (process.env.CORS_ALLOW_LOCALHOST ?? (isProduction ? 'false' : 'true'))
      .toLowerCase() === 'true';

  const envOrigins = [
    process.env.FRONTEND_URL,
    ...(process.env.FRONTEND_URLS?.split(',') ?? []),
  ]
    .filter(Boolean)
    .map((origin) => normalizeOrigin(String(origin)));

  const defaults = [
    'https://www.mk-academia.uz',
    'http://www.mk-academia.uz',
    'https://mk-academy-dev.vercel.app',
    'https://mk-academy.netlify.app',
  ];

  if (allowLocalhost) {
    defaults.push(
      'http://localhost',
      'https://localhost',
      'http://localhost:3000',
      'https://localhost:3000',
      'http://127.0.0.1:3000',
      'capacitor://localhost',
      'ionic://localhost',
    );
  }

  return Array.from(new Set([...defaults, ...envOrigins]));
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });
  const logger = new Logger('Bootstrap');
  app.enableShutdownHooks();
  app.useLogger(logger);
  app.use(helmet());

  app.enableCors({
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
    maxAge: 60 * 60,
  });

  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads',
  });

  // const allowedOrigins = resolveAllowedOrigins();
  // app.enableCors({
  //   origin: (origin, callback) => {
  //     if (!origin) return callback(null, true);
  //
  //     const normalizedOrigin = normalizeOrigin(origin);
  //     if (allowedOrigins.includes(normalizedOrigin)) {
  //       return callback(null, true);
  //     }
  //
  //     const allowLocalhost =
  //       (process.env.CORS_ALLOW_LOCALHOST ??
  //         (process.env.NODE_ENV === 'production' ? 'false' : 'true'))
  //         .toLowerCase() === 'true';
  //     if (allowLocalhost && isLocalhostOrigin(normalizedOrigin)) {
  //       return callback(null, true);
  //     }
  //
  //     return callback(null, false);
  //   },
  //   methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  //   credentials: true,
  //   maxAge: 60 * 60,
  // });

  app.setGlobalPrefix('api');

  const isProduction = process.env.NODE_ENV === 'production';
  const swaggerEnabled =
    (process.env.SWAGGER_ENABLED ?? (isProduction ? 'false' : 'true'))
      .toLowerCase() === 'true';

  if (swaggerEnabled) {
    const config = new DocumentBuilder()
      .setTitle('MK Academy API')
      .setDescription('CEFR Learning Platform API Documentation')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });
  }

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const port = Number(process.env.PORT || 3001);
  await app.listen(port);
  logger.log(`Backend is running on: ${port}`);
}

bootstrap().catch((error) => {
  console.error('Application bootstrap failed:', error);
  process.exit(1);
})
