import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, ViewChild } from '@angular/core';

import { AuthService } from '../../../../core/services/auth.service';
import { Comment, CommentService } from '../../../../core/services/comment.service';
import { PlaybackSource } from '../../../../core/services/video.service';
import { PlaybackHostComponent } from '../../../../video/playback/playback-host.component';
import { PlaybackCuePoint } from '../../../../video/playback/playback-provider';

@Component({
  selector: 'app-video-review-player',
  standalone: true,
  imports: [CommonModule, PlaybackHostComponent],
  templateUrl: './video-review-player.component.html',
  styleUrls: ['./video-review-player.component.css'],
})
export class VideoReviewPlayerComponent implements OnChanges {
  @ViewChild(PlaybackHostComponent) playbackHost?: PlaybackHostComponent;

  @Input({ required: true }) videoId!: string;
  @Input({ required: true }) projectId!: string;
  @Input() playbackSource: PlaybackSource | null = null;
  @Input() isVideoReady = false;
  @Input() autoplay = false;
  @Input() showReplyMarkers = true;
  @Input() markerSize: 'compact' | 'comfortable' | 'large' = 'comfortable';
  @Input() markerRefresh = 0;
  @Input() playbackError: string | null = null;
  @Input() processingLabel = 'Video unavailable';

  @Output() timeUpdate = new EventEmitter<number>();
  @Output() durationChange = new EventEmitter<number>();
  @Output() playbackErrorChange = new EventEmitter<string>();
  @Output() markerCountChange = new EventEmitter<number>();
  @Output() commentMarkerSelected = new EventEmitter<Comment>();

  comments: Comment[] = [];
  videoDuration = 0;
  commentCuePoints: PlaybackCuePoint[] = [];

  constructor(
    private commentService: CommentService,
    public authService: AuthService,
  ) {}

  ngOnChanges(changes: SimpleChanges) {
    if (
      (changes['videoId'] && this.videoId) ||
      changes['showReplyMarkers'] ||
      changes['markerRefresh']
    ) {
      this.loadMarkers();
    }
  }

  onDurationChange(seconds: number) {
    if (Number.isFinite(seconds) && seconds > 0) {
      this.videoDuration = seconds;
    }
    this.durationChange.emit(seconds);
  }

  onTimeUpdate(seconds: number) {
    this.timeUpdate.emit(Number(seconds ?? 0));
  }

  seekTo(seconds: number) {
    if (Number.isFinite(seconds)) {
      this.playbackHost?.setCurrentTime(seconds);
    }
  }

  seekToComment(comment: Comment) {
    const timestamp = Number(comment.timestamp);
    this.seekTo(timestamp);
    this.commentMarkerSelected.emit(comment);
  }

  formatTime(seconds: number): string {
    const timestamp = Number(seconds);
    if (!Number.isFinite(timestamp)) {
      return '0:00';
    }
    const minutes = Math.floor(timestamp / 60);
    const remainingSeconds = Math.floor(timestamp % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  markerLabel(comment: Comment): string {
    return `${this.formatTime(comment.timestamp)} ${comment.text}`.trim();
  }

  markerPosition(comment: Comment): number {
    const timestamp = Number(comment.timestamp);
    if (!this.hasFiniteVideoDuration || !Number.isFinite(timestamp)) {
      return 0;
    }
    return Math.min(100, Math.max(0, (timestamp / this.videoDuration) * 100));
  }

  get hasFiniteVideoDuration(): boolean {
    return Number.isFinite(this.videoDuration) && this.videoDuration > 0;
  }

  get rootComments(): Comment[] {
    return this.comments.filter((comment) => !comment.parentCommentId);
  }

  get timelineComments(): Comment[] {
    const markers = new Map<string, Comment>();
    for (const comment of this.rootComments) {
      markers.set(comment.id, comment);
      if (this.showReplyMarkers) {
        for (const reply of comment.replies ?? []) {
          markers.set(reply.id, reply);
        }
      }
    }
    return [...markers.values()];
  }

  get markerSizeClass(): string {
    return `markers-${this.markerSize}`;
  }

  isReplyComment(comment: Comment): boolean {
    return !!comment.parentCommentId;
  }

  loadMarkers() {
    if (!this.videoId) return;
    this.commentService.getCommentsByVideo(this.videoId).subscribe({
      next: (comments) => {
        this.comments = comments;
        this.syncCommentCuePoints();
      },
      error: (error) => console.error('Error loading timeline markers:', error),
    });
  }

  private syncCommentCuePoints() {
    this.commentCuePoints = this.timelineComments
      .map((comment) => ({ comment, timestamp: Number(comment.timestamp) }))
      .filter(({ timestamp }) => Number.isFinite(timestamp))
      .map(({ comment, timestamp }) => ({
        id: comment.id,
        time: Math.max(0, timestamp),
        label: comment.text,
        resolved: comment.resolved,
      }));
    this.markerCountChange.emit(this.commentCuePoints.length);
  }
}
