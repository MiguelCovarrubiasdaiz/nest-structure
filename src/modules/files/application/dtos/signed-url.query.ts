import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

// 7 days — the maximum expiry S3 presigned URLs support.
const MAX_EXPIRES_IN = 604800;

export class SignedUrlQueryDto {
  @ApiProperty({ example: '2026/1f0c….jpg', description: 'Full storage key' })
  @IsString()
  @IsNotEmpty()
  key!: string;

  @ApiPropertyOptional({ minimum: 1, maximum: MAX_EXPIRES_IN, default: 3600 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_EXPIRES_IN)
  expiresIn: number = 3600;
}
