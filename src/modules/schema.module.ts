import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SchemaValidationService } from '../services/schema-validation.service';
import { HashIdService } from '../services/hash-id.service';
import { MessageSchema } from '../models/entities/message-schema.entity';

@Module({
  imports: [TypeOrmModule.forFeature([MessageSchema])],
  providers: [SchemaValidationService, HashIdService],
  exports: [SchemaValidationService],
})
export class SchemaModule {}
