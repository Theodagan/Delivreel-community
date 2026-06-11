import { ApplicationConfig, importProvidersFrom, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { OverlayModule } from '@angular/cdk/overlay';

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { editionProviders } from './edition/edition.providers';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideAnimations(),
    importProvidersFrom(OverlayModule),
    ...editionProviders
  ]
};
