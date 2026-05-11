import { ExecutionContext } from '@nestjs/common';

import { RolesGuard } from './roles.guard.js';

describe('RolesGuard', () => {
  const reflector = {
    getAllAndOverride: jest.fn(),
  };

  let guard: RolesGuard;

  beforeEach(() => {
    jest.clearAllMocks();
    guard = new RolesGuard(reflector as never);
  });

  const createContext = (user: { role?: string }): ExecutionContext =>
    ({
      getHandler: () => jest.fn(),
      getClass: () => class TestClass {},
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    }) as unknown as ExecutionContext;

  it('allows access when no roles are required', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    expect(guard.canActivate(createContext({ role: 'client' }))).toBe(true);
  });

  it('allows access when user role matches required role', () => {
    reflector.getAllAndOverride.mockReturnValue(['admin']);

    expect(guard.canActivate(createContext({ role: 'admin' }))).toBe(true);
  });

  it('denies access when user role does not match required role', () => {
    reflector.getAllAndOverride.mockReturnValue(['admin']);

    expect(guard.canActivate(createContext({ role: 'client' }))).toBe(false);
  });
});
