import { InjectionToken } from '@angular/core';

export const SUPPORT_URL = new InjectionToken<string>('SUPPORT_URL', {
  factory: () => 'https://github.com/Theodagan/Delivreel/discussions',
});
