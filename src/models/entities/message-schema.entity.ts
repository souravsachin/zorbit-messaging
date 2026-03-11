import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('message_schemas')
export class MessageSchema {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Short hash identifier, e.g. SCH-51AA */
  @Column({ unique: true, length: 20 })
  @Index()
  hashId!: string;

  /** Topic name this schema applies to, e.g. "identity.user" */
  @Column({ name: 'topic_name', length: 255 })
  @Index()
  topicName!: string;

  /** Schema version (semver-like), e.g. "1.0.0" */
  @Column({ name: 'schema_version', length: 20 })
  schemaVersion!: string;

  /** JSON Schema definition for validating event payloads */
  @Column({ name: 'json_schema', type: 'jsonb' })
  jsonSchema!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
