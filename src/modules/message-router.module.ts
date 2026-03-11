import { Module } from '@nestjs/common';
import { MessageRouterService } from '../services/message-router.service';
import { SchemaModule } from './schema.module';

@Module({
  imports: [SchemaModule],
  providers: [MessageRouterService],
  exports: [MessageRouterService],
})
export class MessageRouterModule {}
