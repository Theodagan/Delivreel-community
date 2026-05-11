import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';
import { CreateVideoDto } from '../core/dto/create-video.dto.js';
import { UpdateVideoDto } from '../core/dto/update-video.dto.js';
import { VideoProviderRegistry } from '../core/providers/video-provider.registry.js';
import { VideoGatewayService } from './video-gateway.service.js';

@ApiTags('Videos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('videos')
export class VideosController {
  constructor(
    private readonly videosService: VideoGatewayService,
    private readonly videoProviderRegistry: VideoProviderRegistry,
  ) {}

  @ApiOperation({ summary: 'Upload a new video' })
  @ApiResponse({ status: 201, description: 'Video uploaded successfully' })
  @ApiConsumes('multipart/form-data', 'application/json')
  @Post('upload')
  @UseInterceptors(FileInterceptor('video'))
  upload(
    @UploadedFile() video: Express.Multer.File | undefined,
    @Body() createVideoDto: CreateVideoDto,
    @Request() req,
  ) {
    return this.videosService.create(createVideoDto, video, req.user.userId, req.user.role);
  }

  @ApiOperation({ summary: 'Update video' })
  @ApiResponse({ status: 200, description: 'Video updated successfully' })
  @ApiConsumes('multipart/form-data', 'application/json')
  @Patch(':id')
  @UseInterceptors(FileInterceptor('video'))
  update(
    @Param('id') id: string,
    @Body() updateVideoDto: UpdateVideoDto,
    @UploadedFile() video: Express.Multer.File | undefined,
    @Request() req,
  ) {
    return this.videosService.update(id, updateVideoDto, video, req.user.userId, req.user.role);
  }

  @ApiOperation({ summary: 'Get all videos' })
  @ApiResponse({ status: 200, description: 'Videos retrieved successfully' })
  @Get()
  findAll(@Request() req) {
    return this.videosService.findAll(req.user.userId, req.user.role);
  }

  @ApiOperation({ summary: 'Get provider status' })
  @ApiResponse({ status: 200, description: 'Provider status retrieved successfully' })
  @Get('provider-status')
  getProviderStatus() {
    const provider = this.videoProviderRegistry.getUploadProvider();
    return {
      activeProvider: provider.id,
      provider: provider.id,
    };
  }

  @ApiOperation({ summary: 'Get video by ID' })
  @ApiResponse({ status: 200, description: 'Video retrieved successfully' })
  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.videosService.findOne(id, req.user.userId, req.user.role);
  }

  @ApiOperation({ summary: 'Delete video' })
  @ApiResponse({ status: 200, description: 'Video deleted successfully' })
  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.videosService.remove(id, req.user.userId, req.user.role);
  }
}
