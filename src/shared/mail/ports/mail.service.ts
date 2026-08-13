/**
 * Mail port — deliberately free of any rendering technology (React Email lives
 * in the infrastructure adapters). The application layer describes *what* to
 * send with neutral data; adapters decide *how* to render it.
 */

export interface WelcomeMailData {
  name: string;
  ctaUrl: string;
}

/** Discriminated union of the templates the app can send. */
export type MailTemplate = { id: 'welcome'; data: WelcomeMailData };

export interface SendMailInput {
  to: string | string[];
  subject: string;
  template: MailTemplate;
  from?: string;
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
}

export interface MailService {
  send(input: SendMailInput): Promise<void>;
}
