import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Jane D.' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;
}
