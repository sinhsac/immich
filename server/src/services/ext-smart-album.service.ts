// FORK: Smart Album Service
import { BadRequestException, Injectable } from '@nestjs/common';
import { AuthDto } from 'src/dtos/auth.dto';
import {
    CreateSmartAlbumDto,
    SmartAlbumCategory,
    SmartAlbumResponseDto,
    SmartAlbumRuleType,
    SmartAlbumSuggestionDto,
    SmartAlbumWithAssetsResponseDto,
    UpdateSmartAlbumDto,
    mapSmartAlbum,
} from 'src/dtos/ext-smart-album.dto';
import { ExtSmartAlbumRepository } from 'src/repositories/ext-smart-album.repository';
import { LoggingRepository } from 'src/repositories/logging.repository';
import { MachineLearningRepository } from 'src/repositories/machine-learning.repository';
import { SearchRepository } from 'src/repositories/search.repository';

@Injectable()
export class ExtSmartAlbumService {
  constructor(
    private repository: ExtSmartAlbumRepository,
    private logger: LoggingRepository,
    private machineLearningRepository: MachineLearningRepository,
    private searchRepository: SearchRepository,
  ) {
    this.logger.setContext(ExtSmartAlbumService.name);
  }

  async getAll(auth: AuthDto): Promise<SmartAlbumResponseDto[]> {
    const albums = await this.repository.getAll(auth.user.id);
    return albums.map(mapSmartAlbum);
  }

  async getById(auth: AuthDto, id: string): Promise<SmartAlbumResponseDto> {
    const album = await this.repository.getById(id);
    if (!album || album.ownerId !== auth.user.id) {
      throw new BadRequestException('Smart album not found');
    }
    return mapSmartAlbum(album);
  }

  async getAssets(auth: AuthDto, id: string): Promise<SmartAlbumWithAssetsResponseDto> {
    const album = await this.repository.getById(id);
    if (!album || album.ownerId !== auth.user.id) {
      throw new BadRequestException('Smart album not found');
    }

    const assets = await this.repository.getAssets(id);

    return {
      id: album.id,
      name: album.name,
      assets,
      totalAssets: assets.length,
    };
  }

  async create(auth: AuthDto, dto: CreateSmartAlbumDto): Promise<SmartAlbumResponseDto> {
    const album = await this.repository.create({
      ownerId: auth.user.id,
      name: dto.name,
      description: dto.description ?? null,
      category: dto.category,
      autoRefresh: dto.autoRefresh,
      coverAssetId: null,
      lastRefreshedAt: null,
    });

    // Create rules
    const rules = await this.repository.createRules(
      dto.rules.map((rule) => ({
        smartAlbumId: album.id,
        type: rule.type,
        config: rule.config,
      })),
    );

    return mapSmartAlbum({ ...album, rules, assetCount: 0 });
  }

  async update(auth: AuthDto, id: string, dto: UpdateSmartAlbumDto): Promise<SmartAlbumResponseDto> {
    const existing = await this.repository.getById(id);
    if (!existing || existing.ownerId !== auth.user.id) {
      throw new BadRequestException('Smart album not found');
    }

    const album = await this.repository.update(id, {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.category !== undefined && { category: dto.category }),
      ...(dto.autoRefresh !== undefined && { autoRefresh: dto.autoRefresh }),
      ...(dto.coverAssetId !== undefined && { coverAssetId: dto.coverAssetId }),
    });

    // Update rules if provided
    if (dto.rules) {
      await this.repository.deleteRules(id);
      await this.repository.createRules(
        dto.rules.map((rule) => ({
          smartAlbumId: id,
          type: rule.type,
          config: rule.config,
        })),
      );
    }

    const updated = await this.repository.getById(id);
    return mapSmartAlbum(updated!);
  }

  async delete(auth: AuthDto, id: string): Promise<void> {
    const existing = await this.repository.getById(id);
    if (!existing || existing.ownerId !== auth.user.id) {
      throw new BadRequestException('Smart album not found');
    }

    await this.repository.delete(id);
  }

  async refresh(auth: AuthDto, id: string): Promise<SmartAlbumResponseDto> {
    const album = await this.repository.getById(id);
    if (!album || album.ownerId !== auth.user.id) {
      throw new BadRequestException('Smart album not found');
    }

    // Process each rule to find matching assets
    const matchedAssets: Map<string, number> = new Map();

    for (const rule of album.rules) {
      try {
        const assets = await this.processRule(auth, rule);
        for (const asset of assets) {
          const currentScore = matchedAssets.get(asset.assetId) || 0;
          matchedAssets.set(asset.assetId, currentScore + (asset.score || 0));
        }
      } catch (error) {
        this.logger.warn(`Failed to process rule ${rule.id}: ${error}`);
      }
    }

    // Save matched assets
    const assetArray = Array.from(matchedAssets.entries()).map(([assetId, score]) => ({
      assetId,
      score,
    }));

    await this.repository.setAssets(id, assetArray);
    await this.repository.updateLastRefreshed(id);

    const updated = await this.repository.getById(id);
    return mapSmartAlbum({ ...updated!, assetCount: assetArray.length });
  }

  async suggest(auth: AuthDto): Promise<SmartAlbumSuggestionDto[]> {
    // Provide default suggestions based on common categories
    return [
      {
        category: SmartAlbumCategory.Travel,
        name: 'Travel & Vacations',
        description: 'Photos from your travels and vacations',
        suggestedRules: [
          { type: SmartAlbumRuleType.ClipSimilarity, config: { query: 'travel vacation beach mountain landmark', threshold: 0.22 } },
        ],
        estimatedAssetCount: 0,
      },
      {
        category: SmartAlbumCategory.Food,
        name: 'Food & Dining',
        description: 'Food photos and restaurant visits',
        suggestedRules: [
          { type: SmartAlbumRuleType.ClipSimilarity, config: { query: 'food meal restaurant cooking dish', threshold: 0.24 } },
        ],
        estimatedAssetCount: 0,
      },
      {
        category: SmartAlbumCategory.Nature,
        name: 'Nature & Landscapes',
        description: 'Nature shots, landscapes, and outdoor scenery',
        suggestedRules: [
          { type: SmartAlbumRuleType.ClipSimilarity, config: { query: 'nature landscape forest ocean sunset flowers', threshold: 0.22 } },
        ],
        estimatedAssetCount: 0,
      },
      {
        category: SmartAlbumCategory.Pet,
        name: 'Pets & Animals',
        description: 'Photos of your pets and animals',
        suggestedRules: [
          { type: SmartAlbumRuleType.ClipSimilarity, config: { query: 'dog cat pet animal', threshold: 0.24 } },
        ],
        estimatedAssetCount: 0,
      },
      {
        category: SmartAlbumCategory.Sport,
        name: 'Sports & Activities',
        description: 'Sports, fitness, and outdoor activities',
        suggestedRules: [
          { type: SmartAlbumRuleType.ClipSimilarity, config: { query: 'sport exercise running cycling swimming fitness', threshold: 0.23 } },
        ],
        estimatedAssetCount: 0,
      },
    ];
  }

  // === Private helpers ===

  private async processRule(
    auth: AuthDto,
    rule: { type: string; config: Record<string, unknown> },
  ): Promise<Array<{ assetId: string; score: number }>> {
    switch (rule.type) {
      case SmartAlbumRuleType.ClipSimilarity:
        return this.processClipRule(auth, rule.config);
      case SmartAlbumRuleType.DateRange:
        return this.processDateRule(auth, rule.config);
      default:
        this.logger.warn(`Unsupported rule type: ${rule.type}`);
        return [];
    }
  }

  private async processClipRule(
    auth: AuthDto,
    config: Record<string, unknown>,
  ): Promise<Array<{ assetId: string; score: number }>> {
    const query = config.query as string;
    const threshold = (config.threshold as number) ?? 0.2;

    if (!query) {
      return [];
    }

    try {
      // Encode the text query
      const embedding = await this.machineLearningRepository.encodeText(query, {
        modelName: 'ViT-B-32__openai', // default CLIP model
      });

      // Search for similar assets
      const { items } = await this.searchRepository.searchSmart(
        { page: 1, size: 500 },
        {
          embedding,
          userIds: [auth.user.id],
        },
      );

      return items.map((item) => ({
        assetId: item.id,
        score: 1, // searchSmart doesn't return score directly
      }));
    } catch (error) {
      this.logger.warn(`CLIP search failed for query "${query}": ${error}`);
      return [];
    }
  }

  private async processDateRule(
    auth: AuthDto,
    config: Record<string, unknown>,
  ): Promise<Array<{ assetId: string; score: number }>> {
    // Date range rules would query assets within the specified time period
    // This is a simplified implementation
    return [];
  }
}
