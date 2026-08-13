import { plainToInstance, Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  MinLength,
  ValidateIf,
  validateSync,
} from 'class-validator';

// "15m", "7d", "3600" — a positive integer with an optional s/m/h/d unit.
const DURATION_REGEX = /^\d+[smhd]?$/;

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

  // Comma-separated list of allowed CORS origins. When omitted, CORS is disabled.
  @IsOptional()
  @IsString()
  CORS_ORIGIN?: string;

  @IsString()
  DATABASE_URL!: string;

  @Transform(toBool)
  @IsBoolean()
  DATABASE_SSL!: boolean;

  @IsEnum(StorageDriver)
  STORAGE_DRIVER!: StorageDriver;

  @ValidateIf(
    (o: EnvironmentVariables) => o.STORAGE_DRIVER === StorageDriver.Local,
  )
  @IsString()
  STORAGE_LOCAL_PATH?: string;

  @IsOptional()
  @IsString()
  STORAGE_LOCAL_PUBLIC_URL?: string;

  @ValidateIf(
    (o: EnvironmentVariables) => o.STORAGE_DRIVER === StorageDriver.S3,
  )
  @IsString()
  STORAGE_S3_BUCKET?: string;

  @ValidateIf(
    (o: EnvironmentVariables) => o.STORAGE_DRIVER === StorageDriver.S3,
  )
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

  @IsString()
  @MinLength(32)
  JWT_ACCESS_SECRET!: string;

  @IsString()
  @Matches(DURATION_REGEX, {
    message:
      'JWT_ACCESS_EXPIRES_IN must be a number optionally suffixed with s/m/h/d (e.g. "15m")',
  })
  JWT_ACCESS_EXPIRES_IN: string = '15m';

  @IsString()
  @MinLength(32)
  JWT_REFRESH_SECRET!: string;

  @IsString()
  @Matches(DURATION_REGEX, {
    message:
      'JWT_REFRESH_EXPIRES_IN must be a number optionally suffixed with s/m/h/d (e.g. "7d")',
  })
  JWT_REFRESH_EXPIRES_IN: string = '7d';

  @IsInt()
  @Min(4)
  @Max(15)
  BCRYPT_ROUNDS: number = 10;
}

export function validateEnv(
  config: Record<string, unknown>,
): EnvironmentVariables {
  // NOTE: do NOT enable implicit conversion. class-transformer's implicit
  // boolean coercion does `Boolean("false") === true`, which silently breaks
  // any boolean env flag. We rely on explicit @Transform decorators for
  // type coercion (toBool for booleans, Number for ints).
  const coerced: Record<string, unknown> = { ...config };
  for (const key of ['PORT', 'MAIL_SMTP_PORT', 'BCRYPT_ROUNDS']) {
    if (typeof coerced[key] === 'string') coerced[key] = Number(coerced[key]);
  }
  const validated = plainToInstance(EnvironmentVariables, coerced);
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
