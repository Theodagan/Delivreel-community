import { Injectable } from '@angular/core';
import Hls from 'hls.js';

import { PlaybackSource } from '../core/playback-source';
import { PlaybackAttachOptions, PlaybackHandle, PlaybackProvider } from '../playback/playback-provider';

type LocalPlaybackSource = PlaybackSource & { manifestUrl?: string };

@Injectable()
export class LocalPlaybackProvider implements PlaybackProvider {
  supports(source: PlaybackSource): boolean {
    return source.type === 'local';
  }

  async attach(host: HTMLElement, source: LocalPlaybackSource, options: PlaybackAttachOptions): Promise<PlaybackHandle> {
    const video = document.createElement('video');
    video.className = 'video-player';
    video.controls = true;
    video.style.display = 'block';
    video.style.width = '100%';
    video.style.height = '100%';
    video.style.maxWidth = '100%';
    video.style.maxHeight = '100%';
    video.style.objectFit = 'contain';
    host.appendChild(video);

    const onTimeUpdate = () => options.onTimeUpdate(Number(video.currentTime ?? 0));
    const onDurationChange = () => options.onDurationChange(Number(video.duration ?? 0));
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('loadedmetadata', onDurationChange);
    video.addEventListener('durationchange', onDurationChange);

    let hls: Hls | null = null;
    if (Hls.isSupported() && source.manifestUrl) {
      hls = new Hls({
        xhrSetup: (xhr) => {
          if (options.token) {
            xhr.setRequestHeader('Authorization', `Bearer ${options.token}`);
          }
        }
      });
      hls.loadSource(source.manifestUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data?.fatal) {
          options.onError('Playback failed. Please try again later.');
        }
      });
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (options.autoplay) {
          video.play().catch(error => console.info('Autoplay prevented:', error));
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl') && source.manifestUrl) {
      video.src = source.manifestUrl;
    } else {
      options.onError('Local playback requires a browser that supports authenticated HLS requests.');
    }

    return {
      getCurrentTime: () => Number(video.currentTime ?? 0),
      setCurrentTime: (seconds: number) => { video.currentTime = seconds; },
      getDuration: () => Number(video.duration ?? 0),
      destroy: () => {
        hls?.destroy();
        video.removeEventListener('timeupdate', onTimeUpdate);
        video.removeEventListener('loadedmetadata', onDurationChange);
        video.removeEventListener('durationchange', onDurationChange);
        video.remove();
      },
    };
  }
}
