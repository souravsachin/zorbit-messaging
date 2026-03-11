import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Ajv from 'ajv';
import { MessageSchema } from '../models/entities/message-schema.entity';
import { CreateSchemaDto } from '../models/dto/create-schema.dto';
import { HashIdService } from './hash-id.service';

@Injectable()
export class SchemaValidationService {
  private readonly logger = new Logger(SchemaValidationService.name);
  private readonly ajv = new Ajv({ allErrors: true });

  constructor(
    @InjectRepository(MessageSchema)
    private readonly schemaRepository: Repository<MessageSchema>,
    private readonly hashIdService: HashIdService,
  ) {}

  /**
   * Register a new schema for a topic.
   */
  async registerSchema(dto: CreateSchemaDto): Promise<Partial<MessageSchema>> {
    // Check for duplicate version on the same topic
    const existing = await this.schemaRepository.findOne({
      where: { topicName: dto.topicName, schemaVersion: dto.schemaVersion },
    });
    if (existing) {
      throw new ConflictException(
        `Schema version ${dto.schemaVersion} already exists for topic ${dto.topicName}`,
      );
    }

    // Validate that the JSON schema itself is valid
    try {
      this.ajv.compile(dto.jsonSchema);
    } catch (error) {
      throw new BadRequestException(`Invalid JSON Schema: ${(error as Error).message}`);
    }

    const hashId = this.hashIdService.generate('SCH');

    const schema = this.schemaRepository.create({
      hashId,
      topicName: dto.topicName,
      schemaVersion: dto.schemaVersion,
      jsonSchema: dto.jsonSchema,
    });

    await this.schemaRepository.save(schema);

    return {
      hashId: schema.hashId,
      topicName: schema.topicName,
      schemaVersion: schema.schemaVersion,
      createdAt: schema.createdAt,
    };
  }

  /**
   * Validate a message payload against the latest schema for a topic.
   * Returns true if valid, throws BadRequestException if invalid.
   */
  async validate(topicName: string, payload: unknown): Promise<boolean> {
    const schema = await this.schemaRepository.findOne({
      where: { topicName },
      order: { createdAt: 'DESC' },
    });

    if (!schema) {
      // No schema registered — allow the message through
      this.logger.debug(`No schema registered for topic ${topicName}, skipping validation`);
      return true;
    }

    const validate = this.ajv.compile(schema.jsonSchema);
    const valid = validate(payload);

    if (!valid) {
      const errors = validate.errors?.map((e) => `${e.instancePath} ${e.message}`).join('; ');
      throw new BadRequestException(`Schema validation failed: ${errors}`);
    }

    return true;
  }

  /**
   * List all schemas for a given topic.
   */
  async findByTopic(topicName: string): Promise<Partial<MessageSchema>[]> {
    const schemas = await this.schemaRepository.find({
      where: { topicName },
      order: { createdAt: 'DESC' },
    });

    return schemas.map((s) => ({
      hashId: s.hashId,
      topicName: s.topicName,
      schemaVersion: s.schemaVersion,
      jsonSchema: s.jsonSchema,
      createdAt: s.createdAt,
    }));
  }

  /**
   * Get a specific schema by hashId.
   */
  async findOne(schemaHashId: string): Promise<Partial<MessageSchema>> {
    const schema = await this.schemaRepository.findOne({
      where: { hashId: schemaHashId },
    });

    if (!schema) {
      throw new NotFoundException(`Schema ${schemaHashId} not found`);
    }

    return {
      hashId: schema.hashId,
      topicName: schema.topicName,
      schemaVersion: schema.schemaVersion,
      jsonSchema: schema.jsonSchema,
      createdAt: schema.createdAt,
    };
  }
}
