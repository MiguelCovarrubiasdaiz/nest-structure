import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../domain/entities/user.entity';

export class UserResponse {
  @ApiProperty() id!: string;

  @ApiProperty() email!: string;

  @ApiProperty() name!: string;

  @ApiProperty() createdAt!: Date;

  @ApiProperty() updatedAt!: Date;

  static fromDomain(user: User): UserResponse {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
