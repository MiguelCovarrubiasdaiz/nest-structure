import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BcryptPasswordHasher } from './adapters/bcrypt-password-hasher';
import { PASSWORD_HASHER } from './security.tokens';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [{ provide: PASSWORD_HASHER, useClass: BcryptPasswordHasher }],
  exports: [PASSWORD_HASHER],
})
export class SecurityModule {}
