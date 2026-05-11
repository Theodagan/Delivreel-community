import { UnauthorizedException } from '@nestjs/common';
import { ExecutionContext } from '@nestjs/common';

import { JwtAuthGuard } from './jwt-auth.guard.js';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;

  beforeEach(() => {
    guard = new JwtAuthGuard();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const createContext = (request: any): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    }) as ExecutionContext;

  it('delegates to passport when authorization header exists', () => {
    const request = {
      headers: { authorization: 'Bearer existing-token' },
      query: {},
    };

    const superProto = Object.getPrototypeOf(JwtAuthGuard.prototype) as {
      canActivate: (ctx: ExecutionContext) => boolean;
    };
    const superSpy = jest
      .spyOn(superProto, 'canActivate')
      .mockReturnValue(true);

    const result = guard.canActivate(createContext(request));

    expect(result).toBe(true);
    expect(superSpy).toHaveBeenCalled();
  });

  it('moves token from query to authorization header', () => {
    const request: { headers: Record<string, string>; query: Record<string, string> } = {
      headers: {},
      query: { token: 'query-token' },
    };

    const superProto = Object.getPrototypeOf(JwtAuthGuard.prototype) as {
      canActivate: (ctx: ExecutionContext) => boolean;
    };
    const superSpy = jest
      .spyOn(superProto, 'canActivate')
      .mockReturnValue(true);

    const result = guard.canActivate(createContext(request));

    expect(result).toBe(true);
    expect(request.headers.authorization).toBe('Bearer query-token');
    expect(superSpy).toHaveBeenCalled();
  });

  it('throws UnauthorizedException when no token is provided', () => {
    const request = {
      headers: {},
      query: {},
    };

    expect(() => guard.canActivate(createContext(request))).toThrow(
      UnauthorizedException,
    );
  });
});
