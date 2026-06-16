import { plainToInstance, Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateIf,
  validateSync,
} from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export enum StorageDriver {
  Local = 'local',
  S3 = 's3',
}

export enum MailDriver {
  Log = 'log',
  Smtp = 'smtp',
}

const toBool = ({ value }: { value: unknown }): unknown => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const v = value.trim().toLowerCase();
    if (['true', '1', 'yes'].includes(v)) return true;
    if (['false', '0', 'no', ''].includes(v)) return false;
  }
  return value;
};

export class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV!: Environment;

  @IsInt()
  @Min(0)
  @Max(65535)
  PORT!: number;

  @IsString()
  API_PREFIX!: string;

  @IsString()
  DATABASE_URL!: string;

  @Transform(toBool)
  @IsBoolean()
  DATABASE_SSL!: boolean;

  @IsEnum(StorageDriver)
  STORAGE_DRIVER!: StorageDriver;

  @ValidateIf((o: EnvironmentVariables) => o.STORAGE_DRIVER === StorageDriver.Local)
  @IsString()
  STORAGE_LOCAL_PATH?: string;

  @IsOptional()
  @IsString()
  STORAGE_LOCAL_PUBLIC_URL?: string;

  @ValidateIf((o: EnvironmentVariables) => o.STORAGE_DRIVER === StorageDriver.S3)
  @IsString()
  STORAGE_S3_BUCKET?: string;

  @ValidateIf((o: EnvironmentVariables) => o.STORAGE_DRIVER === StorageDriver.S3)
  @IsString()
  STORAGE_S3_REGION?: string;

  @IsOptional()
  @IsString()
  STORAGE_S3_ENDPOINT?: string;

  @IsOptional()
  @IsString()
  STORAGE_S3_ACCESS_KEY?: string;

  @IsOptional()
  @IsString()
  STORAGE_S3_SECRET_KEY?: string;

  @IsOptional()
  @IsString()
  STORAGE_S3_PUBLIC_URL?: string;

  @IsEnum(MailDriver)
  MAIL_DRIVER!: MailDriver;

  @IsEmail()
  MAIL_FROM!: string;

  @ValidateIf((o: EnvironmentVariables) => o.MAIL_DRIVER === MailDriver.Smtp)
  @IsString()
  MAIL_SMTP_HOST?: string;

  @ValidateIf((o: EnvironmentVariables) => o.MAIL_DRIVER === MailDriver.Smtp)
  @IsInt()
  @Min(1)
  @Max(65535)
  MAIL_SMTP_PORT?: number;

  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  MAIL_SMTP_SECURE?: boolean;

  @IsOptional()
  @IsString()
  MAIL_SMTP_USER?: string;

  @IsOptional()
  @IsString()
  MAIL_SMTP_PASS?: string;
}

export function validateEnv(config: Record<string, unknown>): EnvironmentVariables {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });
  if (errors.length > 0) {
    const messages = errors
      .flatMap((e) => Object.values(e.constraints ?? {}))
      .map((m) => `  • ${m}`)
      .join('\n');
    throw new Error(`Invalid environment variables:\n${messages}`);
  }
  return validated;
}