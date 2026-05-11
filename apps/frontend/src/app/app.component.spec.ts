import { of } from 'rxjs';

import { AppComponent } from './app.component';

describe('AppComponent', () => {
  it('redirects to login when unauthenticated', () => {
    const authService = {
      isAuthenticated$: of(false),
    };
    const router = {
      navigate: jest.fn(),
    };

    const component = new AppComponent(authService as never, router as never);
    component.ngOnInit();

    expect(component.isAuthenticated).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('keeps authenticated users on current route', () => {
    const authService = {
      isAuthenticated$: of(true),
    };
    const router = {
      navigate: jest.fn(),
    };

    const component = new AppComponent(authService as never, router as never);
    component.ngOnInit();

    expect(component.isAuthenticated).toBe(true);
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
