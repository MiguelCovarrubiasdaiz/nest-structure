import { Inject, Injectable } from '@nestjs/common';
import { UserNotFoundException } from '../../domain/exceptions/user.exceptions';
import { USER_REPOSITORY, type UserRepository } from '../../domain/ports/user.repository';

@Injectable()
export class DeleteUserUseCase {
  constructor(@Inject(USER_REPOSITORY) private readonly repo: UserRepository) {}

  async execute(id: string): Promise<void> {
    const user = await this.repo.findById(id);
    if (!user) throw new UserNotFoundException(id);
    await this.repo.delete(id);
  }
}