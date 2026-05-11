import {
  Controller,
  Get,
  Param,
  Req,
  Res,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { createReadStream, existsSync } from 'fs';
import { readFile } from 'fs/promises';
import jwt from 'jsonwebtoken';
import { join } from 'path';

import { Video } from '../core/entities/video.entity.js';
import { VideoAccessService } from '../core/services/video-access.service.js';

@ApiTags('Video Streaming')
@Controller('stream')
export class StreamController {
  constructor(
    private readonly videoAccessService: VideoAccessService,
    private readonly configService: ConfigService,
  ) {}

  @ApiOperation({ summary: 'Stream HLS manifest file' })
  @Get(':videoId/manifest.m3u8')
  async getHLSManifest(
    @Param('videoId') videoId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const video = await this.resolveVideoAccess(videoId, req);

    if (!video.hlsPath || video.status !== 'ready') {
      throw new NotFoundException('Video stream not available');
    }

    const manifestPath = join(process.cwd(), 'hls', video.id, 'manifest.m3u8');
    if (!existsSync(manifestPath)) {
      throw new NotFoundException('Manifest file not found');
    }

    const manifest = await readFile(manifestPath, 'utf8');

    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'no-cache');
    res.send(manifest);
  }

  @ApiOperation({ summary: 'Stream HLS segment file' })
  @Get(':videoId/:filename')
  async getHLSSegment(
    @Param('videoId') videoId: string,
    @Param('filename') filename: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const video = await this.resolveVideoAccess(videoId, req);

    if (!video.hlsPath || video.status !== 'ready') {
      throw new NotFoundException('Video stream not available');
    }

    const segmentPath = join(process.cwd(), 'hls', video.id, filename);
    if (!existsSync(segmentPath)) {
      throw new NotFoundException('Segment file not found');
    }

    if (filename.endsWith('.ts')) {
      res.setHeader('Content-Type', 'video/mp2t');
    } else if (filename.endsWith('.m3u8')) {
      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'private, no-store');
    createReadStream(segmentPath).pipe(res);
  }

  private async resolveVideoAccess(videoId: string, req: Request): Promise<Video> {
    const auth = req.headers.authorization;
    const bearerToken = auth?.startsWith('Bearer ') ? auth.slice('Bearer '.length) : undefined;
    //FIXME: Local playback URLs need a stream-safe token flow; native HLS clients cannot attach the bearer header required below.
    if (!bearerToken) {
      throw new UnauthorizedException('Authentication is required');
    }

    const secret = this.configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new UnauthorizedException('JWT secret not configured');
    }

    const payload = jwt.verify(bearerToken, secret) as { sub: string; role: string };
    return this.videoAccessService.findAccessibleVideo(videoId, payload.sub, payload.role);
  }
}
