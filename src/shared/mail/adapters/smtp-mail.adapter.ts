import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';
import type { MailService, SendMailInput } from '../ports/mail.service';
import { renderMailTemplate } from '../templates/render-template';

@Injectable()
export class SmtpMailAdapter implements MailService, OnModuleDestroy {
  private readonly logger = new Logger(SmtpMailAdapter.name);

  private readonly transporter: Transporter;

  private readonly defaultFrom: string;

  constructor(config: ConfigService) {
    const host = config.getOrThrow<string>('MAIL_SMTP_HOST');
    const port = config.get<number>('MAIL_SMTP_PORT', 587);
    const secure = config.get<boolean>('MAIL_SMTP_SECURE', false);
    const user = config.get<string>('MAIL_SMTP_USER');
    const pass = config.get<string>('MAIL_SMTP_PASS');
    this.defaultFrom = config.getOrThrow<string>('MAIL_FROM');

    this.transporter = createTransport({
      host,
      port,
      secure,
      auth: user && pass ? { user, pass } : undefined,
    });
    this.logger.log(`SMTP ready ${host}:${port}`);
  }

  async send(input: SendMailInput): Promise<void> {
    const { html, text } = await renderMailTemplate(input.template);
    await this.transporter.sendMail({
      from: input.from ?? this.defaultFrom,
      to: input.to,
      cc: input.cc,
      bcc: input.bcc,
      replyTo: input.replyTo,
      subject: input.subject,
      html,
      text,
    });
  }

  onModuleDestroy(): void {
    this.transporter.close();
  }
}
