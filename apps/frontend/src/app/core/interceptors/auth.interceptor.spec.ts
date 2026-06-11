import { HttpErrorResponse, HttpRequest, HttpResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of, throwError } from 'rxjs';

import { authInterceptor } from './auth.interceptor';
import { AuthService } from '../services/auth.service';
import { WebSocketService } from '../services/websocket.service';
import { Router } from '@angular/router';
import { MagicLinkService } from '../services/magic-link.service';

describe('authInterceptor', () => {
  const configure = (authService: Partial<AuthService>, routerUrl = '/projects', magicLinkService: Partial<MagicLinkService> = {}) => {
    const router = { url: routerUrl, navigate: jest.fn() };
    const webSocketService = { disconnect: jest.fn() };
    const magic = { getToken: () => null, clear: jest.fn(), ...magicLinkService };
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router },
        { provide: WebSocketService, useValue: webSocketService },
        { provide: MagicLinkService, useValue: magic },
      ],
    });
    return { router, webSocketService, magicLinkService: magic };
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    jest.clearAllMocks();
  });

  it('adds authorization header when token exists', async () => {
    configure({ getToken: () => 'token-123' } as never);

    const req = new HttpRequest('GET', '/api/projects');
    const next = jest.fn().mockReturnValue(of(new HttpResponse({ status: 200 })));

    await firstValueFrom(
      TestBed.runInInjectionContext(() => authInterceptor(req, next as never)),
    );

    const forwardedReq = next.mock.calls[0][0] as HttpRequest<unknown>;
    expect(forwardedReq.headers.get('Authorization')).toBe('Bearer token-123');
  });

  it('forwards request unchanged when token is missing', async () => {
    configure({ getToken: () => null } as never);

    const req = new HttpRequest('GET', '/api/projects');
    const next = jest.fn().mockReturnValue(of(new HttpResponse({ status: 200 })));

    await firstValueFrom(
      TestBed.runInInjectionContext(() => authInterceptor(req, next as never)),
    );

    const forwardedReq = next.mock.calls[0][0] as HttpRequest<unknown>;
    expect(forwardedReq).toBe(req);
    expect(forwardedReq.headers.has('Authorization')).toBe(false);
  });

  it('adds magic-link header when no user token exists', async () => {
    configure({ getToken: () => null } as never, '/projects/p1', { getToken: () => 'dl_token' });

    const req = new HttpRequest('GET', '/api/projects/p1');
    const next = jest.fn().mockReturnValue(of(new HttpResponse({ status: 200 })));

    await firstValueFrom(
      TestBed.runInInjectionContext(() => authInterceptor(req, next as never)),
    );

    const forwardedReq = next.mock.calls[0][0] as HttpRequest<unknown>;
    expect(forwardedReq.headers.get('X-Magic-Link-Token')).toBe('dl_token');
  });

  it('does not add authorization header to external direct upload urls', async () => {
    configure({ getToken: () => 'token-123' } as never);

    const req = new HttpRequest('PUT', 'https://uploads.example.test/upload/abc', null);
    const next = jest.fn().mockReturnValue(of(new HttpResponse({ status: 200 })));

    await firstValueFrom(
      TestBed.runInInjectionContext(() => authInterceptor(req, next as never)),
    );

    const forwardedReq = next.mock.calls[0][0] as HttpRequest<unknown>;
    expect(forwardedReq).toBe(req);
    expect(forwardedReq.headers.has('Authorization')).toBe(false);
  });

  it('logs out, disconnects sockets, and redirects on backend 401', async () => {
    const authService = {
      getToken: () => 'token-123',
      logout: jest.fn(),
    };
    const { router, webSocketService } = configure(authService as never);

    const req = new HttpRequest('GET', '/api/projects');
    const next = jest.fn().mockReturnValue(throwError(() => new HttpErrorResponse({ status: 401 })));

    await expect(
      firstValueFrom(TestBed.runInInjectionContext(() => authInterceptor(req, next as never))),
    ).rejects.toBeInstanceOf(HttpErrorResponse);

    expect(webSocketService.disconnect).toHaveBeenCalled();
    expect(authService.logout).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/login'], { replaceUrl: true });
  });

  it('clears auth on auth-route 401 without redirect loop', async () => {
    const authService = {
      getToken: () => 'token-123',
      logout: jest.fn(),
    };
    const { router } = configure(authService as never, '/login');

    const req = new HttpRequest('POST', '/api/auth/login', null);
    const next = jest.fn().mockReturnValue(throwError(() => new HttpErrorResponse({ status: 401 })));

    await expect(
      firstValueFrom(TestBed.runInInjectionContext(() => authInterceptor(req, next as never))),
    ).rejects.toBeInstanceOf(HttpErrorResponse);

    expect(authService.logout).toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('clears magic-link token on backend 401 without user logout', async () => {
    const authService = {
      getToken: () => null,
      logout: jest.fn(),
    };
    const { magicLinkService } = configure(authService as never, '/videos/v1', { getToken: () => 'dl_token', clear: jest.fn() });

    const req = new HttpRequest('GET', '/api/videos/v1');
    const next = jest.fn().mockReturnValue(throwError(() => new HttpErrorResponse({ status: 401 })));

    await expect(
      firstValueFrom(TestBed.runInInjectionContext(() => authInterceptor(req, next as never))),
    ).rejects.toBeInstanceOf(HttpErrorResponse);

    expect(magicLinkService.clear).toHaveBeenCalled();
    expect(authService.logout).not.toHaveBeenCalled();
  });
});
