import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './modules/auth.module';
import { TopicModule } from './modules/topic.module';
import { DeadLetterQueueModule } from './modules/dead-letter-queue.module';
import { SchemaModule } from './modules/schema.module';
import { HealthModule } from './modules/health.module';
import { MessageRouterModule } from './modules/message-router.module';
import { EventsModule } from './modules/events.module';
import { Topic } from './models/entities/topic.entity';
import { DeadLetterMessage } from './models/entities/dead-letter-message.entity';
import { MessageSchema } from './models/entities/message-schema.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres' as const,
        host: config.get<string>('DATABASE_HOST', 'localhost'),
        port: config.get<number>('DATABASE_PORT', 5432),
        database: config.get<string>('DATABASE_NAME', 'zorbit_messaging'),
        username: config.get<string>('DATABASE_USER', 'zorbit'),
        password: config.get<string>('DATABASE_PASSWORD', 'zorbit_dev'),
        entities: [Topic, DeadLetterMessage, MessageSchema],
        synchronize: config.get<string>('DATABASE_SYNCHRONIZE', 'false') === 'true',
        logging: config.get<string>('NODE_ENV') !== 'production',
      }),
    }),
    AuthModule,
    TopicModule,
    DeadLetterQueueModule,
    SchemaModule,
    HealthModule,
    MessageRouterModule,
    EventsModule,
  ],
})
export class AppModule {}
