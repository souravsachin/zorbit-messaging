import { IsNotEmpty, IsString, IsOptional, IsNumber, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTopicDto {
  /**
   * Topic name following domain.entity convention.
   * Example: "identity.user", "policy.claim"
   */
  @ApiProperty({ description: 'Topic name following domain.entity convention', example: 'identity.user' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  /** Number of partitions (default 3) */
  @ApiPropertyOptional({ description: 'Number of partitions', example: 3, default: 3 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  partitions?: number;

  /** Replication factor (default 1) */
  @ApiPropertyOptional({ description: 'Replication factor', example: 1, default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  replicationFactor?: number;

  /** Retention in milliseconds (default 7 days = 604800000) */
  @ApiPropertyOptional({ description: 'Retention in milliseconds (default 7 days)', example: 604800000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  retentionMs?: number;
}
