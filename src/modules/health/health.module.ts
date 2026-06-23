import { Module } from '@nestjs/common';
import { GetHealthUseCase } from './application/use-cases/get-health.use-case';
import { HEALTH_CHECKER } from './domain/ports/health-checker';
import { HealthController } from './infrastructure/http/health.controller';
import { InMemoryHealthChecker } from './infrastructure/in-memory-health-checker';

@Module({
  controllers: [HealthController],
  providers: [
    GetHealthUseCase,
    { provide: HEALTH_CHECKER, useClass: InMemoryHealthChecker },
  ],
})
export class HealthModule {}
