import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum DlqStatus {
  PENDING = 'pending',
  RETRIED = 'retried',
  DELETED = 'deleted',
}

@Entity('dlq_messages')
export class DlqMessage {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Short hash identifier, e.g. DLQ-81F3 */
  @Column({ unique: true, length: 20 })
  @Index()
  hashId!: string;

  /** The Kafka topic this message originally came from */
  @Column({ name: 'original_topic', length: 255 })
  @Index()
  originalTopic!: string;

  /** The Kafka message key, if present */
  @Column({ name: 'message_key', length: 255, nullable: true })
  key!: string | null;

  /** The original message payload as JSON */
  @Column({ type: 'jsonb' })
  payload!: Record<string, unknown>;

  /** Error message describing why the message failed */
  @Column({ name: 'error_message', type: 'text' })
  errorMessage!: string;

  /** Number of retry attempts made */
  @Column({ name: 'retry_count', default: 0 })
  retryCount!: number;

  /** Current status of the DLQ message */
  @Column({
    type: 'enum',
    enum: DlqStatus,
    default: DlqStatus.PENDING,
  })
  status!: DlqStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
