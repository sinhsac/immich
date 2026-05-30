import { Injectable, NotFoundException } from '@nestjs/common';
import { AuthDto } from 'src/dtos/auth.dto';
import {
  ExtMemoryCreateDto,
  ExtMemoryResponseDto,
  ExtMemorySearchDto,
  ExtMemoryUpdateDto,
} from 'src/extensions/memory/extension-memory.dto';
import { ExtensionMemoryRepository } from 'src/extensions/memory/extension-memory.repository';

@Injectable()
export class ExtensionMemoryService {
  constructor(private repo: ExtensionMemoryRepository) {}

  search(auth: AuthDto, dto: ExtMemorySearchDto): Promise<ExtMemoryResponseDto[]> {
    return this.repo.search(auth.user.id, dto);
  }

  async get(auth: AuthDto, id: string): Promise<ExtMemoryResponseDto> {
    return this.findOrFail(auth.user.id, id);
  }

  create(auth: AuthDto, dto: ExtMemoryCreateDto): Promise<ExtMemoryResponseDto> {
    return this.repo.create(auth.user.id, dto);
  }

  async update(auth: AuthDto, id: string, dto: ExtMemoryUpdateDto): Promise<ExtMemoryResponseDto> {
    await this.findOrFail(auth.user.id, id);
    return this.repo.update(id, dto);
  }

  async remove(auth: AuthDto, id: string): Promise<void> {
    await this.findOrFail(auth.user.id, id);
    return this.repo.delete(id);
  }

  async addAssets(auth: AuthDto, id: string, assetIds: string[]): Promise<void> {
    await this.findOrFail(auth.user.id, id);
    return this.repo.addAssets(id, assetIds);
  }

  async removeAssets(auth: AuthDto, id: string, assetIds: string[]): Promise<void> {
    await this.findOrFail(auth.user.id, id);
    return this.repo.removeAssets(id, assetIds);
  }

  private async findOrFail(ownerId: string, id: string): Promise<ExtMemoryResponseDto> {
    const memory = await this.repo.get(id);
    if (!memory || memory.ownerId !== ownerId) {
      throw new NotFoundException('Extension memory not found');
    }
    return memory;
  }
}
