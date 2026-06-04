// FORK: Smart Album Controller
import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthDto } from 'src/dtos/auth.dto';
import {
    CreateSmartAlbumDto,
    SmartAlbumResponseDto,
    SmartAlbumSuggestionDto,
    SmartAlbumWithAssetsResponseDto,
    UpdateSmartAlbumDto,
} from 'src/dtos/ext-smart-album.dto';
import { Auth, Authenticated } from 'src/middleware/auth.guard';
import { ExtSmartAlbumService } from 'src/services/ext-smart-album.service';
import { UUIDParamDto } from 'src/validation';

@ApiTags('Smart Albums (Extension)')
@Controller('ext/smart-albums')
@Authenticated()
export class ExtSmartAlbumController {
  constructor(private service: ExtSmartAlbumService) {}

  @Get()
  getAll(@Auth() auth: AuthDto): Promise<SmartAlbumResponseDto[]> {
    return this.service.getAll(auth);
  }

  @Post()
  create(@Auth() auth: AuthDto, @Body() dto: CreateSmartAlbumDto): Promise<SmartAlbumResponseDto> {
    return this.service.create(auth, dto);
  }

  @Get('suggest')
  suggest(@Auth() auth: AuthDto): Promise<SmartAlbumSuggestionDto[]> {
    return this.service.suggest(auth);
  }

  @Get(':id')
  getById(@Auth() auth: AuthDto, @Param() { id }: UUIDParamDto): Promise<SmartAlbumResponseDto> {
    return this.service.getById(auth, id);
  }

  @Get(':id/assets')
  getAssets(@Auth() auth: AuthDto, @Param() { id }: UUIDParamDto): Promise<SmartAlbumWithAssetsResponseDto> {
    return this.service.getAssets(auth, id);
  }

  @Put(':id')
  update(
    @Auth() auth: AuthDto,
    @Param() { id }: UUIDParamDto,
    @Body() dto: UpdateSmartAlbumDto,
  ): Promise<SmartAlbumResponseDto> {
    return this.service.update(auth, id, dto);
  }

  @Delete(':id')
  delete(@Auth() auth: AuthDto, @Param() { id }: UUIDParamDto): Promise<void> {
    return this.service.delete(auth, id);
  }

  @Post(':id/refresh')
  refresh(@Auth() auth: AuthDto, @Param() { id }: UUIDParamDto): Promise<SmartAlbumResponseDto> {
    return this.service.refresh(auth, id);
  }
}
