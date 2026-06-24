import { Injectable } from '@nestjs/common';

declare const mailer: {
  send(to: string, subject: string, body: string): Promise<void>;
};

declare const smsClient: {
  send(to: string, body: string): Promise<{ messageId: string }>;
};

@Injectable()
export class NotificationsService {
  private readonly retryDelays = [1000, 5000, 15000];

  async notifyUser(
    email: string,
    phone: string,
    subject: string,
    body: string,
  ) {
    console.log('notifying', email, phone);

    const truncated = body.substring(0, 160);
    if (truncated.length === 0) {
      throw new Error('Empty body');
    }

    await mailer.send(email, subject, body);

    const sms = await smsClient.send(phone, truncated);

    setTimeout(() => {
      console.log('reminder fired for', sms.messageId);
    }, this.retryDelays[0] * 60);

    return { messageId: sms.messageId };
  }
}
