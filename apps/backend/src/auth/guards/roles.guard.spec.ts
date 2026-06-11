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

  const createContext = (user: Record<string, never> = {}): ExecutionContext =>
    ({
      getHandler: () => jest.fn(),
      getClass: () => class TestClass {},
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    }) as unknown as ExecutionContext;

  it('allows access when no roles are required', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    expect(guard.canActivate(createContext())).toBe(true);
  });

  it('denies required global roles because project permissions are authoritative', () => {
    reflector.getAllAndOverride.mockReturnValue(['admin']);

    expect(guard.canActivate(createContext())).toBe(false);
  });
});
