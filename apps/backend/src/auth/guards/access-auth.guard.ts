import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import jwt from 'jsonwebtoken';

import { ProjectAccessLinksService } from '../../projects/project-access-links.service.js';

@Injectable()
export class AccessAuthGuard implements CanActivate {
  constructor(
    private readonly configService: ConfigService,
    private readonly accessLinksService: ProjectAccessLinksService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const bearer = this.extractBearer(request.headers.authorization);
    if (bearer) {
      const secret = this.configService.get<string>('JWT_SECRET');
      if (!secret) {
        throw new UnauthorizedException('JWT secret not configured');
      }
      let payload: { sub: number; email?: string };
      try {
        payload = jwt.verify(bearer, secret) as unknown as { sub: number; email?: string };
      } catch {
        throw new UnauthorizedException('Invalid or expired token');
      }
      request.user = {
        principalType: 'user',
        userId: payload.sub,
        email: payload.email,
      };
      return true;
    }

    const magicToken = request.headers['x-magic-link-token'];
    const token = Array.isArray(magicToken) ? magicToken[0] : magicToken;
    if (token) {
      const link = await this.accessLinksService.resolveToken(token);
      request.user = {
        principalType: 'magic_link',
        accessLinkId: link.id,
        accessLinkLabel: link.label,
        projectId: link.projectId,
        videoId: link.videoId,
        userId: link.createdByUserId,
        permissions: this.accessLinksService.toPermissions(link),
      };
      return true;
    }

    throw new UnauthorizedException('Authentication is required');
  }

  private extractBearer(authHeader: string | undefined): string | null {
    if (!authHeader?.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.slice('Bearer '.length);
  }
}
