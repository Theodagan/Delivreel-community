import { of, throwError, firstValueFrom } from 'rxjs';

import { AuthService, AuthResponse } from './auth.service';

describe('AuthService', () => {
  const makeHttp = () => ({
    post: jest.fn(),
  });

  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  it('initializes from localStorage when auth data exists', () => {
    localStorage.setItem('access_token', 'token');
    localStorage.setItem(
      'user',
      JSON.stringify({ id: 'u1', email: 'u@example.com', name: 'User', role: 'client' }),
    );

    const service = new AuthService(makeHttp() as never);

    expect(service.getCurrentUser()).toEqual(
      expect.objectContaining({ id: 'u1', email: 'u@example.com' }),
    );
    expect(service.isAdmin()).toBe(false);
  });

  it('stores tokens and user info on login', async () => {
    const http = makeHttp();
    const service = new AuthService(http as never);
    const authResponse: AuthResponse = {
      access_token: 'access-token',
      refresh_token: 'refresh-token',
      user: {
        id: 'u1',
        email: 'u@example.com',
        name: 'User',
        role: 'admin',
      },
    };
    http.post.mockReturnValue(of(authResponse));

    await firstValueFrom(service.login('u@example.com', 'password'));

    expect(http.post).toHaveBeenCalledWith('/api/auth/login', {
      email: 'u@example.com',
      password: 'password',
    });
    expect(localStorage.getItem('access_token')).toBe('access-token');
    expect(localStorage.getItem('refresh_token')).toBe('refresh-token');
    expect(service.isAdmin()).toBe(true);
  });

  it('clears auth state on logout', () => {
    const service = new AuthService(makeHttp() as never);
    localStorage.setItem('access_token', 'access-token');
    localStorage.setItem('refresh_token', 'refresh-token');
    localStorage.setItem('user', JSON.stringify({ id: 'u1', role: 'client' }));

    service.logout();

    expect(localStorage.getItem('access_token')).toBeNull();
    expect(localStorage.getItem('refresh_token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
    expect(service.getCurrentUser()).toBeNull();
  });

  it('refreshes the access token', async () => {
    const http = makeHttp();
    const service = new AuthService(http as never);
    localStorage.setItem('refresh_token', 'refresh-token');
    http.post.mockReturnValue(of({ access_token: 'new-access-token' }));

    await firstValueFrom(service.refreshToken());

    expect(http.post).toHaveBeenCalledWith('/api/auth/refresh', {
      refresh_token: 'refresh-token',
    });
    expect(localStorage.getItem('access_token')).toBe('new-access-token');
  });

  it('propagates login errors', async () => {
    const http = makeHttp();
    const service = new AuthService(http as never);
    http.post.mockReturnValue(throwError(() => new Error('login failed')));

    await expect(
      firstValueFrom(service.login('u@example.com', 'bad-password')),
    ).rejects.toThrow('login failed');
  });
});
