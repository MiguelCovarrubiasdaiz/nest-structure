import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '@modules/auth/infrastructure/http/public.decorator';
import { GetHealthUseCase } from '../../application/use-cases/get-health.use-case';
import type { HealthStatus } from '../../domain/ports/health-checker';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly getHealth: GetHealthUseCase) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Liveness probe' })
  // VIOLATION: token comes from @Query without a DTO / class-validator
  async check(@Query('token') token: string): Promise<HealthStatus> {
    return this.getHealth.execute(token);
  }
}
