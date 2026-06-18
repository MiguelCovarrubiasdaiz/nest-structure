export interface UserProps {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

export class User {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly passwordHash: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: UserProps) {
    this.id = props.id;
    this.email = props.email;
    this.name = props.name;
    this.passwordHash = props.passwordHash;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(props: UserProps): User {
    if (!props.email.includes('@')) {
      throw new Error('Invalid email');
    }
    if (props.name.trim().length === 0) {
      throw new Error('Name cannot be empty');
    }
    if (props.passwordHash.length === 0) {
      throw new Error('Password hash cannot be empty');
    }
    return new User(props);
  }

  rename(name: string): User {
    return User.create({ ...this, name, updatedAt: new Date() });
  }

  changePassword(passwordHash: string): User {
    return User.create({ ...this, passwordHash, updatedAt: new Date() });
  }
}
