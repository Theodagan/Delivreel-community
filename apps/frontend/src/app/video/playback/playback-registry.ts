import { Inject, Injectable, Optional } from '@angular/core';

import { PlaybackSource } from '../core/playback-source';
import { PLAYBACK_PROVIDERS, PlaybackProvider } from './playback-provider';

@Injectable({ providedIn: 'root' })
export class PlaybackRegistry {
  constructor(@Optional() @Inject(PLAYBACK_PROVIDERS) private readonly providers: PlaybackProvider[] | null) {}

  getProvider(source: PlaybackSource): PlaybackProvider {
    const provider = this.providers?.find(candidate => candidate.supports(source));
    if (!provider) {
      throw new Error(`No playback provider registered for source type: ${source.type}`);
    }
    return provider;
  }
}
