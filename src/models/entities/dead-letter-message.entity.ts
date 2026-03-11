import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum DlqMessageStatus {
  PENDING = 'pending',
  RETRIED = 'retried',
  DISCARDED = 'discarded',
}

@Entity('dead_letter_messages')
export class DeadLetterMessage {
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

  /** The original event payload as JSON */
  @Column({ name: 'original_event', type: 'jsonb' })
  originalEvent!: Record<string, unknown>;

  /** Error message describing why the message failed */
  @Column({ name: 'error_message', type: 'text' })
  errorMessage!: string;

  /** Number of retry attempts made */
  @Column({ name: 'retry_count', default: 0 })
  retryCount!: number;

  /** Current status of the dead letter message */
  @Column({
    type: 'enum',
    enum: DlqMessageStatus,
    default: DlqMessageStatus.PENDING,
  })
  status!: DlqMessageStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
