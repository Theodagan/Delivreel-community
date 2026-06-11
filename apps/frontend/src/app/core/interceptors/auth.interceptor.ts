import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { MagicLinkService } from '../services/magic-link.service';
import { WebSocketService } from '../services/websocket.service';
import { environment } from '../../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const webSocketService = inject(WebSocketService);
  const magicLinkService = inject(MagicLinkService);
  const token = authService.getToken();
  const magicLinkToken = magicLinkService.getToken();

  const request = token && isBackendApiRequest(req.url)
    ? req.clone({ headers: req.headers.set('Authorization', `Bearer ${token}`) })
    : magicLinkToken && isBackendApiRequest(req.url)
      ? req.clone({ headers: req.headers.set('X-Magic-Link-Token', magicLinkToken) })
    : req;

  return next(request).pipe(
    catchError((error) => {
      if (error instanceof HttpErrorResponse && error.status === 401 && isBackendApiRequest(req.url)) {
        if (magicLinkToken && !token) {
          magicLinkService.clear();
        } else {
          webSocketService.disconnect();
          authService.logout();
        }
        if (!isAuthRoute(router.url) && !router.url.startsWith('/share/')) {
          router.navigate(['/login'], { replaceUrl: true });
        }
      }
      return throwError(() => error);
    }),
  );
};

function isAuthRoute(url: string): boolean {
  return url.startsWith('/login') || url.startsWith('/register');
}

function isBackendApiRequest(url: string): boolean {
  if (environment.apiUrl.startsWith('/')) {
    return url === environment.apiUrl || url.startsWith(`${environment.apiUrl}/`);
  }

  try {
    const requestUrl = new URL(url, window.location.origin);
    const apiUrl = new URL(environment.apiUrl);
    return requestUrl.origin === apiUrl.origin && requestUrl.pathname.startsWith(apiUrl.pathname);
  } catch {
    return false;
  }
}
