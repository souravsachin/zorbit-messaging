import { Controller, Get } from '@nestjs/common';
import { HealthService, HealthStatus } from '../services/health.service';

/**
 * Health check endpoint.
 * No authentication required — used by load balancers and monitoring.
 */
@Controller('api/v1/G/messaging/health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  /**
   * GET /api/v1/G/messaging/health
   * Check Kafka broker connectivity and overall service health.
   */
  @Get()
  async check(): Promise<HealthStatus> {
    return this.healthService.check();
  }
}
