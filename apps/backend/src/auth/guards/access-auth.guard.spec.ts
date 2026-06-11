import { UnauthorizedException } from '@nestjs/common';
import jwt from 'jsonwebtoken';

import { AccessAuthGuard } from './access-auth.guard.js';

describe('AccessAuthGuard', () => {
  const configService = { get: jest.fn().mockReturnValue('secret') };
  const accessLinksService = {
    resolveToken: jest.fn(),
    toPermissions: jest.fn(),
  };

  const createContext = (headers: Record<string, string>) => {
    const request = { headers, user: undefined as any };
    return {
      request,
      context: {
        switchToHttp: () => ({ getRequest: () => request }),
      } as any,
    };
  };

  let guard: AccessAuthGuard;

  beforeEach(() => {
    jest.clearAllMocks();
    guard = new AccessAuthGuard(configService as never, accessLinksService as never);
  });

  it('accepts bearer JWTs as user principals', async () => {
    const token = jwt.sign({ sub: 'user-1', email: 'u@example.com' }, 'secret');
    const { context, request } = createContext({ authorization: `Bearer ${token}` });

    await expect(guard.canActivate(context)).resolves.toBe(true);

    expect(request.user).toEqual({ principalType: 'user', userId: 'user-1', email: 'u@example.com' });
  });

  it('accepts magic-link tokens as scoped principals', async () => {
    const permissions = { canView: true, canComment: true };
    accessLinksService.resolveToken.mockResolvedValue({
      id: 'link-1',
      label: 'Client Review',
      projectId: 'project-1',
      videoId: 'video-1',
      createdByUserId: 'user-1',
    });
    accessLinksService.toPermissions.mockReturnValue(permissions);
    const { context, request } = createContext({ 'x-magic-link-token': 'dl_token' });

    await expect(guard.canActivate(context)).resolves.toBe(true);

    expect(request.user).toEqual(expect.objectContaining({
      principalType: 'magic_link',
      accessLinkId: 'link-1',
      projectId: 'project-1',
      videoId: 'video-1',
      permissions,
    }));
  });

  it('rejects requests without a supported principal', async () => {
    const { context } = createContext({});

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects expired bearer JWTs as unauthorized', async () => {
    const token = jwt.sign({ sub: 'user-1', email: 'u@example.com' }, 'secret', { expiresIn: '-1s' });
    const { context, request } = createContext({ authorization: `Bearer ${token}` });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(request.user).toBeUndefined();
  });
});
