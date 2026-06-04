// FORK: Extended Memory Metadata Controller
import { BadRequestException, Body, Controller, ForbiddenException, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Kysely } from 'kysely';
import { InjectKysely } from 'nestjs-kysely';
import { AuthDto } from 'src/dtos/auth.dto';
import {
    BulkMemoryMetadataRequestDto,
    ExtMemoryMetadataResponseDto,
    mapExtMemoryMetadata,
} from 'src/dtos/ext-memory-metadata.dto';
import { Auth, Authenticated } from 'src/middleware/auth.guard';
import { ExtMemoryMetadataRepository } from 'src/repositories/ext-memory-metadata.repository';
import { DB } from 'src/schema';
import { UUIDParamDto } from 'src/validation';

@ApiTags('Memory Metadata (Extension)')
@Controller('ext/memory-metadata')
@Authenticated()
export class ExtMemoryMetadataController {
  constructor(
    private repository: ExtMemoryMetadataRepository,
    @InjectKysely() private db: Kysely<DB>,
  ) {}

  @Get(':id')
  async getMemoryMetadata(
    @Auth() auth: AuthDto,
    @Param() { id }: UUIDParamDto,
  ): Promise<ExtMemoryMetadataResponseDto | null> {
    await this.verifyMemoryOwnership(auth.user.id, id);

    const metadata = await this.repository.getByMemoryId(id);
    if (!metadata) {
      return null;
    }

    return mapExtMemoryMetadata(metadata);
  }

  @Post('bulk')
  async getBulkMemoryMetadata(
    @Auth() auth: AuthDto,
    @Body() dto: BulkMemoryMetadataRequestDto,
  ): Promise<ExtMemoryMetadataResponseDto[]> {
    const input = dto as any;
    const memoryIds: string[] = input.memoryIds;

    if (memoryIds.length === 0) {
      return [];
    }

    // Verify ownership for all requested memory IDs
    const ownedMemoryIds = await this.getOwnedMemoryIds(auth.user.id, memoryIds);

    if (ownedMemoryIds.length === 0) {
      return [];
    }

    const metadata = await this.repository.getByMemoryIds(ownedMemoryIds);
    return metadata.map(mapExtMemoryMetadata);
  }

  /**
   * Verifies that the authenticated user owns the specified memory.
   * Throws ForbiddenException if the memory belongs to another user,
   * or BadRequestException if the memory doesn't exist.
   */
  private async verifyMemoryOwnership(userId: string, memoryId: string): Promise<void> {
    const memory = await this.db
      .selectFrom('memory')
      .select(['id', 'ownerId'])
      .where('id', '=', memoryId)
      .where('deletedAt', 'is', null)
      .executeTakeFirst();

    if (!memory) {
      throw new BadRequestException('Memory not found');
    }

    if (memory.ownerId !== userId) {
      throw new ForbiddenException('Cannot access metadata for a memory you do not own');
    }
  }

  /**
   * Filters a list of memory IDs to only those owned by the authenticated user.
   * For the bulk endpoint, we silently filter out unowned memories rather than throwing.
   */
  private async getOwnedMemoryIds(userId: string, memoryIds: string[]): Promise<string[]> {
    const memories = await this.db
      .selectFrom('memory')
      .select('id')
      .where('id', 'in', memoryIds)
      .where('ownerId', '=', userId)
      .where('deletedAt', 'is', null)
      .execute();

    return memories.map((m) => m.id);
  }
}
