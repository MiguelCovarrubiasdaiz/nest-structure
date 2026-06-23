import { Injectable } from '@nestjs/common';
import type {
  HealthChecker,
  HealthStatus,
} from '../domain/ports/health-checker';

@Injectable()
export class InMemoryHealthChecker implements HealthChecker {
  private readonly startedAt = Date.now();

  async check(): Promise<HealthStatus> {
    const uptimeSeconds = Math.floor((Date.now() - this.startedAt) / 1000);
    return {
      status: 'ok',
      checks: { process: 'pass' },
      uptimeSeconds,
    };
  }
}
