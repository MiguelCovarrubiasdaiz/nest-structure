import { render } from '@react-email/render';
import * as React from 'react';
import type { MailTemplate } from '../ports/mail.service';
import { WelcomeEmail } from './welcome.email';

export interface RenderedMail {
  html: string;
  text: string;
}

/**
 * Turns a neutral `MailTemplate` (from the mail port) into rendered HTML + text.
 * This is the single place where React Email is coupled to the app — the
 * application layer never touches it.
 */
export async function renderMailTemplate(
  template: MailTemplate,
): Promise<RenderedMail> {
  const element = selectElement(template);
  const [html, text] = await Promise.all([
    render(element),
    render(element, { plainText: true }),
  ]);
  return { html, text };
}

function selectElement(template: MailTemplate): React.ReactElement {
  switch (template.id) {
    case 'welcome':
      return React.createElement(WelcomeEmail, template.data);
    default: {
      const exhaustive: never = template.id;
      throw new Error(`Unknown mail template: ${String(exhaustive)}`);
    }
  }
}
