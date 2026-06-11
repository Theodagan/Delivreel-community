import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { map } from 'rxjs';

import { AuthService } from '../services/auth.service';
import { MagicLinkService } from '../services/magic-link.service';

export const accessGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const magicLinkService = inject(MagicLinkService);
  const router = inject(Router);

  return authService.isAuthenticated$.pipe(
    map((isAuthenticated) => {
      if (isAuthenticated) {
        return true;
      }
      if (magicLinkService.canActivateUrl(state.url)) {
        return true;
      }
      const target = magicLinkService.getAccess()?.target.route;
      router.navigate([target || '/login'], { replaceUrl: true });
      return false;
    }),
  );
};
