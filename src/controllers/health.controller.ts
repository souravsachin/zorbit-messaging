import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService, HealthStatus } from '../services/health.service';

/**
 * Health check endpoint.
 * No authentication required — used by load balancers and monitoring.
 */
@ApiTags('health')
@Controller('api/v1/G/messaging/health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Health check', description: 'Check Kafka broker connectivity and overall service health.' })
  @ApiResponse({ status: 200, description: 'Service health status returned.' })
  async check(): Promise<HealthStatus> {
    return this.healthService.check();
  }
}
