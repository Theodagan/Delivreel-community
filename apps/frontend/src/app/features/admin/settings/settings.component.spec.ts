import { FormBuilder } from '@angular/forms';
import { of, throwError } from 'rxjs';

import { SettingsComponent } from './settings.component';

describe('SettingsComponent', () => {
  const fb = new FormBuilder();

  it('loads self-host settings on init', () => {
    const settingsService = {
      getSettings: jest.fn().mockReturnValue(of({
        appEnvironment: 'selfhost',
        timelineMarkerSize: 'comfortable',
        defaultCommentFilter: 'all',
        autoplayOnLoad: false,
        showProviderBadge: true,
      })),
    };
    const component = new SettingsComponent(settingsService as never, fb);

    component.ngOnInit();

    expect(component.settings).toEqual(expect.objectContaining({ appEnvironment: 'selfhost' }));
    expect(component.settingsForm.value.timelineMarkerSize).toBe('comfortable');
  });

  it('shows settings error when settings call fails', () => {
    const settingsService = {
      getSettings: jest
        .fn()
        .mockReturnValue(throwError(() => new Error('unavailable'))),
    };
    const component = new SettingsComponent(settingsService as never, fb);

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      component.loadSettings();

      expect(component.settings).toBeNull();
      expect(component.settingsError).toBe('Settings unavailable.');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to load settings:', expect.any(Error));
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });
});
