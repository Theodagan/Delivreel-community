import { Router } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { adminGuard } from './admin.guard';
import { AuthService } from '../services/auth.service';

describe('adminGuard', () => {
  const router = {
    navigate: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('allows access when user is authenticated', () => {
    const result$ = TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { isAuthenticated$: of(true) } },
        { provide: Router, useValue: router },
      ],
    }).runInInjectionContext(() =>
      adminGuard({} as never, {} as never),
    );

    (result$ as any).subscribe((result: boolean) => {
      expect(result).toBe(true);
      expect(router.navigate).not.toHaveBeenCalled();
    });
  });

  it('redirects unauthenticated users to login', () => {
    const result$ = TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { isAuthenticated$: of(false) } },
        { provide: Router, useValue: router },
      ],
    }).runInInjectionContext(() =>
      adminGuard({} as never, {} as never),
    );

    (result$ as any).subscribe((result: boolean) => {
      expect(result).toBe(false);
      expect(router.navigate).toHaveBeenCalledWith(['/login']);
    });
  });
});
