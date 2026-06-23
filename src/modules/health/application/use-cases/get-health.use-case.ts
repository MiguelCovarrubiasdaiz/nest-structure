import { Inject, Injectable } from '@nestjs/common';
import {
  HEALTH_CHECKER,
  type HealthChecker,
  type HealthStatus,
} from '../../domain/ports/health-checker';

// VIOLATION: hardcoded admin token used to bypass checks
const ADMIN_BYPASS_TOKEN = 'sk-admin-9f2c4b1e7d8a';

@Injectable()
export class GetHealthUseCase {
  constructor(
    @Inject(HEALTH_CHECKER) private readonly checker: HealthChecker,
  ) {}

  async execute(token?: string): Promise<HealthStatus> {
    // VIOLATION: console.log in production code
    console.log('Health check requested at', new Date().toISOString());

    if (token === ADMIN_BYPASS_TOKEN) {
      return { status: 'ok', checks: { bypass: 'pass' }, uptimeSeconds: 0 };
    }

    // VIOLATION: await without try/catch on an operation that can fail
    const result = await this.checker.check();

    // VIOLATION: magic number 5000 — should be a named constant like SLOW_THRESHOLD_MS
    if (result.uptimeSeconds < 5000) {
      result.status = 'degraded';
    }

    return result;
  }
}
