import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, computed, ElementRef, OnDestroy, signal, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';
import { Comment } from '../../../core/services/comment.service';
import { ApplicationPreferences, SettingsService } from '../../../core/services/settings.service';
import { PlaybackSource, Video, VideoService } from '../../../core/services/video.service';
import { ChatComponent } from '../../chat/chat/chat.component';
import { UiBadgeComponent } from '../../../shared/ui/badge.component';
import { VideoCommentsComponent } from './video-comments/video-comments.component';
import { VideoReviewPlayerComponent } from './video-review-player/video-review-player.component';

@Component({
  selector: 'app-video-page',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, ChatComponent, UiBadgeComponent, VideoCommentsComponent, VideoReviewPlayerComponent],
  templateUrl: './video-page.component.html',
  styleUrls: ['./video-page.component.css'],
})
export class VideoPageComponent implements AfterViewInit, OnDestroy {
  @ViewChild(VideoReviewPlayerComponent) reviewPlayer?: VideoReviewPlayerComponent;
  private resizeObserver?: ResizeObserver;

  readonly commentsCompactBreakpoint = 900;
  video = signal<Video | null>(null);
  playbackSource = signal<PlaybackSource | null>(null);
  playbackError = signal<string | null>(null);
  downloadError = signal<string | null>(null);
  appSettings = signal<ApplicationPreferences | null>(null);

  isVideoReady = signal(false);
  commentsOpen = signal(false);
  containerWidth = signal(this.getInitialContainerWidth());
  isCompactCommentsLayout = computed(() => this.containerWidth() <= this.commentsCompactBreakpoint);
  activeTab = signal<'chat' | 'specs' | 'comments'>('chat');
  currentTime = signal(0);
  commentCount = signal(0);
  unresolvedCount = signal(0);
  markerRefresh = signal(0);
  focusedCommentId = signal<string | null>(null);
  focusedCommentVersion = signal(0);
  pendingStatusRevoke = signal<'approval' | 'signoff' | null>(null);

  showReplyMarkers = signal(true);
  showUploadModal = signal(false);
  isUploading = signal(false);
  isDownloading = signal(false);
  uploadProgress = signal(0);
  selectedFile: File | null = null;
  uploadForm: FormGroup;

  readonly tabs = [
    { id: 'chat' as const, label: 'Chat' },
    { id: 'specs' as const, label: 'Specs' },
    { id: 'comments' as const, label: 'Comments' },
  ];

  constructor(
    private route: ActivatedRoute,
    private videoService: VideoService,
    public authService: AuthService,
    private settingsService: SettingsService,
    private fb: FormBuilder,
    private router: Router,
    private host: ElementRef<HTMLElement>,
  ) {
    this.uploadForm = this.fb.group({
      title: ['', [Validators.required]],
      description: [''],
    });

    const videoId = this.route.snapshot.paramMap.get('id');
    if (videoId) {
      this.loadVideo(videoId);
      this.loadSettings();
    }
  }

  ngAfterViewInit() {
    if (typeof ResizeObserver === 'undefined') {
      return;
    }
    // Track the .video-page container width (not the viewport) so the active
    // comments surface stays aligned with the CSS container query that drives
    // the layout. The host element fills the same inline space as .video-page.
    this.resizeObserver = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (typeof width === 'number') {
        this.onContainerResize(width);
      }
    });
    this.resizeObserver.observe(this.host.nativeElement);
  }

  ngOnDestroy() {
    this.resizeObserver?.disconnect();
  }

  onContainerResize(width: number) {
    this.containerWidth.set(width);
    this.syncCommentsSurfaceForLayout();
  }

  loadSettings() {
    this.settingsService.getPreferences().subscribe({
      next: (settings) => this.appSettings.set(settings),
      error: (error) => console.error('Error loading settings:', error),
    });
  }

  loadVideo(id: string) {
    this.videoService.getVideo(id).subscribe({
      next: (video) => {
        this.video.set(video);
        const effectiveStatus = this.videoService.getEffectiveStatus(video);
        if (effectiveStatus === 'ready') {
          this.isVideoReady.set(true);
          this.loadPlaybackSource(video.id);
        } else {
          this.isVideoReady.set(false);
          this.playbackSource.set(null);
          this.playbackError.set(null);
        }
      },
      error: (err) => console.error('Error loading video:', err),
    });
  }

  loadPlaybackSource(id: string) {
    this.videoService.getPlaybackSource(id).subscribe({
      next: (source) => {
        this.playbackSource.set(source);
        this.playbackError.set(null);
      },
      error: (err) => {
        console.error('Error loading playback source:', err);
        this.setPlaybackError('Playback source unavailable.');
      },
    });
  }

  setPlaybackError(message: string) {
    this.playbackError.set(message);
    console.error('Playback error', {
      provider: this.playbackSource()?.type ?? 'unknown',
      message,
      videoId: this.video()?.id,
    });
  }

  setActiveTab(tab: 'chat' | 'specs' | 'comments') {
    this.activeTab.set(tab);
    if (tab === 'comments') {
      this.commentsOpen.set(false);
    }
  }

  toggleComments() {
    if (this.isCompactCommentsLayout()) {
      this.commentsOpen.set(false);
      this.activeTab.set('comments');
      return;
    }

    this.commentsOpen.update((open) => !open);
  }

  closeComments() {
    this.commentsOpen.set(false);
  }

  onTimeUpdate(seconds: number) {
    this.currentTime.set(Number(seconds ?? 0));
  }

  onCommentSelected(comment: Comment) {
    const timestamp = Number(comment.timestamp);
    if (Number.isFinite(timestamp)) {
      this.reviewPlayer?.seekTo(timestamp);
    }
  }

  focusComment(comment: Comment) {
    if (this.isCompactCommentsLayout()) {
      this.activeTab.set('comments');
      this.commentsOpen.set(false);
      this.scheduleFocusedComment(comment.id);
      return;
    }

    this.commentsOpen.set(true);
    this.setFocusedComment(comment.id);
  }

  onCommentsMutated() {
    this.markerRefresh.update((value) => value + 1);
  }

  setCommentCount(count: number) {
    this.commentCount.set(count);
  }

  setUnresolvedCount(count: number) {
    this.unresolvedCount.set(count);
  }

  toggleReplyMarkers() {
    this.showReplyMarkers.update((value) => !value);
  }

  private getInitialContainerWidth(): number {
    return typeof window !== 'undefined' ? window.innerWidth : this.commentsCompactBreakpoint + 1;
  }

  private syncCommentsSurfaceForLayout() {
    if (this.isCompactCommentsLayout()) {
      if (this.commentsOpen()) {
        this.commentsOpen.set(false);
        this.activeTab.set('comments');
      }
      return;
    }

    // Wide layout has no visible Comments tab trigger; move the comments view
    // into the sidebar instead of leaving an orphaned tab panel.
    if (this.activeTab() === 'comments') {
      this.activeTab.set('chat');
      this.commentsOpen.set(true);
    }
  }

  private setFocusedComment(commentId: string) {
    this.focusedCommentId.set(commentId);
    this.focusedCommentVersion.update((value) => value + 1);
  }

  private scheduleFocusedComment(commentId: string) {
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => this.setFocusedComment(commentId));
      return;
    }

    setTimeout(() => this.setFocusedComment(commentId), 0);
  }

  canUploadVideo(): boolean {
    return !!this.video()?.capabilities?.canUploadVideos;
  }

  canDownloadVideo(): boolean {
    return !!this.video()?.downloadAllowed;
  }

  canActApprove(): boolean {
    const video = this.video();
    return !!video && !video.approvedAt && !!video.capabilities?.canApproveVideos;
  }

  canActSignOff(): boolean {
    const video = this.video();
    return !!video && !video.signedOffAt && !!video.capabilities?.canSignOffVideos;
  }

  approveVideo() {
    const video = this.video();
    if (!video) return;
    this.videoService.approveVideo(video.id).subscribe({
      next: (updated) => this.video.set(updated),
      error: (error) => console.error('Error approving:', error),
    });
  }

  signOffVideo() {
    const video = this.video();
    if (!video) return;
    this.videoService.signOffVideo(video.id).subscribe({
      next: (updated) => this.video.set(updated),
      error: (error) => console.error('Error signing off:', error),
    });
  }

  requestRevokeApproval() {
    this.pendingStatusRevoke.set('approval');
  }

  requestRevokeSignOff() {
    this.pendingStatusRevoke.set('signoff');
  }

  cancelStatusRevoke() {
    this.pendingStatusRevoke.set(null);
  }

  confirmStatusRevoke() {
    const pending = this.pendingStatusRevoke();
    this.pendingStatusRevoke.set(null);
    if (pending === 'approval') {
      this.revokeApproval();
    }
    if (pending === 'signoff') {
      this.revokeSignOff();
    }
  }

  revokeApproval() {
    const video = this.video();
    if (!video) return;
    this.videoService.revokeApproval(video.id).subscribe({
      next: (updated) => this.video.set(updated),
      error: (error) => console.error('Error revoking approval:', error),
    });
  }

  revokeSignOff() {
    const video = this.video();
    if (!video) return;
    this.videoService.revokeSignOff(video.id).subscribe({
      next: (updated) => this.video.set(updated),
      error: (error) => console.error('Error revoking sign-off:', error),
    });
  }

  downloadVideo() {
    const video = this.video();
    if (!video || !this.canDownloadVideo() || this.isDownloading()) return;
    this.isDownloading.set(true);
    this.downloadError.set(null);
    this.videoService.downloadVideo(video.id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = video.originalFilename || `${video.title || 'video'}.mp4`;
        link.click();
        URL.revokeObjectURL(url);
        this.isDownloading.set(false);
      },
      error: (error) => {
        console.error('Error downloading video:', error);
        this.downloadError.set(error?.error?.message || 'Download unavailable.');
        this.isDownloading.set(false);
      },
    });
  }

  openUploadModal() {
    const video = this.video();
    if (!video) return;
    this.showUploadModal.set(true);
    this.uploadForm.patchValue({
      title: video.title,
      description: video.description || '',
    });
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
    }
  }

  onUpload() {
    const video = this.video();
    if (this.uploadForm.invalid || !this.selectedFile || !video) return;
    this.isUploading.set(true);
    this.uploadProgress.set(0);
    const projectId = video.projectId;

    const formData = new FormData();
    formData.append('video', this.selectedFile);
    formData.append('title', this.uploadForm.value.title);
    formData.append('description', this.uploadForm.value.description || '');

    this.videoService.updateVideo(video.id, formData, this.selectedFile, (progress) => {
      this.uploadProgress.set(progress);
    }).subscribe({
      next: () => {
        this.uploadProgress.set(100);
        this.closeUploadModal();
        this.navigateToProject(projectId);
      },
      error: (error) => {
        console.error('Error uploading video:', error);
        this.isUploading.set(false);
        this.uploadProgress.set(0);
      },
    });
  }

  closeUploadModal() {
    this.showUploadModal.set(false);
    this.uploadForm.reset();
    this.selectedFile = null;
    this.isUploading.set(false);
    this.uploadProgress.set(0);
  }

  navigateToProject(projectId?: string) {
    const targetProjectId = projectId ?? this.video()?.projectId;
    if (targetProjectId) {
      this.router.navigate(['/projects', targetProjectId]);
    }
  }

  get isVideoProcessing(): boolean {
    const video = this.video();
    if (!video) return false;
    return this.videoService.getEffectiveStatus(video) === 'processing';
  }

  get hasVideoError(): boolean {
    const video = this.video();
    if (!video) return false;
    return this.videoService.getEffectiveStatus(video) === 'failed';
  }

  formatFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
  }
}
