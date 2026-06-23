import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  const port = config.get<number>('PORT', 3000);
  const apiPrefix = config.get<string>('API_PREFIX', 'api');
  const corsOrigins = config
    .get<string>('CORS_ORIGINS', '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  // Security headers (CSP, XSS, HSTS, frameguard, etc.)
  app.use(helmet());

  // Graceful shutdown — closes DB + queues + workers on SIGTERM/SIGINT
  app.enableShutdownHooks();

  app.setGlobalPrefix(apiPrefix);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({
    // empty list → only same-origin; '*' explicit means open (rarely correct)
    origin: corsOrigins.length === 0 ? false : corsOrigins,
    credentials: true,
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Nest Hexagonal Boilerplate')
    .setDescription('API boilerplate con arquitectura hexagonal')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(`${apiPrefix}/docs`, app, document);

  await app.listen(port);
  Logger.log(
    `🚀 App running on http://localhost:${port}/${apiPrefix}`,
    'Bootstrap',
  );
  Logger.log(
    `📚 Docs on http://localhost:${port}/${apiPrefix}/docs`,
    'Bootstrap',
  );
}

void bootstrap();
