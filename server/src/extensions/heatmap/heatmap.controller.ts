import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Auth, Authenticated } from 'src/middleware/auth.guard';
import { AuthDto } from 'src/dtos/auth.dto';
import { HeatmapService } from 'src/extensions/heatmap/heatmap.service';

@ApiTags('Extensions')
@Controller('extensions/heatmap')
export class HeatmapController {
  constructor(private service: HeatmapService) {}

  @Get('points')
  @Authenticated()
  getPoints(@Auth() auth: AuthDto) {
    return this.service.getPoints(auth.user.id);
  }
}
