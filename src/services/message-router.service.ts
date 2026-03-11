import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Producer } from 'kafkajs';
import { createKafkaConfig } from '../config/kafka.config';
import { SchemaValidationService } from './schema-validation.service';

export interface RouteMessage {
  sourceTopic: string;
  targetTopic: string;
  payload: Record<string, unknown>;
  key?: string;
}

/**
 * Routes messages between Kafka topics with optional schema validation.
 */
@Injectable()
export class MessageRouterService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MessageRouterService.name);
  private kafka!: Kafka;
  private producer!: Producer;

  constructor(
    private readonly configService: ConfigService,
    private readonly schemaValidationService: SchemaValidationService,
  ) {}

  async onModuleInit(): Promise<void> {
    const kafkaConfig = createKafkaConfig(this.configService);
    this.kafka = new Kafka({
      clientId: `${kafkaConfig.clientId}-router`,
      brokers: kafkaConfig.brokers,
    });
    this.producer = this.kafka.producer();

    try {
      await this.producer.connect();
      this.logger.log('Message router Kafka producer connected');
    } catch (error) {
      this.logger.warn('Message router Kafka producer connection failed', error);
    }
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.producer?.disconnect();
    } catch {
      // swallow on shutdown
    }
  }

  /**
   * Route a message from one topic to another with optional schema validation.
   */
  async route(message: RouteMessage): Promise<void> {
    // Validate against target topic schema if one exists
    await this.schemaValidationService.validate(message.targetTopic, message.payload);

    const kafkaTopicName = message.targetTopic.replace(/\./g, '-');

    try {
      await this.producer.send({
        topic: kafkaTopicName,
        messages: [
          {
            key: message.key ?? null,
            value: JSON.stringify(message.payload),
          },
        ],
      });
      this.logger.debug(
        `Routed message from ${message.sourceTopic} to ${message.targetTopic}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to route message from ${message.sourceTopic} to ${message.targetTopic}`,
        error,
      );
      throw error;
    }
  }
}
