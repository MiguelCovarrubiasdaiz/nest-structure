import { Inject, Injectable } from '@nestjs/common';
import {
  UserActionForbiddenException,
  UserNotFoundException,
} from '../../domain/exceptions/user.exceptions';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../../domain/ports/user.repository';

@Injectable()
export class DeleteUserUseCase {
  constructor(@Inject(USER_REPOSITORY) private readonly repo: UserRepository) {}

  async execute(id: string, currentUserId: string): Promise<void> {
    // Ownership: a user may only delete their own record (no roles yet).
    if (id !== currentUserId) throw new UserActionForbiddenException();
    const user = await this.repo.findById(id);
    if (!user) throw new UserNotFoundException(id);
    await this.repo.delete(id);
  }
}
