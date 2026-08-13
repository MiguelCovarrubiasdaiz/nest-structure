import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '@modules/auth/infrastructure/http/public.decorator';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '@modules/auth/infrastructure/http/current-user.decorator';
import { CreateUserDto } from '../../application/dtos/create-user.dto';
import { ListUsersQueryDto } from '../../application/dtos/list-users.query';
import { UpdateUserDto } from '../../application/dtos/update-user.dto';
import { UserResponse } from '../../application/dtos/user.response';
import { CreateUserUseCase } from '../../application/use-cases/create-user.use-case';
import { DeleteUserUseCase } from '../../application/use-cases/delete-user.use-case';
import { GetUserUseCase } from '../../application/use-cases/get-user.use-case';
import { ListUsersUseCase } from '../../application/use-cases/list-users.use-case';
import { UpdateUserUseCase } from '../../application/use-cases/update-user.use-case';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UserController {
  constructor(
    private readonly createUser: CreateUserUseCase,
    private readonly getUser: GetUserUseCase,
    private readonly listUsers: ListUsersUseCase,
    private readonly updateUser: UpdateUserUseCase,
    private readonly deleteUser: DeleteUserUseCase,
  ) {}

  @Post()
  @Public()
  // Public registration: cap account creation / welcome-email abuse at 5/min/IP.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Register a new user' })
  async create(@Body() dto: CreateUserDto): Promise<UserResponse> {
    const user = await this.createUser.execute(dto);
    return UserResponse.fromDomain(user);
  }

  @Get()
  @ApiOperation({ summary: 'List users (paginated)' })
  async list(@Query() query: ListUsersQueryDto): Promise<UserResponse[]> {
    const users = await this.listUsers.execute({
      limit: query.limit,
      offset: query.offset,
    });
    return users.map(UserResponse.fromDomain);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a user by id' })
  async getOne(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<UserResponse> {
    const user = await this.getUser.execute(id);
    return UserResponse.fromDomain(user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a user (owner only)' })
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() current: AuthenticatedUser,
  ): Promise<UserResponse> {
    const user = await this.updateUser.execute(id, dto, current.id);
    return UserResponse.fromDomain(user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a user (owner only)' })
  async remove(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() current: AuthenticatedUser,
  ): Promise<void> {
    await this.deleteUser.execute(id, current.id);
  }
}
