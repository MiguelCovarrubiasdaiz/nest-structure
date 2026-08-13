import { Inject, Injectable } from '@nestjs/common';
import { User } from '../../domain/entities/user.entity';
import {
  USER_REPOSITORY,
  type PaginationOptions,
  type UserRepository,
} from '../../domain/ports/user.repository';

@Injectable()
export class ListUsersUseCase {
  constructor(@Inject(USER_REPOSITORY) private readonly repo: UserRepository) {}

  execute(options: PaginationOptions): Promise<User[]> {
    return this.repo.findAll(options);
  }
}
