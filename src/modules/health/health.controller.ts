import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckResult,
  HealthCheckService,
  MemoryHealthIndicator,
} from '@nestjs/terminus';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '@modules/auth/infrastructure/http/public.decorator';
import { DrizzleHealthIndicator } from './drizzle-health.indicator';

@ApiTags('health')
@Controller('health')
@SkipThrottle()
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: DrizzleHealthIndicator,
    private readonly memory: MemoryHealthIndicator,
  ) {}

  /**
   * Liveness probe — is the process up and responsive at all?
   * Should NOT check dependencies. Used by orchestrators (K8s) to decide
   * whether to restart the container.
   */
  @Get('live')
  @Public()
  @HealthCheck()
  @ApiOperation({ summary: 'Liveness probe (process up)' })
  live(): HealthCheckResult {
    return {
      status: 'ok',
      info: { process: { status: 'up' } },
      error: {},
      details: { process: { status: 'up' } },
    };
  }

  /**
   * Readiness probe — is the process ready to receive traffic?
   * Checks downstream deps (DB) and rejects if any are down. Orchestrators
   * use it to gate traffic to a pod without restarting it.
   */
  @Get('ready')
  @Public()
  @HealthCheck()
  @ApiOperation({ summary: 'Readiness probe (deps available)' })
  ready(): Promise<HealthCheckResult> {
    return this.health.check([
      () => this.db.pingCheck('database'),
      () => this.memory.checkHeap('memory_heap', 512 * 1024 * 1024),
    ]);
  }
}
