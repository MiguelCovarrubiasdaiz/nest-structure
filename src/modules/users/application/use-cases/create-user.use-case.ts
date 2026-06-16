import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import * as React from 'react';
import { MAIL_SERVICE } from '@shared/mail/mail.tokens';
import type { MailService } from '@shared/mail/ports/mail.service';
import { WelcomeEmail } from '@shared/mail/templates/welcome.email';
import { User } from '../../domain/entities/user.entity';
import { UserAlreadyExistsException } from '../../domain/exceptions/user.exceptions';
import { USER_REPOSITORY, type UserRepository } from '../../domain/ports/user.repository';
import { CreateUserDto } from '../dtos/create-user.dto';


@Injectable()
export class CreateUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly repo: UserRepository,
    @Inject(MAIL_SERVICE) private readonly mail: MailService,
  ) {}

  async execute(dto: CreateUserDto): Promise<User> {
    const existing = await this.repo.findByEmail(dto.email);
    if (existing) {
      throw new UserAlreadyExistsException(dto.email);
    }
    const now = new Date();
    const user = User.create({
      id: randomUUID(),
      email: dto.email,
      name: dto.name,
      createdAt: now,
      updatedAt: now,
    });
    const saved = await this.repo.save(user);

    await this.mail.send({
      to: saved.email,
      subject: 'Welcome!',
      template: React.createElement(WelcomeEmail, {
        name: saved.name,
        ctaUrl: 'https://example.com/app',
      }),
    });

    return saved;
  }
}