import { Module } from '@nestjs/common';
import { USER_REPOSITORY } from './domain/ports/user.repository';
import { CreateUserUseCase } from './application/use-cases/create-user.use-case';
import { DeleteUserUseCase } from './application/use-cases/delete-user.use-case';
import { GetUserUseCase } from './application/use-cases/get-user.use-case';
import { ListUsersUseCase } from './application/use-cases/list-users.use-case';
import { UpdateUserUseCase } from './application/use-cases/update-user.use-case';
import { UserController } from './infrastructure/http/user.controller';
import { DrizzleUserRepository } from './infrastructure/persistence/drizzle-user.repository';

@Module({
  controllers: [UserController],
  providers: [
    CreateUserUseCase,
    GetUserUseCase,
    ListUsersUseCase,
    UpdateUserUseCase,
    DeleteUserUseCase,
    { provide: USER_REPOSITORY, useClass: DrizzleUserRepository },
  ],
  exports: [GetUserUseCase, USER_REPOSITORY],
})
export class UsersModule {}
