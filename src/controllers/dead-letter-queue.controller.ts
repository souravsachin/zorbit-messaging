import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { DeadLetterQueueService } from '../services/dead-letter-queue.service';
import { JwtAuthGuard } from '../middleware/jwt-auth.guard';
import { DeadLetterMessage } from '../models/entities/dead-letter-message.entity';

/**
 * Dead letter queue management endpoints.
 * Global namespace — DLQ is platform-wide infrastructure.
 */
@ApiTags('dlq')
@ApiBearerAuth()
@Controller('api/v1/G/messaging/dlq')
@UseGuards(JwtAuthGuard)
export class DeadLetterQueueController {
  constructor(private readonly dlqService: DeadLetterQueueService) {}

  @Get()
  @ApiOperation({ summary: 'List dead letter messages', description: 'List all dead letter messages.' })
  @ApiResponse({ status: 200, description: 'List of dead letter messages returned.' })
  async findAll(): Promise<Partial<DeadLetterMessage>[]> {
    return this.dlqService.findAll();
  }

  @Post(':messageId/retry')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Retry dead letter message', description: 'Retry a dead letter message by re-publishing to its original topic.' })
  @ApiParam({ name: 'messageId', description: 'Dead letter message short hash ID', example: 'DLQ-81F3' })
  @ApiResponse({ status: 200, description: 'Message retried successfully.' })
  @ApiResponse({ status: 404, description: 'Message not found.' })
  async retry(@Param('messageId') messageId: string): Promise<Partial<DeadLetterMessage>> {
    return this.dlqService.retry(messageId);
  }

  @Post(':messageId/discard')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Discard dead letter message', description: 'Discard a dead letter message permanently.' })
  @ApiParam({ name: 'messageId', description: 'Dead letter message short hash ID', example: 'DLQ-81F3' })
  @ApiResponse({ status: 200, description: 'Message discarded successfully.' })
  @ApiResponse({ status: 404, description: 'Message not found.' })
  async discard(@Param('messageId') messageId: string): Promise<Partial<DeadLetterMessage>> {
    return this.dlqService.discard(messageId);
  }
}
