import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { DeadLetterQueueService } from '../services/dead-letter-queue.service';
import { JwtAuthGuard } from '../middleware/jwt-auth.guard';
import { DeadLetterMessage } from '../models/entities/dead-letter-message.entity';

/**
 * Dead letter queue management endpoints.
 * Global namespace — DLQ is platform-wide infrastructure.
 */
@Controller('api/v1/G/messaging/dlq')
@UseGuards(JwtAuthGuard)
export class DeadLetterQueueController {
  constructor(private readonly dlqService: DeadLetterQueueService) {}

  /**
   * GET /api/v1/G/messaging/dlq
   * List all dead letter messages.
   */
  @Get()
  async findAll(): Promise<Partial<DeadLetterMessage>[]> {
    return this.dlqService.findAll();
  }

  /**
   * POST /api/v1/G/messaging/dlq/:messageId/retry
   * Retry a dead letter message by re-publishing to its original topic.
   */
  @Post(':messageId/retry')
  @HttpCode(HttpStatus.OK)
  async retry(@Param('messageId') messageId: string): Promise<Partial<DeadLetterMessage>> {
    return this.dlqService.retry(messageId);
  }

  /**
   * POST /api/v1/G/messaging/dlq/:messageId/discard
   * Discard a dead letter message permanently.
   */
  @Post(':messageId/discard')
  @HttpCode(HttpStatus.OK)
  async discard(@Param('messageId') messageId: string): Promise<Partial<DeadLetterMessage>> {
    return this.dlqService.discard(messageId);
  }
}
