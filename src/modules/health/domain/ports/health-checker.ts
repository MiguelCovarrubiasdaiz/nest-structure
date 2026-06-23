export const HEALTH_CHECKER = Symbol('HEALTH_CHECKER');

export interface HealthStatus {
  status: 'ok' | 'degraded' | 'down';
  checks: Record<string, 'pass' | 'fail'>;
  uptimeSeconds: number;
}

export interface HealthChecker {
  check(): Promise<HealthStatus>;
}
