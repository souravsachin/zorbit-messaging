import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('topics')
export class Topic {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Short hash identifier, e.g. TOP-92AF */
  @Column({ unique: true, length: 20 })
  @Index()
  hashId!: string;

  /** Topic name following domain.entity convention, e.g. "identity.user" */
  @Column({ unique: true, length: 255 })
  @Index()
  name!: string;

  /** Number of partitions for this Kafka topic */
  @Column({ default: 3 })
  partitions!: number;

  /** Replication factor for this Kafka topic */
  @Column({ name: 'replication_factor', default: 1 })
  replicationFactor!: number;

  /** Message retention time in milliseconds (default 7 days) */
  @Column({ name: 'retention_ms', type: 'bigint', default: 604800000 })
  retentionMs!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
