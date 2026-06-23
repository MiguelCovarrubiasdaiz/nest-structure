import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { DatabaseModule } from '@shared/database/database.module';
import { DomainExceptionFilter } from '@shared/filters/domain-exception.filter';
import { MailModule } from '@shared/mail/mail.module';
import { SecurityModule } from '@shared/security/security.module';
import { StorageModule } from '@shared/storage/storage.module';
import { validateEnv } from '@shared/config/env.validation';
import { AuthModule } from '@modules/auth/auth.module';
import { UsersModule } from '@modules/users/users.module';
import { FilesModule } from '@modules/files/files.module';
import { HealthModule } from '@modules/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnv,
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            name: 'default',
            ttl: config.get<number>('THROTTLE_TTL_SECONDS', 60) * 1000,
            limit: config.get<number>('THROTTLE_LIMIT', 60),
          },
        ],
      }),
    }),
    DatabaseModule,
    StorageModule,
    MailModule,
    SecurityModule,
    UsersModule,
    AuthModule,
    FilesModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: DomainExceptionFilter },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
