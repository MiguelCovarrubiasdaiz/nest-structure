import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnv,
    }),
    // Global rate limit: 100 requests / minute / IP. Auth and registration
    // endpoints tighten this further with @Throttle (see their controllers).
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    DatabaseModule,
    StorageModule,
    MailModule,
    SecurityModule,
    UsersModule,
    AuthModule,
    FilesModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: DomainExceptionFilter },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
