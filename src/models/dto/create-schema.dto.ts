import { IsNotEmpty, IsString, IsObject } from 'class-validator';

export class CreateSchemaDto {
  /** Topic name this schema applies to */
  @IsString()
  @IsNotEmpty()
  topicName!: string;

  /** Schema version, e.g. "1.0.0" */
  @IsString()
  @IsNotEmpty()
  schemaVersion!: string;

  /** JSON Schema definition */
  @IsObject()
  @IsNotEmpty()
  jsonSchema!: Record<string, unknown>;
}
