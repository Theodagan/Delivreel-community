import { Router } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { of, firstValueFrom, Observable } from 'rxjs';

import { authGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';

describe('authGuard', () => {
  const router = {
    navigate: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('allows access when user is authenticated', async () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { isAuthenticated$: of(true) } },
        { provide: Router, useValue: router },
      ],
    });

    const result$ = TestBed.runInInjectionContext(() =>
      authGuard({} as never, {} as never),
    );

    await expect(firstValueFrom(result$ as Observable<boolean>)).resolves.toBe(true);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('redirects to login when user is not authenticated', async () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { isAuthenticated$: of(false) } },
        { provide: Router, useValue: router },
      ],
    });

    const result$ = TestBed.runInInjectionContext(() =>
      authGuard({} as never, {} as never),
    );

    await expect(firstValueFrom(result$ as Observable<boolean>)).resolves.toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });
});
