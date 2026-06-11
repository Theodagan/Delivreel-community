import { Router } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { accessGuard } from './access.guard';
import { AuthService } from '../services/auth.service';
import { MagicLinkService } from '../services/magic-link.service';

describe('accessGuard', () => {
  const router = { navigate: jest.fn() };

  beforeEach(() => {
    TestBed.resetTestingModule();
    jest.clearAllMocks();
  });

  it('allows authenticated users', (done) => {
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { isAuthenticated$: of(true) } },
        { provide: MagicLinkService, useValue: { canActivateUrl: () => false, getAccess: () => null } },
        { provide: Router, useValue: router },
      ],
    });

    const result = TestBed.runInInjectionContext(() => accessGuard({} as never, { url: '/videos/v1' } as never));
    (result as any).subscribe((allowed: boolean) => {
      expect(allowed).toBe(true);
      done();
    });
  });

  it('allows scoped magic-link routes', (done) => {
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { isAuthenticated$: of(false) } },
        { provide: MagicLinkService, useValue: { canActivateUrl: () => true, getAccess: () => null } },
        { provide: Router, useValue: router },
      ],
    });

    const result = TestBed.runInInjectionContext(() => accessGuard({} as never, { url: '/videos/v1' } as never));
    (result as any).subscribe((allowed: boolean) => {
      expect(allowed).toBe(true);
      done();
    });
  });
});
