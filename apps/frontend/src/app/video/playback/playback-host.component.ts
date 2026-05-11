import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges, ViewChild } from '@angular/core';

import { PlaybackSource } from '../core/playback-source';
import { PlaybackHandle } from './playback-provider';
import { PlaybackRegistry } from './playback-registry';

@Component({
  selector: 'app-playback-host',
  standalone: true,
  imports: [CommonModule],
  template: '<div #host class="playback-host"></div>',
  styles: [':host, .playback-host { display: block; width: 100%; height: 100%; }']
})
export class PlaybackHostComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input({ required: true }) source: PlaybackSource | null = null;
  @Input() autoplay = false;
  @Input() token: string | null = null;
  @Output() timeUpdate = new EventEmitter<number>();
  @Output() durationChange = new EventEmitter<number>();
  @Output() playbackError = new EventEmitter<string>();

  @ViewChild('host', { static: true }) host!: ElementRef<HTMLElement>;

  private viewReady = false;
  private handle: PlaybackHandle | null = null;

  constructor(private readonly registry: PlaybackRegistry) {}

  ngAfterViewInit() {
    this.viewReady = true;
    this.attachProvider();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['source'] && this.viewReady) {
      this.attachProvider();
    }
  }

  ngOnDestroy() {
    this.destroyHandle();
  }

  getCurrentTime(): number {
    return this.handle?.getCurrentTime() ?? 0;
  }

  setCurrentTime(seconds: number) {
    this.handle?.setCurrentTime(seconds);
  }

  getDuration(): number {
    return this.handle?.getDuration() ?? 0;
  }

  private async attachProvider() {
    if (!this.source) {
      return;
    }
    this.destroyHandle();
    try {
      const provider = this.registry.getProvider(this.source);
      this.handle = await provider.attach(this.host.nativeElement, this.source, {
        autoplay: this.autoplay,
        token: this.token,
        onTimeUpdate: seconds => this.timeUpdate.emit(seconds),
        onDurationChange: seconds => this.durationChange.emit(seconds),
        onError: message => this.playbackError.emit(message),
      });
    } catch (error) {
      this.playbackError.emit(error instanceof Error ? error.message : 'Playback failed.');
    }
  }

  private destroyHandle() {
    this.handle?.destroy();
    this.handle = null;
    if (this.host?.nativeElement) {
      this.host.nativeElement.replaceChildren();
    }
  }
}
