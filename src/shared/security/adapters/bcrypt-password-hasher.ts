import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import type { PasswordHasher } from '../ports/password-hasher.service';

@Injectable()
export class BcryptPasswordHasher implements PasswordHasher {
  private readonly rounds: number;

  constructor(config: ConfigService) {
    this.rounds = config.get<number>('BCRYPT_ROUNDS', 10);
  }

  hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, this.rounds);
  }

  compare(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }
}
