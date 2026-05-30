import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';
import { ValidateBoolean, ValidateDate, ValidateUUID } from 'src/validation';

export enum ExtMemoryType {
  Location = 'location',
  Person = 'person',
  Album = 'album',
  Season = 'season',
  Custom = 'custom',
}

export class ExtMemoryCreateDto {
  @ApiProperty({ enum: ExtMemoryType })
  @IsEnum(ExtMemoryType)
  type!: ExtMemoryType;

  @IsString()
  title!: string;

  @ValidateUUID({ optional: true })
  nativeMemoryId?: string;

  @IsObject()
  @IsOptional()
  data?: object;

  @ValidateUUID({ optional: true })
  coverAssetId?: string;

  @ValidateBoolean({ optional: true })
  isSaved?: boolean;

  @ValidateDate()
  memoryAt!: Date;

  @ValidateDate({ optional: true })
  showAt?: Date;

  @ValidateDate({ optional: true })
  hideAt?: Date;

  @ValidateUUID({ optional: true, each: true })
  assetIds?: string[];
}

export class ExtMemoryUpdateDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsObject()
  @IsOptional()
  data?: object;

  @ValidateUUID({ optional: true })
  coverAssetId?: string;

  @ValidateBoolean({ optional: true })
  isSaved?: boolean;

  @ValidateDate({ optional: true })
  memoryAt?: Date;

  @ValidateDate({ optional: true })
  seenAt?: Date;

  @ValidateDate({ optional: true })
  showAt?: Date;

  @ValidateDate({ optional: true })
  hideAt?: Date;
}

export class ExtMemorySearchDto {
  @ApiProperty({ enum: ExtMemoryType, required: false })
  @IsEnum(ExtMemoryType)
  @IsOptional()
  type?: ExtMemoryType;

  @ValidateDate({ optional: true })
  for?: Date;

  @ValidateBoolean({ optional: true })
  isSaved?: boolean;
}

export class ExtMemoryResponseDto {
  id!: string;
  nativeMemoryId!: string | null;
  ownerId!: string;
  type!: string;
  title!: string;
  data!: object;
  coverAssetId!: string | null;
  isSaved!: boolean;
  memoryAt!: Date;
  showAt!: Date | null;
  hideAt!: Date | null;
  seenAt!: Date | null;
  createdAt!: Date;
  updatedAt!: Date;
  assetIds!: string[];
}
