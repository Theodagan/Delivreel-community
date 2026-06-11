import { InjectionToken } from '@angular/core';

import { PlaybackSource } from '../core/playback-source';

export interface PlaybackAttachOptions {
  autoplay: boolean;
  token?: string | null;
  cuePoints?: PlaybackCuePoint[];
  onTimeUpdate: (seconds: number) => void;
  onDurationChange: (seconds: number) => void;
  onError: (message: string) => void;
}

export interface PlaybackCuePoint {
  id: string;
  time: number;
  label: string;
  resolved?: boolean;
}

export interface PlaybackHandle {
  getCurrentTime(): number;
  setCurrentTime(seconds: number): void;
  getDuration(): number;
  setCuePoints?(cuePoints: PlaybackCuePoint[]): void;
  destroy(): void;
}

export interface PlaybackProvider {
  supports(source: PlaybackSource): boolean;
  attach(host: HTMLElement, source: PlaybackSource, options: PlaybackAttachOptions): Promise<PlaybackHandle>;
}

export const PLAYBACK_PROVIDERS = new InjectionToken<PlaybackProvider[]>('PLAYBACK_PROVIDERS');
