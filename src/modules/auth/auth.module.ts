import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { UsersModule } from '@modules/users/users.module';
import { LoginUseCase } from './application/use-cases/login.use-case';
import { LogoutUseCase } from './application/use-cases/logout.use-case';
import { RefreshTokenUseCase } from './application/use-cases/refresh-token.use-case';
import { TokenIssuer } from './application/services/token-issuer.service';
import { REFRESH_TOKEN_REPOSITORY } from './domain/ports/refresh-token.repository';
import { TOKEN_SERVICE } from './domain/ports/token.service';
import { AuthController } from './infrastructure/http/auth.controller';
import { JwtAuthGuard } from './infrastructure/http/jwt-auth.guard';
import { DrizzleRefreshTokenRepository } from './infrastructure/persistence/drizzle-refresh-token.repository';
import { JwtTokenService } from './infrastructure/services/jwt-token.service';

@Module({
  imports: [UsersModule, JwtModule.register({})],
  controllers: [AuthController],
  providers: [
    LoginUseCase,
    RefreshTokenUseCase,
    LogoutUseCase,
    TokenIssuer,
    { provide: TOKEN_SERVICE, useClass: JwtTokenService },
    {
      provide: REFRESH_TOKEN_REPOSITORY,
      useClass: DrizzleRefreshTokenRepository,
    },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AuthModule {}
