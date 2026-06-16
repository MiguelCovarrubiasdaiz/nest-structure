import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { render } from '@react-email/render';
import type { MailService, SendMailInput } from '../ports/mail.service';

@Injectable()
export class LogMailAdapter implements MailService {
  private readonly logger = new Logger(LogMailAdapter.name);
  private readonly defaultFrom: string;

  constructor(config: ConfigService) {
    this.defaultFrom = config.get<string>('MAIL_FROM', 'no-reply@example.com');
  }

  async send(input: SendMailInput): Promise<void> {
    const text = await render(input.template, { plainText: true });
    this.logger.log(
      `\n──────── MAIL ────────\n` +
        `From: ${input.from ?? this.defaultFrom}\n` +
        `To:   ${Array.isArray(input.to) ? input.to.join(', ') : input.to}\n` +
        `Subj: ${input.subject}\n\n${text}\n──────────────────────`,
    );
  }
}