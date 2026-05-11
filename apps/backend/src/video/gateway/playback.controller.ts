import { Controller, Get, NotFoundException, Param, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';
import { PlaybackSourceDto } from '../core/dto/playback-source.dto.js';
import { VideoProviderRegistry } from '../core/providers/video-provider.registry.js';
import { VideoGatewayService } from './video-gateway.service.js';

@ApiTags('Video Playback')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('videos')
export class PlaybackController {
  constructor(
    private readonly videosService: VideoGatewayService,
    private readonly videoProviderRegistry: VideoProviderRegistry,
  ) {}

  @ApiOperation({ summary: 'Get playback source for a video' })
  @ApiResponse({ status: 200, description: 'Playback source retrieved' })
  @Get(':id/playback')
  async getPlaybackSource(@Param('id') id: string, @Request() req): Promise<PlaybackSourceDto> {
    const video = await this.videosService.findOne(id, req.user.userId, req.user.role);

    if (!video) {
      throw new NotFoundException('Video not found');
    }

    const provider = await this.videoProviderRegistry.getPlaybackProvider(video);
    return provider.getPlaybackSource(video, { userId: req.user.userId, userRole: req.user.role });
  }
}
