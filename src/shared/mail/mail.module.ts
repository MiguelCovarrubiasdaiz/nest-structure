import { Global, Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LogMailAdapter } from './adapters/log-mail.adapter';
import { SmtpMailAdapter } from './adapters/smtp-mail.adapter';
import { MAIL_SERVICE } from './mail.tokens';
import type { MailService } from './ports/mail.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: MAIL_SERVICE,
      inject: [ConfigService],
      useFactory: (config: ConfigService): MailService => {
        const driver = config.get<string>('MAIL_DRIVER', 'log');
        Logger.log(`Mail driver: ${driver}`, 'MailModule');
        switch (driver) {
          case 'smtp':
            return new SmtpMailAdapter(config);
          case 'log':
            return new LogMailAdapter(config);
          default:
            throw new Error(`Unknown MAIL_DRIVER: ${driver}`);
        }
      },
    },
  ],
  exports: [MAIL_SERVICE],
})
export class MailModule {}