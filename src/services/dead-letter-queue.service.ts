import {
  Injectable,
  NotFoundException,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Kafka, Producer } from 'kafkajs';
import { DeadLetterMessage, DlqMessageStatus } from '../models/entities/dead-letter-message.entity';
import { HashIdService } from './hash-id.service';
import { EventPublisherService } from '../events/event-publisher.service';
import { MessagingEvents } from '../events/messaging.events';
import { createKafkaConfig } from '../config/kafka.config';

@Injectable()
export class DeadLetterQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DeadLetterQueueService.name);
  private kafka!: Kafka;
  private producer!: Producer;

  constructor(
    @InjectRepository(DeadLetterMessage)
    private readonly dlqRepository: Repository<DeadLetterMessage>,
    private readonly hashIdService: HashIdService,
    private readonly eventPublisher: EventPublisherService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    const kafkaConfig = createKafkaConfig(this.configService);
    this.kafka = new Kafka({
      clientId: `${kafkaConfig.clientId}-dlq`,
      brokers: kafkaConfig.brokers,
    });
    this.producer = this.kafka.producer();

    try {
      await this.producer.connect();
      this.logger.log('DLQ Kafka producer connected');
    } catch (error) {
      this.logger.warn('DLQ Kafka producer connection failed', error);
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
   * List all dead letter messages, optionally filtered by status.
   */
  async findAll(status?: DlqMessageStatus): Promise<Partial<DeadLetterMessage>[]> {
    const where = status ? { status } : {};
    const messages = await this.dlqRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });

    return messages.map((m) => ({
      hashId: m.hashId,
      originalTopic: m.originalTopic,
      errorMessage: m.errorMessage,
      retryCount: m.retryCount,
      status: m.status,
      createdAt: m.createdAt,
    }));
  }

  /**
   * Store a failed message in the dead letter queue.
   */
  async store(
    originalTopic: string,
    originalEvent: Record<string, unknown>,
    errorMessage: string,
  ): Promise<DeadLetterMessage> {
    const hashId = this.hashIdService.generate('DLQ');

    const dlqMessage = this.dlqRepository.create({
      hashId,
      originalTopic,
      originalEvent,
      errorMessage,
      retryCount: 0,
      status: DlqMessageStatus.PENDING,
    });

    await this.dlqRepository.save(dlqMessage);

    await this.eventPublisher.publish(
      MessagingEvents.DLQ_MESSAGE_RECEIVED,
      'G',
      'G',
      {
        dlqHashId: dlqMessage.hashId,
        originalTopic,
        errorMessage,
      },
    );

    this.logger.warn(`Dead letter message stored: ${hashId} from topic ${originalTopic}`);
    return dlqMessage;
  }

  /**
   * Retry a dead letter message by re-publishing it to its original topic.
   */
  async retry(messageHashId: string): Promise<Partial<DeadLetterMessage>> {
    const message = await this.dlqRepository.findOne({
      where: { hashId: messageHashId },
    });

    if (!message) {
      throw new NotFoundException(`Dead letter message ${messageHashId} not found`);
    }

    if (message.status !== DlqMessageStatus.PENDING) {
      throw new NotFoundException(
        `Dead letter message ${messageHashId} is not in pending status (current: ${message.status})`,
      );
    }

    // Re-publish to original topic
    const kafkaTopicName = message.originalTopic.replace(/\./g, '-');
    try {
      await this.producer.send({
        topic: kafkaTopicName,
        messages: [
          {
            value: JSON.stringify(message.originalEvent),
          },
        ],
      });
      this.logger.log(`Retried DLQ message ${messageHashId} to topic ${kafkaTopicName}`);
    } catch (error) {
      this.logger.error(`Failed to retry DLQ message ${messageHashId}`, error);
      throw error;
    }

    message.retryCount += 1;
    message.status = DlqMessageStatus.RETRIED;
    await this.dlqRepository.save(message);

    return {
      hashId: message.hashId,
      originalTopic: message.originalTopic,
      retryCount: message.retryCount,
      status: message.status,
    };
  }

  /**
   * Discard a dead letter message, marking it as permanently failed.
   */
  async discard(messageHashId: string): Promise<Partial<DeadLetterMessage>> {
    const message = await this.dlqRepository.findOne({
      where: { hashId: messageHashId },
    });

    if (!message) {
      throw new NotFoundException(`Dead letter message ${messageHashId} not found`);
    }

    if (message.status !== DlqMessageStatus.PENDING) {
      throw new NotFoundException(
        `Dead letter message ${messageHashId} is not in pending status (current: ${message.status})`,
      );
    }

    message.status = DlqMessageStatus.DISCARDED;
    await this.dlqRepository.save(message);

    this.logger.log(`Discarded DLQ message ${messageHashId}`);

    return {
      hashId: message.hashId,
      originalTopic: message.originalTopic,
      retryCount: message.retryCount,
      status: message.status,
    };
  }
}
