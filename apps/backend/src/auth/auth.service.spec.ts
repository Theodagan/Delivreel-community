import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { AuthService } from './auth.service.js';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

describe('AuthService', () => {
  const usersService = {
    findByEmail: jest.fn(),
    create: jest.fn(),
    findOne: jest.fn(),
  };
  const jwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };
  const configService = {
    get: jest.fn(),
  };

  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuthService(
      usersService as never,
      jwtService as never,
      configService as never,
    );
  });

  it('validates a user when password matches', async () => {
    usersService.findByEmail.mockResolvedValue({
      id: 'u1',
      email: 'user@example.com',
      role: 'client',
      name: 'User',
      password: 'hashed',
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    const result = await service.validateUser('user@example.com', 'password');

    expect(result).toEqual({
      id: 'u1',
      email: 'user@example.com',
      role: 'client',
      name: 'User',
    });
  });

  it('returns null when credentials are invalid', async () => {
    usersService.findByEmail.mockResolvedValue({ password: 'hashed' });
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    await expect(service.validateUser('user@example.com', 'bad')).resolves.toBeNull();
  });

  it('logs in a user and returns both tokens', async () => {
    jest.spyOn(service, 'validateUser').mockResolvedValue({
      id: 'u1',
      email: 'user@example.com',
      role: 'admin',
      name: 'Admin',
    });
    configService.get.mockReturnValue('refresh-secret');
    jwtService.sign
      .mockReturnValueOnce('access-token')
      .mockReturnValueOnce('refresh-token');

    const result = await service.login({
      email: 'user@example.com',
      password: 'password',
    });

    expect(result).toEqual({
      access_token: 'access-token',
      refresh_token: 'refresh-token',
      user: {
        id: 'u1',
        email: 'user@example.com',
        role: 'admin',
        name: 'Admin',
      },
    });
    expect(jwtService.sign).toHaveBeenCalledTimes(2);
  });

  it('throws when login credentials are invalid', async () => {
    jest.spyOn(service, 'validateUser').mockResolvedValue(null);

    await expect(
      service.login({ email: 'user@example.com', password: 'bad' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('registers a user with a hashed password', async () => {
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
    usersService.create.mockResolvedValue({
      id: 'u2',
      email: 'new@example.com',
      role: 'client',
      name: 'New',
      password: 'hashed-password',
    });

    const result = await service.register({
      name: 'New',
      email: 'new@example.com',
      password: 'plain',
      role: 'client',
    });

    expect(usersService.create).toHaveBeenCalledWith(
      expect.objectContaining({ password: 'hashed-password' }),
    );
    expect(result).toEqual({
      id: 'u2',
      email: 'new@example.com',
      role: 'client',
      name: 'New',
    });
  });

  it('refreshes token for a valid refresh token', async () => {
    configService.get.mockReturnValue('refresh-secret');
    jwtService.verify.mockReturnValue({ sub: 'u1' });
    usersService.findOne.mockResolvedValue({
      id: 'u1',
      email: 'user@example.com',
      role: 'client',
    });
    jwtService.sign.mockReturnValue('new-access-token');

    await expect(service.refreshToken('refresh-token')).resolves.toEqual({
      access_token: 'new-access-token',
    });
  });

  it('throws when refresh token is invalid', async () => {
    configService.get.mockReturnValue('refresh-secret');
    jwtService.verify.mockImplementation(() => {
      throw new Error('invalid');
    });

    await expect(service.refreshToken('bad-token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
