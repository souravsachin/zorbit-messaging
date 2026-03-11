import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TopicController } from '../controllers/topic.controller';
import { TopicManagementService } from '../services/topic-management.service';
import { HashIdService } from '../services/hash-id.service';
import { Topic } from '../models/entities/topic.entity';
import { EventsModule } from './events.module';

@Module({
  imports: [TypeOrmModule.forFeature([Topic]), EventsModule],
  controllers: [TopicController],
  providers: [TopicManagementService, HashIdService],
  exports: [TopicManagementService],
})
export class TopicModule {}
