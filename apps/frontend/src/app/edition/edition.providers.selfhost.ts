import { Provider } from '@angular/core';

import { LocalPlaybackProvider } from '../video/local/local-playback.provider';
import { PLAYBACK_PROVIDERS } from '../video/playback/playback-provider';

export const editionProviders: Provider[] = [
  LocalPlaybackProvider,
  { provide: PLAYBACK_PROVIDERS, useExisting: LocalPlaybackProvider, multi: true },
];
