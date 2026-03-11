import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Kafka, Admin } from 'kafkajs';
import { Topic } from '../models/entities/topic.entity';
import { CreateTopicDto } from '../models/dto/create-topic.dto';
import { HashIdService } from './hash-id.service';
import { EventPublisherService } from '../events/event-publisher.service';
import { MessagingEvents } from '../events/messaging.events';
import { createKafkaConfig } from '../config/kafka.config';

export interface TopicStats {
  topicHashId: string;
  name: string;
  partitions: number;
  replicationFactor: number;
  retentionMs: number;
  messageCount?: number;
}

@Injectable()
export class TopicManagementService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TopicManagementService.name);
  private kafka!: Kafka;
  private admin!: Admin;

  constructor(
    @InjectRepository(Topic)
    private readonly topicRepository: Repository<Topic>,
    private readonly hashIdService: HashIdService,
    private readonly eventPublisher: EventPublisherService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    const kafkaConfig = createKafkaConfig(this.configService);
    this.kafka = new Kafka({
      clientId: kafkaConfig.clientId,
      brokers: kafkaConfig.brokers,
    });
    this.admin = this.kafka.admin();

    try {
      await this.admin.connect();
      this.logger.log('Kafka admin client connected');
    } catch (error) {
      this.logger.warn('Kafka admin connection failed — topic operations will fail', error);
    }
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.admin?.disconnect();
    } catch {
      // swallow on shutdown
    }
  }

  /**
   * List all registered topics.
   */
  async findAll(): Promise<Partial<Topic>[]> {
    const topics = await this.topicRepository.find({
      order: { createdAt: 'DESC' },
    });

    return topics.map((t) => ({
      hashId: t.hashId,
      name: t.name,
      partitions: t.partitions,
      replicationFactor: t.replicationFactor,
      retentionMs: t.retentionMs,
      createdAt: t.createdAt,
    }));
  }

  /**
   * Get statistics for a specific topic.
   */
  async getStats(topicHashId: string): Promise<TopicStats> {
    const topic = await this.topicRepository.findOne({
      where: { hashId: topicHashId },
    });

    if (!topic) {
      throw new NotFoundException(`Topic ${topicHashId} not found`);
    }

    // Attempt to get metadata from Kafka
    let messageCount: number | undefined;
    try {
      const kafkaTopicName = topic.name.replace(/\./g, '-');
      const offsets = await this.admin.fetchTopicOffsets(kafkaTopicName);
      messageCount = offsets.reduce((sum, p) => sum + parseInt(p.offset, 10), 0);
    } catch {
      this.logger.warn(`Could not fetch Kafka metadata for topic ${topic.name}`);
    }

    return {
      topicHashId: topic.hashId,
      name: topic.name,
      partitions: topic.partitions,
      replicationFactor: topic.replicationFactor,
      retentionMs: topic.retentionMs,
      messageCount,
    };
  }

  /**
   * Create a new Kafka topic and register it in the database.
   */
  async create(dto: CreateTopicDto): Promise<Partial<Topic>> {
    // Check for duplicate topic name
    const existing = await this.topicRepository.findOne({
      where: { name: dto.name },
    });
    if (existing) {
      throw new ConflictException(`Topic with name "${dto.name}" already exists`);
    }

    const hashId = this.hashIdService.generate('TOP');
    const partitions = dto.partitions ?? 3;
    const replicationFactor = dto.replicationFactor ?? 1;
    const retentionMs = dto.retentionMs ?? 604800000;

    // Create the topic in Kafka
    const kafkaTopicName = dto.name.replace(/\./g, '-');
    try {
      await this.admin.createTopics({
        topics: [
          {
            topic: kafkaTopicName,
            numPartitions: partitions,
            replicationFactor,
            configEntries: [
              { name: 'retention.ms', value: retentionMs.toString() },
            ],
          },
        ],
      });
      this.logger.log(`Created Kafka topic: ${kafkaTopicName}`);
    } catch (error) {
      this.logger.error(`Failed to create Kafka topic: ${kafkaTopicName}`, error);
      throw error;
    }

    // Persist in database
    const topic = this.topicRepository.create({
      hashId,
      name: dto.name,
      partitions,
      replicationFactor,
      retentionMs,
    });

    await this.topicRepository.save(topic);

    await this.eventPublisher.publish(
      MessagingEvents.TOPIC_CREATED,
      'G',
      'G',
      {
        topicHashId: topic.hashId,
        name: topic.name,
        partitions: topic.partitions,
      },
    );

    return {
      hashId: topic.hashId,
      name: topic.name,
      partitions: topic.partitions,
      replicationFactor: topic.replicationFactor,
      retentionMs: topic.retentionMs,
      createdAt: topic.createdAt,
    };
  }

  /**
   * Delete a Kafka topic and remove it from the database.
   */
  async remove(topicHashId: string): Promise<void> {
    const topic = await this.topicRepository.findOne({
      where: { hashId: topicHashId },
    });

    if (!topic) {
      throw new NotFoundException(`Topic ${topicHashId} not found`);
    }

    // Delete from Kafka
    const kafkaTopicName = topic.name.replace(/\./g, '-');
    try {
      await this.admin.deleteTopics({ topics: [kafkaTopicName] });
      this.logger.log(`Deleted Kafka topic: ${kafkaTopicName}`);
    } catch (error) {
      this.logger.error(`Failed to delete Kafka topic: ${kafkaTopicName}`, error);
      throw error;
    }

    await this.topicRepository.remove(topic);

    await this.eventPublisher.publish(
      MessagingEvents.TOPIC_DELETED,
      'G',
      'G',
      { topicHashId, name: topic.name },
    );
  }
}
