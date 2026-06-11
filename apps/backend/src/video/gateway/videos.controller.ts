import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Res,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { AccessAuthGuard } from '../../auth/guards/access-auth.guard.js';
import { CreateVideoDto } from '../core/dto/create-video.dto.js';
import { UpdateVideoSettingsDto } from '../core/dto/update-video-settings.dto.js';
import { UpdateVideoDto } from '../core/dto/update-video.dto.js';
import { VideoProviderRegistry } from '../core/providers/video-provider.registry.js';
import { VideoGatewayService } from './video-gateway.service.js';

@ApiTags('Videos')
@ApiBearerAuth()
@UseGuards(AccessAuthGuard)
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
    return this.videosService.create(createVideoDto, video, req.user);
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
    return this.videosService.update(id, updateVideoDto, video, req.user);
  }

  @ApiOperation({ summary: 'Get all videos' })
  @ApiResponse({ status: 200, description: 'Videos retrieved successfully' })
  @Get()
  findAll(@Request() req) {
    return this.videosService.findAll(req.user.userId);
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

  @ApiOperation({ summary: 'Update video settings' })
  @ApiResponse({ status: 200, description: 'Video settings updated successfully' })
  @Patch(':id/settings')
  updateSettings(@Param('id') id: string, @Body() updateVideoSettingsDto: UpdateVideoSettingsDto, @Request() req) {
    return this.videosService.updateSettings(id, updateVideoSettingsDto, req.user);
  }

  @ApiOperation({ summary: 'Download video' })
  @ApiResponse({ status: 200, description: 'Video download response' })
  @Get(':id/download')
  async download(@Param('id') id: string, @Request() req, @Res() res) {
    const source = await this.videosService.getDownloadSource(id, req.user);
    if (source.type === 'remote') {
      return res.redirect(source.url);
    }
    return res.download(source.path, source.filename, {
      headers: {
        'Content-Type': source.mimeType,
      },
    });
  }

  @ApiOperation({ summary: 'Get video processing status' })
  @ApiResponse({ status: 200, description: 'Video status retrieved successfully' })
  @Get(':id/status')
  getStatus(@Param('id') id: string, @Request() req) {
    return this.videosService.getStatus(id, req.user);
  }

  @ApiOperation({ summary: 'Get video by ID' })
  @ApiResponse({ status: 200, description: 'Video retrieved successfully' })
  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.videosService.findOne(id, req.user);
  }

  @ApiOperation({ summary: 'Report a failed direct upload' })
  @ApiResponse({ status: 200, description: 'Failed upload cleaned up successfully' })
  @Post(':id/upload-failed')
  reportUploadFailed(@Param('id') id: string, @Request() req) {
    return this.videosService.reportUploadFailed(id, req.user);
  }

  @ApiOperation({ summary: 'Approve a video' })
  @ApiResponse({ status: 200, description: 'Video approved' })
  @Post(':id/approve')
  approve(@Param('id') id: string, @Request() req) {
    return this.videosService.approve(id, req.user);
  }

  @ApiOperation({ summary: 'Revoke video approval' })
  @ApiResponse({ status: 200, description: 'Approval revoked' })
  @Delete(':id/approval')
  revokeApproval(@Param('id') id: string, @Request() req) {
    return this.videosService.revokeApproval(id, req.user);
  }

  @ApiOperation({ summary: 'Sign off a video (locks comments)' })
  @ApiResponse({ status: 200, description: 'Video signed off' })
  @Post(':id/sign-off')
  signOff(@Param('id') id: string, @Request() req) {
    return this.videosService.signOff(id, req.user);
  }

  @ApiOperation({ summary: 'Revoke video sign-off' })
  @ApiResponse({ status: 200, description: 'Sign-off revoked' })
  @Delete(':id/sign-off')
  revokeSignOff(@Param('id') id: string, @Request() req) {
    return this.videosService.revokeSignOff(id, req.user);
  }

  @ApiOperation({ summary: 'Archive a video' })
  @ApiResponse({ status: 200, description: 'Video archived' })
  @Post(':id/archive')
  archive(@Param('id') id: string, @Request() req) {
    return this.videosService.archive(id, req.user);
  }

  @ApiOperation({ summary: 'Restore an archived video' })
  @ApiResponse({ status: 200, description: 'Video restored' })
  @Post(':id/restore')
  restore(@Param('id') id: string, @Request() req) {
    return this.videosService.restoreVideo(id, req.user);
  }

  @ApiOperation({ summary: 'Delete video' })
  @ApiResponse({ status: 200, description: 'Video deleted successfully' })
  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.videosService.remove(id, req.user);
  }
}
