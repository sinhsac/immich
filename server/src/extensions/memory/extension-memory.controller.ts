import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthDto } from 'src/dtos/auth.dto';
import { Auth, Authenticated } from 'src/middleware/auth.guard';
import {
  ExtMemoryCreateDto,
  ExtMemorySearchDto,
  ExtMemoryUpdateDto,
} from 'src/extensions/memory/extension-memory.dto';
import { ExtensionMemoryService } from 'src/extensions/memory/extension-memory.service';

@ApiTags('Extensions')
@Controller('extensions/memory')
export class ExtensionMemoryController {
  constructor(private service: ExtensionMemoryService) {}

  @Get()
  @Authenticated()
  search(@Auth() auth: AuthDto, @Query() dto: ExtMemorySearchDto) {
    return this.service.search(auth, dto);
  }

  @Get(':id')
  @Authenticated()
  get(@Auth() auth: AuthDto, @Param('id') id: string) {
    return this.service.get(auth, id);
  }

  @Post()
  @Authenticated()
  create(@Auth() auth: AuthDto, @Body() dto: ExtMemoryCreateDto) {
    return this.service.create(auth, dto);
  }

  @Put(':id')
  @Authenticated()
  update(@Auth() auth: AuthDto, @Param('id') id: string, @Body() dto: ExtMemoryUpdateDto) {
    return this.service.update(auth, id, dto);
  }

  @Delete(':id')
  @Authenticated()
  remove(@Auth() auth: AuthDto, @Param('id') id: string) {
    return this.service.remove(auth, id);
  }

  @Post(':id/assets')
  @Authenticated()
  addAssets(@Auth() auth: AuthDto, @Param('id') id: string, @Body('assetIds') assetIds: string[]) {
    return this.service.addAssets(auth, id, assetIds);
  }

  @Delete(':id/assets')
  @Authenticated()
  removeAssets(@Auth() auth: AuthDto, @Param('id') id: string, @Body('assetIds') assetIds: string[]) {
    return this.service.removeAssets(auth, id, assetIds);
  }
}
