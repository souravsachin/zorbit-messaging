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
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { TopicManagementService, TopicStats } from '../services/topic-management.service';
import { CreateTopicDto } from '../models/dto/create-topic.dto';
import { JwtAuthGuard } from '../middleware/jwt-auth.guard';
import { Topic } from '../models/entities/topic.entity';

/**
 * Topic management endpoints.
 * Global namespace — messaging infrastructure is platform-wide.
 */
@ApiTags('topics')
@ApiBearerAuth()
@Controller('api/v1/G/messaging/topics')
@UseGuards(JwtAuthGuard)
export class TopicController {
  constructor(private readonly topicService: TopicManagementService) {}

  @Get()
  @ApiOperation({ summary: 'List topics', description: 'List all registered Kafka topics.' })
  @ApiResponse({ status: 200, description: 'List of topics returned.' })
  async findAll(): Promise<Partial<Topic>[]> {
    return this.topicService.findAll();
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create topic', description: 'Create a new Kafka topic.' })
  @ApiResponse({ status: 201, description: 'Topic created successfully.' })
  async create(@Body() dto: CreateTopicDto): Promise<Partial<Topic>> {
    return this.topicService.create(dto);
  }

  @Get(':topicId/stats')
  @ApiOperation({ summary: 'Get topic statistics', description: 'Get statistics for a specific topic.' })
  @ApiParam({ name: 'topicId', description: 'Topic short hash ID', example: 'TOP-92AF' })
  @ApiResponse({ status: 200, description: 'Topic statistics returned.' })
  @ApiResponse({ status: 404, description: 'Topic not found.' })
  async getStats(@Param('topicId') topicId: string): Promise<TopicStats> {
    return this.topicService.getStats(topicId);
  }

  @Delete(':topicId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete topic', description: 'Delete a Kafka topic.' })
  @ApiParam({ name: 'topicId', description: 'Topic short hash ID', example: 'TOP-92AF' })
  @ApiResponse({ status: 204, description: 'Topic deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Topic not found.' })
  async remove(@Param('topicId') topicId: string): Promise<void> {
    return this.topicService.remove(topicId);
  }
}
