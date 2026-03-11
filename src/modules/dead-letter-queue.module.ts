import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeadLetterQueueController } from '../controllers/dead-letter-queue.controller';
import { DeadLetterQueueService } from '../services/dead-letter-queue.service';
import { HashIdService } from '../services/hash-id.service';
import { DeadLetterMessage } from '../models/entities/dead-letter-message.entity';
import { EventsModule } from './events.module';

@Module({
  imports: [TypeOrmModule.forFeature([DeadLetterMessage]), EventsModule],
  controllers: [DeadLetterQueueController],
  providers: [DeadLetterQueueService, HashIdService],
  exports: [DeadLetterQueueService],
})
export class DeadLetterQueueModule {}
