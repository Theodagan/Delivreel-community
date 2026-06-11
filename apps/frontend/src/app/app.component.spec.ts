import { of } from 'rxjs';

import { AppComponent } from './app.component';

describe('AppComponent', () => {
  it('tracks authentication state', () => {
    const authService = {
      isAuthenticated$: of(false),
    };

    const component = new AppComponent(authService as never);
    component.ngOnInit();

    expect(component.isAuthenticated).toBe(false);
  });

  it('reflects authenticated state', () => {
    const authService = {
      isAuthenticated$: of(true),
    };

    const component = new AppComponent(authService as never);
    component.ngOnInit();

    expect(component.isAuthenticated).toBe(true);
  });
});
