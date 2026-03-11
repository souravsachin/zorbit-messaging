import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Admin } from 'kafkajs';
import { createKafkaConfig } from '../config/kafka.config';

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  kafka: {
    connected: boolean;
    brokerCount: number;
    topicCount: number;
  };
  timestamp: string;
}

/**
 * Checks Kafka broker connectivity and reports health status.
 */
@Injectable()
export class HealthService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(HealthService.name);
  private kafka!: Kafka;
  private admin!: Admin;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const kafkaConfig = createKafkaConfig(this.configService);
    this.kafka = new Kafka({
      clientId: `${kafkaConfig.clientId}-health`,
      brokers: kafkaConfig.brokers,
    });
    this.admin = this.kafka.admin();

    try {
      await this.admin.connect();
      this.logger.log('Health check Kafka admin connected');
    } catch (error) {
      this.logger.warn('Health check Kafka admin connection failed', error);
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
   * Check Kafka cluster health, returning broker count, topic count, and connectivity.
   */
  async check(): Promise<HealthStatus> {
    try {
      const cluster = await this.admin.describeCluster();
      const topics = await this.admin.listTopics();

      return {
        status: cluster.brokers.length > 0 ? 'healthy' : 'degraded',
        kafka: {
          connected: true,
          brokerCount: cluster.brokers.length,
          topicCount: topics.length,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Kafka health check failed', error);
      return {
        status: 'unhealthy',
        kafka: {
          connected: false,
          brokerCount: 0,
          topicCount: 0,
        },
        timestamp: new Date().toISOString(),
      };
    }
  }
}
