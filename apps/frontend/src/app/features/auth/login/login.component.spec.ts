import { FormBuilder } from '@angular/forms';
import { of, throwError } from 'rxjs';

import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  const fb = new FormBuilder();

  it('does not submit when form is invalid', () => {
    const authService = {
      login: jest.fn(),
    };
    const router = {
      navigate: jest.fn(),
    };
    const component = new LoginComponent(
      fb,
      authService as never,
      router as never,
    );

    component.onSubmit();

    expect(authService.login).not.toHaveBeenCalled();
  });

  it('submits and navigates to dashboard on success', () => {
    const authService = {
      login: jest.fn().mockReturnValue(of({})),
    };
    const router = {
      navigate: jest.fn(),
    };
    const component = new LoginComponent(
      fb,
      authService as never,
      router as never,
    );
    component.loginForm.setValue({ email: 'u@example.com', password: 'password' });

    component.onSubmit();

    expect(authService.login).toHaveBeenCalledWith('u@example.com', 'password');
    expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
    expect(component.isLoading).toBe(false);
  });

  it('shows error message on failed login', () => {
    const authService = {
      login: jest.fn().mockReturnValue(
        throwError(() => ({ error: { message: 'Invalid credentials' } })),
      ),
    };
    const router = {
      navigate: jest.fn(),
    };
    const component = new LoginComponent(
      fb,
      authService as never,
      router as never,
    );
    component.loginForm.setValue({ email: 'u@example.com', password: 'bad' });

    component.onSubmit();

    expect(component.errorMessage).toBe('Invalid credentials');
    expect(component.isLoading).toBe(false);
  });
});
