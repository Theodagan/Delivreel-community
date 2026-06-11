import { Body, Controller, ForbiddenException, Post } from '@nestjs/common';

import { ProjectAccessLinksService } from './project-access-links.service.js';

@Controller('magic-links')
export class MagicLinksController {
  constructor(private readonly accessLinksService: ProjectAccessLinksService) {}

  @Post('resolve')
  async resolve(@Body() body: { token?: string }) {
    if (!body.token) {
      throw new ForbiddenException('Magic link token is required');
    }
    const link = await this.accessLinksService.resolveToken(body.token);
    return {
      accessLink: this.accessLinksService.serialize(link),
      capabilities: this.accessLinksService.toPermissions(link),
      target: link.videoId
        ? { type: 'video', projectId: link.projectId, videoId: link.videoId, route: `/videos/${link.videoId}` }
        : { type: 'project', projectId: link.projectId, route: `/projects/${link.projectId}` },
    };
  }
}
