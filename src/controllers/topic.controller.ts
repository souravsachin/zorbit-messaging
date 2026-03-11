import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { TopicManagementService, TopicStats } from '../services/topic-management.service';
import { CreateTopicDto } from '../models/dto/create-topic.dto';
import { JwtAuthGuard } from '../middleware/jwt-auth.guard';
import { Topic } from '../models/entities/topic.entity';

/**
 * Topic management endpoints.
 * Global namespace — messaging infrastructure is platform-wide.
 */
@Controller('api/v1/G/messaging/topics')
@UseGuards(JwtAuthGuard)
export class TopicController {
  constructor(private readonly topicService: TopicManagementService) {}

  /**
   * GET /api/v1/G/messaging/topics
   * List all registered topics.
   */
  @Get()
  async findAll(): Promise<Partial<Topic>[]> {
    return this.topicService.findAll();
  }

  /**
   * POST /api/v1/G/messaging/topics
   * Create a new Kafka topic.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateTopicDto): Promise<Partial<Topic>> {
    return this.topicService.create(dto);
  }

  /**
   * GET /api/v1/G/messaging/topics/:topicId/stats
   * Get statistics for a specific topic.
   */
  @Get(':topicId/stats')
  async getStats(@Param('topicId') topicId: string): Promise<TopicStats> {
    return this.topicService.getStats(topicId);
  }

  /**
   * DELETE /api/v1/G/messaging/topics/:topicId
   * Delete a Kafka topic.
   */
  @Delete(':topicId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('topicId') topicId: string): Promise<void> {
    return this.topicService.remove(topicId);
  }
}
