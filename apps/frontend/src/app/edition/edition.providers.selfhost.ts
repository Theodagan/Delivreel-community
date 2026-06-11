import { Provider } from '@angular/core';

import { LocalPlaybackProvider } from '../video/local/local-playback.provider';
import { PLAYBACK_PROVIDERS } from '../video/playback/playback-provider';
import { PublicUploadGate, UploadGate } from '../core/upload-gate/upload-gate.service';
import { SUPPORT_URL } from '../core/support-url.token';

export const editionProviders: Provider[] = [
  PublicUploadGate,
  { provide: UploadGate, useExisting: PublicUploadGate },
  LocalPlaybackProvider,
  { provide: PLAYBACK_PROVIDERS, useExisting: LocalPlaybackProvider, multi: true },
  { provide: SUPPORT_URL, useValue: 'https://github.com/Theodagan/Delivreel/discussions' },
];
