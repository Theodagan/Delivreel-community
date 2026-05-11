import { NavbarComponent } from './navbar.component';

describe('NavbarComponent', () => {
  it('loads current user and admin status on construction', () => {
    const authService = {
      getCurrentUser: jest.fn().mockReturnValue({ id: 'u1', name: 'Admin' }),
      isAdmin: jest.fn().mockReturnValue(true),
      logout: jest.fn(),
    };

    const component = new NavbarComponent(authService as never);

    expect(component.currentUser).toEqual({ id: 'u1', name: 'Admin' });
    expect(component.isAdmin).toBe(true);
  });

  it('logs out through auth service', () => {
    const authService = {
      getCurrentUser: jest.fn().mockReturnValue(null),
      isAdmin: jest.fn().mockReturnValue(false),
      logout: jest.fn(),
    };

    const component = new NavbarComponent(authService as never);
    component.logout();

    expect(authService.logout).toHaveBeenCalled();
  });
});
