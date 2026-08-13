import { Inject, Injectable } from '@nestjs/common';
import { User } from '../../domain/entities/user.entity';
import {
  UserActionForbiddenException,
  UserNotFoundException,
} from '../../domain/exceptions/user.exceptions';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../../domain/ports/user.repository';
import { UpdateUserDto } from '../dtos/update-user.dto';

@Injectable()
export class UpdateUserUseCase {
  constructor(@Inject(USER_REPOSITORY) private readonly repo: UserRepository) {}

  async execute(
    id: string,
    dto: UpdateUserDto,
    currentUserId: string,
  ): Promise<User> {
    // Ownership: a user may only update their own record (no roles yet).
    if (id !== currentUserId) throw new UserActionForbiddenException();
    const user = await this.repo.findById(id);
    if (!user) throw new UserNotFoundException(id);
    const updated = dto.name ? user.rename(dto.name) : user;
    return this.repo.update(updated);
  }
}
