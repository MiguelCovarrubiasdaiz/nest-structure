import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { resolve } from 'node:path';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);

  const port = config.get<number>('PORT', 3000);
  const apiPrefix = config.get<string>('API_PREFIX', 'api');
  const nodeEnv = config.get<string>('NODE_ENV', 'development');

  app.setGlobalPrefix(apiPrefix);
  app.use(helmet());

  // Serve locally-stored uploads so the URLs returned by the local storage
  // driver actually resolve (no-op for the S3 driver).
  if (config.get<string>('STORAGE_DRIVER', 'local') === 'local') {
    const uploadsRoot = resolve(
      config.get<string>('STORAGE_LOCAL_PATH', './uploads'),
    );
    const publicPrefix = config.get<string>(
      'STORAGE_LOCAL_PUBLIC_URL',
      '/files',
    );
    app.useStaticAssets(uploadsRoot, { prefix: publicPrefix });
  }
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // CORS is disabled unless CORS_ORIGIN is set (comma-separated allowlist).
  const corsOrigin = config.get<string>('CORS_ORIGIN');
  if (corsOrigin) {
    app.enableCors({
      origin: corsOrigin.split(',').map((o) => o.trim()),
      credentials: true,
    });
  }

  // Ensure OnModuleDestroy hooks (DB pool, SMTP transporter) run on SIGTERM/SIGINT.
  app.enableShutdownHooks();

  // Swagger is developer-facing — do not expose it in production.
  if (nodeEnv !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Nest Hexagonal Boilerplate')
      .setDescription('API boilerplate con arquitectura hexagonal')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup(`${apiPrefix}/docs`, app, document);
  }

  await app.listen(port);
  Logger.log(
    `🚀 App running on http://localhost:${port}/${apiPrefix}`,
    'Bootstrap',
  );
  if (nodeEnv !== 'production') {
    Logger.log(
      `📚 Docs on http://localhost:${port}/${apiPrefix}/docs`,
      'Bootstrap',
    );
  }
}

void bootstrap();
