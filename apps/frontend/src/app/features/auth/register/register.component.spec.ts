import { FormBuilder } from '@angular/forms';
import { of, throwError } from 'rxjs';

import { RegisterComponent } from './register.component';

describe('RegisterComponent', () => {
  const fb = new FormBuilder();

  it('submits register form without role and navigates home after success', () => {
    const authService = {
      register: jest.fn().mockReturnValue(of({})),
    };
    const router = {
      navigate: jest.fn(),
    };
    const component = new RegisterComponent(
      fb,
      authService as never,
      router as never,
    );

    component.registerForm.setValue({
      name: 'User',
      email: 'u@example.com',
      password: 'password',
    });

    component.onSubmit();

    expect(authService.register).toHaveBeenCalledWith({
      name: 'User',
      email: 'u@example.com',
      password: 'password',
    });
    expect(component.successMessage).toContain('Account created successfully');
    expect(router.navigate).toHaveBeenCalledWith(['/']);
    expect(component.isLoading).toBe(false);
  });

  it('shows error message when registration fails', () => {
    const authService = {
      register: jest.fn().mockReturnValue(
        throwError(() => ({ error: { message: 'Email already exists' } })),
      ),
    };
    const router = {
      navigate: jest.fn(),
    };
    const component = new RegisterComponent(
      fb,
      authService as never,
      router as never,
    );

    component.registerForm.setValue({
      name: 'User',
      email: 'u@example.com',
      password: 'password',
    });

    component.onSubmit();

    expect(component.errorMessage).toBe('Email already exists');
    expect(component.isLoading).toBe(false);
  });
});
