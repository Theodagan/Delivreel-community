import { HttpRequest, HttpResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of } from 'rxjs';

import { authInterceptor } from './auth.interceptor';
import { AuthService } from '../services/auth.service';

describe('authInterceptor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('adds authorization header when token exists', async () => {
    TestBed.configureTestingModule({
      providers: [{ provide: AuthService, useValue: { getToken: () => 'token-123' } }],
    });

    const req = new HttpRequest('GET', '/api/projects');
    const next = jest.fn().mockReturnValue(of(new HttpResponse({ status: 200 })));

    await firstValueFrom(
      TestBed.runInInjectionContext(() => authInterceptor(req, next as never)),
    );

    const forwardedReq = next.mock.calls[0][0] as HttpRequest<unknown>;
    expect(forwardedReq.headers.get('Authorization')).toBe('Bearer token-123');
  });

  it('forwards request unchanged when token is missing', async () => {
    TestBed.configureTestingModule({
      providers: [{ provide: AuthService, useValue: { getToken: () => null } }],
    });

    const req = new HttpRequest('GET', '/api/projects');
    const next = jest.fn().mockReturnValue(of(new HttpResponse({ status: 200 })));

    await firstValueFrom(
      TestBed.runInInjectionContext(() => authInterceptor(req, next as never)),
    );

    const forwardedReq = next.mock.calls[0][0] as HttpRequest<unknown>;
    expect(forwardedReq).toBe(req);
    expect(forwardedReq.headers.has('Authorization')).toBe(false);
  });
});
