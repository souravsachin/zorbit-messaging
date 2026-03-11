import { IsNotEmpty, IsString, IsOptional, IsNumber, Min } from 'class-validator';

export class CreateTopicDto {
  /**
   * Topic name following domain.entity convention.
   * Example: "identity.user", "policy.claim"
   */
  @IsString()
  @IsNotEmpty()
  name!: string;

  /** Number of partitions (default 3) */
  @IsOptional()
  @IsNumber()
  @Min(1)
  partitions?: number;

  /** Replication factor (default 1) */
  @IsOptional()
  @IsNumber()
  @Min(1)
  replicationFactor?: number;

  /** Retention in milliseconds (default 7 days = 604800000) */
  @IsOptional()
  @IsNumber()
  @Min(0)
  retentionMs?: number;
}
