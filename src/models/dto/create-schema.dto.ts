import { IsNotEmpty, IsString, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSchemaDto {
  /** Topic name this schema applies to */
  @ApiProperty({ description: 'Topic name this schema applies to', example: 'identity.user' })
  @IsString()
  @IsNotEmpty()
  topicName!: string;

  /** Schema version, e.g. "1.0.0" */
  @ApiProperty({ description: 'Schema version', example: '1.0.0' })
  @IsString()
  @IsNotEmpty()
  schemaVersion!: string;

  /** JSON Schema definition */
  @ApiProperty({ description: 'JSON Schema definition', example: { type: 'object', properties: { id: { type: 'string' } } } })
  @IsObject()
  @IsNotEmpty()
  jsonSchema!: Record<string, unknown>;
}
