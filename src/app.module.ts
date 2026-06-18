import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
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
    DatabaseModule,
    StorageModule,
    MailModule,
    SecurityModule,
    UsersModule,
    AuthModule,
    FilesModule,
  ],
  providers: [{ provide: APP_FILTER, useClass: DomainExceptionFilter }],
})
export class AppModule {}
