import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetUserUseCase } from '@modules/users/application/use-cases/get-user.use-case';
import { UserResponse } from '@modules/users/application/dtos/user.response';
import { LoginDto } from '../../application/dtos/login.dto';
import { RefreshTokenDto } from '../../application/dtos/refresh-token.dto';
import { TokenPairResponse } from '../../application/dtos/token-pair.response';
import { LoginUseCase } from '../../application/use-cases/login.use-case';
import { RefreshTokenUseCase } from '../../application/use-cases/refresh-token.use-case';
import { CurrentUser, type AuthenticatedUser } from './current-user.decorator';
import { Public } from './public.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly login: LoginUseCase,
    private readonly refresh: RefreshTokenUseCase,
    private readonly getUser: GetUserUseCase,
  ) {}

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate with email + password' })
  async loginHandler(@Body() dto: LoginDto): Promise<TokenPairResponse> {
    const pair = await this.login.execute(dto);
    return TokenPairResponse.fromDomain(pair);
  }

  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Exchange a refresh token for a new token pair' })
  async refreshHandler(@Body() dto: RefreshTokenDto): Promise<TokenPairResponse> {
    const pair = await this.refresh.execute(dto);
    return TokenPairResponse.fromDomain(pair);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the currently authenticated user' })
  async me(@CurrentUser() current: AuthenticatedUser): Promise<UserResponse> {
    const user = await this.getUser.execute(current.id);
    return UserResponse.fromDomain(user);
  }
}
