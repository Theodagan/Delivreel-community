import { NavbarComponent } from './navbar.component';

describe('NavbarComponent', () => {
  it('loads current user on construction', () => {
    const authService = {
      getCurrentUser: jest.fn().mockReturnValue({ id: 'u1', name: 'Admin' }),
      logout: jest.fn(),
    };

    const component = new NavbarComponent(authService as never);

    expect(component.currentUser).toEqual({ id: 'u1', name: 'Admin' });
  });

  it('logs out through auth service', () => {
    const authService = {
      getCurrentUser: jest.fn().mockReturnValue(null),
      logout: jest.fn(),
    };

    const component = new NavbarComponent(authService as never);
    component.logout();

    expect(authService.logout).toHaveBeenCalled();
  });
});