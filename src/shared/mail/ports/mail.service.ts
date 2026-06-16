import type { ReactElement } from 'react';

export interface SendMailInput {
  to: string | string[];
  subject: string;
  template: ReactElement;
  from?: string;
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
}

export interface MailService {
  send(input: SendMailInput): Promise<void>;
}