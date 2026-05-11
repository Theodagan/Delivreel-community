import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

import { AuthService } from '../../../core/services/auth.service';
import { VideoService, Video, PlaybackSource } from '../../../core/services/video.service';
import { CommentService, Comment, CreateCommentRequest, UpdateCommentRequest } from '../../../core/services/comment.service';
import { WebSocketService } from '../../../core/services/websocket.service';
import { SettingsService, ApplicationPreferences, CommentFilter } from '../../../core/services/settings.service';
import { PlaybackHostComponent } from '../../../video/playback/playback-host.component';

//TODO: scinder en plusieurs composants : video player, commment, video page
//TODO: ajouter un boutton (upload new version of video)
//TODO: ajouter metadata sur les commentaires (qui a posté, quand, etc...)
//TODO: ajouter un chat global à la page pour échanger et demander des précisions eventuelles sur certains tickets
//TODO: ajouter un download button 
//TODO: ajouter un vue sous forme de tableau pour les commentaires ainsi qu'un systeme de filtres
//TODO : move video upload logic to service to avoid double with project-details.component.ts

@Component({
  selector: 'app-video-player',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule, PlaybackHostComponent],
  templateUrl: './video-player.component.html',
  styleUrls: ['./video-player.component.css'],
})
export class VideoPlayerComponent implements OnInit {
  @ViewChild(PlaybackHostComponent) playbackHost?: PlaybackHostComponent;
  
  video: Video | null = null;
  comments: Comment[] = [];
  showAddComment = false;
  editingCommentId: string | null = null;
  commentForm: FormGroup;
  editCommentForm: FormGroup;
  commentFilter: CommentFilter = 'all';
  appSettings: ApplicationPreferences | null = null;
  currentTime = 0;
  videoDuration = 0;
  isAdmin: boolean = false;

  //upload
  showUploadModal = false;
  isUploading = false;
  uploadForm: FormGroup;
  selectedFile: File | null = null;
  uploadProgress = 0;

  isVideoReady: boolean = false;

  playbackSource: PlaybackSource | null = null;
  playbackError: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private videoService: VideoService,
    private commentService: CommentService,
    private webSocketService: WebSocketService,
    public authService: AuthService,
    private settingsService: SettingsService,
    private fb: FormBuilder,
    private router: Router
  ) {
    this.commentForm = this.fb.group({
      text: ['', [Validators.required]]
    });
    this.editCommentForm = this.fb.group({
      text: ['', [Validators.required]]
    });
    this.uploadForm = this.fb.group({
      title: ['', [Validators.required]],
      description: ['']
    });
    this.isAdmin = this.authService.isAdmin();
  }

  ngOnInit() {
    const videoId = this.route.snapshot.paramMap.get('id');
    if (videoId) {
      // Load the video - this will trigger DOM updates
      this.loadVideo(videoId);
      this.loadComments(videoId);
      this.webSocketService.connect();
      this.webSocketService.joinVideo(videoId);
      this.loadSettings();
    }
  }

  loadSettings() {
    this.settingsService.getPreferences().subscribe({
      next: (settings) => {
        this.appSettings = settings;
        this.commentFilter = settings.defaultCommentFilter;
      },
      error: (error) => console.error('Error loading settings:', error)
    });
  }

  canUploadVideo(): boolean {
    if (!this.video) return false;
    const currentUser = this.authService.getCurrentUser();
    return this.isAdmin || this.video?.project?.ownerId === currentUser?.id;
    
  }

  openUploadModal() {
    if (!this.video) return;
    this.showUploadModal = true;
    this.uploadForm.patchValue({
      title: this.video.title,
      description: this.video.description || ''
    });
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
    }
  }

  onUpload() {
    if (this.uploadForm.valid && this.selectedFile && this.video) {
      this.isUploading = true;
      const previousVideoId = this.video.id;
      const projectId = this.video.projectId;

      const formData = new FormData();
      formData.append('video', this.selectedFile);
      formData.append('title', this.uploadForm.value.title);
      formData.append('description', this.uploadForm.value.description || '');

      this.videoService.updateVideo(this.video.id, formData, this.selectedFile).subscribe({
        next: () => {
          this.closeUploadModal();
          this.webSocketService.leaveVideo(previousVideoId);
          this.comments = [];
          this.isVideoReady = false;
          this.navigateToProject(projectId);
        },
        error: (error) => {
          console.error('Error uploading video:', error);
          this.isUploading = false;
        }
      });
    }
  }

  closeUploadModal() {
    this.showUploadModal = false;
    this.uploadForm.reset();
    this.selectedFile = null;
    this.isUploading = false;
    this.uploadProgress = 0;
  }

  loadVideo(id: string) {
    this.videoService.getVideo(id).subscribe({
      next: (video) => {
        this.video = video;
        const effectiveStatus = this.videoService.getEffectiveStatus(video);
        if (effectiveStatus === 'ready') {
          this.isVideoReady = true;
          this.loadPlaybackSource(video.id);
        } else {
          this.isVideoReady = false;
          this.playbackSource = null;
          this.playbackError = null;
        }
      },
      error: (err) => console.error('Error loading video:', err)
    });
  }

  loadPlaybackSource(id: string) {
    this.videoService.getPlaybackSource(id).subscribe({
      next: (source) => {
        this.playbackSource = source;
        this.playbackError = null;
      },
      error: (err) => {
        console.error('Error loading playback source:', err);
        this.setPlaybackError('Playback source unavailable.');
      }
    });
  }

  setPlaybackError(message: string) {
    this.playbackError = message;
    const provider = this.playbackSource?.type ?? 'unknown';
    console.error('Playback error', {
      provider,
      message,
      videoId: this.video?.id,
    });
  }



  loadComments(videoId: string) {
    this.commentService.getCommentsByVideo(videoId).subscribe({
      next: (comments) => {
        this.comments = comments;
      },
      error: (error) => {
        console.error('Error loading comments:', error);
      }
    });
  }

  onTimeUpdate(seconds: number) {
    this.currentTime = Number(seconds ?? 0);
  }

  onVideoLoaded() {
    this.videoDuration = this.playbackHost?.getDuration() ?? 0;
  }

  seekToComment(comment: Comment) {
    this.setPlayerCurrentTime(comment.timestamp);
  }

  addComment() {
    if (this.commentForm.valid && this.video) {
      const commentData: CreateCommentRequest = {
        text: this.commentForm.value.text,
        timestamp: this.currentTime,
        videoId: this.video.id
      };

      this.commentService.createComment(commentData).subscribe({
        next: () => {
          this.loadComments(this.video!.id);
          this.cancelAddComment();
        },
        error: (error) => {
          console.error('Error adding comment:', error);
        }
      });
    }
  }

  cancelAddComment() {
    this.showAddComment = false;
    this.commentForm.reset();
  }

  editComment(comment: Comment) {
    this.editingCommentId = comment.id;
    this.editCommentForm.patchValue({ text: comment.text });
  }

  saveCommentEdit(comment: Comment) {
    if (this.editCommentForm.invalid) {
      return;
    }

    const update: UpdateCommentRequest = {
      text: this.editCommentForm.value.text,
    };

    this.commentService.updateComment(comment.id, update).subscribe({
      next: () => {
        this.editingCommentId = null;
        this.editCommentForm.reset();
        this.loadComments(this.video!.id);
      },
      error: (error) => console.error('Error updating comment:', error)
    });
  }

  cancelCommentEdit() {
    this.editingCommentId = null;
    this.editCommentForm.reset();
  }

  deleteComment(comment: Comment) {
    this.commentService.deleteComment(comment.id).subscribe({
      next: () => {
        this.loadComments(this.video!.id);
      },
      error: (error) => {
        console.error('Error deleting comment:', error);
      }
    });
  }

  resolveComment(comment: Comment) {
    this.commentService.resolveComment(comment.id).subscribe({
      next: () => {
        this.loadComments(this.video!.id);
      },
      error: (error) => {
        console.error('Error resolving comment:', error);
      }
    });
  }

  canManageComment(comment: Comment): boolean {
    const currentUser = this.authService.getCurrentUser();
    return this.isAdmin || comment.authorId === currentUser?.id;
  }

  canResolveComment(comment: Comment): boolean {
    const currentUser = this.authService.getCurrentUser();
    return this.isAdmin || this.video?.project?.ownerId === currentUser?.id;
  }

  get sortedComments(): Comment[] {
    return [...this.filteredComments].sort((a, b) => a.timestamp - b.timestamp);
  }

  get filteredComments(): Comment[] {
    if (this.commentFilter === 'open') {
      return this.comments.filter(comment => !comment.resolved);
    }
    if (this.commentFilter === 'resolved') {
      return this.comments.filter(comment => comment.resolved);
    }
    return this.comments;
  }

  get markerSizeClass(): string {
    return `markers-${this.appSettings?.timelineMarkerSize ?? 'comfortable'}`;
  }

  get showProviderBadge(): boolean {
    return this.appSettings?.showProviderBadge ?? true;
  }

  formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  formatFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  navigateToProject(projectId?: string) {
    const targetProjectId = projectId ?? this.video?.projectId;
    if (targetProjectId) {
      this.router.navigate(['/projects', targetProjectId]);
    }
  }

  get isVideoProcessing(): boolean {
    if (!this.video) return false;
    return this.videoService.getEffectiveStatus(this.video) === 'processing';
  }

  get hasVideoError(): boolean {
    if (!this.video) return false;
    return this.videoService.getEffectiveStatus(this.video) === 'failed';
  }

  private setPlayerCurrentTime(seconds: number) {
    this.playbackHost?.setCurrentTime(seconds);
  }
}
