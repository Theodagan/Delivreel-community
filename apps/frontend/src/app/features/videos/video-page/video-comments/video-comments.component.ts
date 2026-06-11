import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { AuthService } from '../../../../core/services/auth.service';
import { Comment, CommentService, CreateCommentRequest, UpdateCommentRequest } from '../../../../core/services/comment.service';
import { CommentFilter } from '../../../../core/services/settings.service';
import { ElementHighlighterService } from '../../../../shared/services/element-highlighter.service';
import { UiBadgeComponent } from '../../../../shared/ui/badge.component';

@Component({
  selector: 'app-video-comments',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, UiBadgeComponent],
  templateUrl: './video-comments.component.html',
  styleUrls: ['./video-comments.component.css'],
})
export class VideoCommentsComponent implements OnInit, OnChanges, OnDestroy {
  @Input({ required: true }) videoId!: string;
  @Input({ required: true }) projectId!: string;
  @Input() projectOwnerId?: string;
  @Input() currentTime = 0;
  @Input() focusedCommentId: string | null = null;
  @Input() focusedCommentVersion = 0;
  @Input() focusHighlightColor = 'var(--ui-primary)';
  @Input() canResolveComments = false;
  @Input() canComment = true;

  @Output() commentsChange = new EventEmitter<Comment[]>();
  @Output() commentsMutated = new EventEmitter<void>();
  @Output() commentSelected = new EventEmitter<Comment>();
  @Output() totalCountChange = new EventEmitter<number>();
  @Output() unresolvedCountChange = new EventEmitter<number>();

  comments: Comment[] = [];
  showAddComment = false;
  isCreatingComment = false;
  editingCommentId: string | null = null;
  replyingToCommentId: string | null = null;
  replyingCommentIds = new Set<string>();
  commentFilter: CommentFilter = 'all';

  commentForm: FormGroup;
  editCommentForm: FormGroup;
  replyForm: FormGroup;

  private readonly destroy$ = new Subject<void>();
  private readonly maxLoadRetries = 3;
  private loadRetryCount = 0;
  private loadRetryTimeout: ReturnType<typeof setTimeout> | null = null;
  private loadGeneration = 0;
  private destroyed = false;

  constructor(
    private commentService: CommentService,
    private authService: AuthService,
    private fb: FormBuilder,
    private host: ElementRef<HTMLElement>,
    private elementHighlighter: ElementHighlighterService,
  ) {
    this.commentForm = this.fb.group({ text: ['', [Validators.required]] });
    this.editCommentForm = this.fb.group({ text: ['', [Validators.required]] });
    this.replyForm = this.fb.group({ text: ['', [Validators.required]] });
  }

  ngOnInit() {
    this.loadComments();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['videoId'] && !changes['videoId'].firstChange) {
      this.loadComments();
    }
    if ((changes['focusedCommentId'] || changes['focusedCommentVersion']) && this.focusedCommentId) {
      this.scheduleFocusedCommentScroll(this.focusedCommentId);
    }
  }

  ngOnDestroy() {
    this.destroyed = true;
    this.destroy$.next();
    this.destroy$.complete();
    this.clearFocusTimers();
    this.clearLoadRetry();
  }

  loadComments() {
    this.loadRetryCount = 0;
    this.clearLoadRetry();
    this.loadGeneration++;
    this.attemptLoadComments(this.loadGeneration);
  }

  private attemptLoadComments(generation: number) {
    if (!this.videoId || this.destroyed) return;
    this.commentService.getCommentsByVideo(this.videoId).pipe(
      takeUntil(this.destroy$),
    ).subscribe({
      next: (comments) => this.handleLoadCommentsResult(comments, generation),
      error: (error) => console.error('Error loading comments:', error),
    });
  }

  private handleLoadCommentsResult(comments: Comment[], generation: number) {
    if (this.destroyed || generation !== this.loadGeneration) return;

    if (comments.length === 0 && this.loadRetryCount < this.maxLoadRetries) {
      this.loadRetryCount++;
      this.scheduleLoadRetry(generation);
      return;
    }

    this.setComments(comments);
  }

  private scheduleLoadRetry(generation: number) {
    this.clearLoadRetry();
    const delay = 100 * Math.pow(2, this.loadRetryCount - 1);
    this.loadRetryTimeout = setTimeout(() => this.attemptLoadComments(generation), delay);
  }

  addComment() {
    if (this.commentForm.invalid || !this.videoId || !this.canComment || this.isCreatingComment) return;
    const commentData: CreateCommentRequest = {
      text: this.commentForm.value.text,
      timestamp: this.currentTime,
      videoId: this.videoId,
    };

    this.isCreatingComment = true;
    this.commentService.createComment(commentData).subscribe({
      next: () => {
        if (this.destroyed) return;
        this.isCreatingComment = false;
        this.cancelAddComment();
        this.reloadAfterMutation();
      },
      error: (error) => {
        if (this.destroyed) return;
        this.isCreatingComment = false;
        console.error('Error adding comment:', error);
      },
    });
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
    if (this.editCommentForm.invalid) return;
    const update: UpdateCommentRequest = { text: this.editCommentForm.value.text };

    this.commentService.updateComment(comment.id, update).subscribe({
      next: () => {
        if (this.destroyed) return;
        this.editingCommentId = null;
        this.editCommentForm.reset();
        this.reloadAfterMutation();
      },
      error: (error) => {
        if (this.destroyed) return;
        console.error('Error updating comment:', error);
      },
    });
  }

  cancelCommentEdit() {
    this.editingCommentId = null;
    this.editCommentForm.reset();
  }

  deleteComment(comment: Comment) {
    this.commentService.deleteComment(comment.id).subscribe({
      next: () => {
        if (this.destroyed) return;
        this.reloadAfterMutation();
      },
      error: (error) => {
        if (this.destroyed) return;
        console.error('Error deleting comment:', error);
      },
    });
  }

  resolveComment(comment: Comment) {
    this.commentService.resolveComment(comment.id).subscribe({
      next: () => {
        if (this.destroyed) return;
        this.reloadAfterMutation();
      },
      error: (error) => {
        if (this.destroyed) return;
        console.error('Error resolving comment:', error);
      },
    });
  }

  startReply(commentId: string) {
    this.replyingToCommentId = commentId;
    this.replyForm.reset();
  }

  cancelReply() {
    this.replyingToCommentId = null;
    this.replyForm.reset();
  }

  submitReply(parentId: string) {
    if (this.replyForm.invalid || !this.videoId || !this.canComment || this.replyingCommentIds.has(parentId)) return;
    const text = this.replyForm.value.text?.trim();
    if (!text) return;

    this.replyingCommentIds.add(parentId);
    this.commentService.createComment({
      text,
      timestamp: this.currentTime,
      videoId: this.videoId,
      parentCommentId: parentId,
    }).subscribe({
      next: () => {
        if (this.destroyed) return;
        this.replyingCommentIds.delete(parentId);
        this.cancelReply();
        this.reloadAfterMutation();
      },
      error: (error) => {
        if (this.destroyed) return;
        this.replyingCommentIds.delete(parentId);
        console.error('Error replying:', error);
      },
    });
  }

  selectComment(comment: Comment) {
    this.commentSelected.emit(comment);
  }

  canManageComment(comment: Comment): boolean {
    const currentUser = this.authService.getCurrentUser();
    return String(comment.authorId) === String(currentUser?.id);
  }

  canResolveComment(comment: Comment): boolean {
    const currentUser = this.authService.getCurrentUser();
    return this.canResolveComments || String(this.projectOwnerId) === String(currentUser?.id) || this.canManageComment(comment);
  }

  get sortedComments(): Comment[] {
    return [...this.filteredComments].sort((a, b) => a.timestamp - b.timestamp);
  }

  get filteredComments(): Comment[] {
    const comments = this.rootComments;
    if (this.commentFilter === 'open') {
      return comments.filter((comment) => !comment.resolved);
    }
    if (this.commentFilter === 'resolved') {
      return comments.filter((comment) => comment.resolved);
    }
    return comments;
  }

  get rootComments(): Comment[] {
    return this.comments.filter((comment) => !comment.parentCommentId);
  }

  get unresolvedCount(): number {
    return this.rootComments.filter((comment) => !comment.resolved).length;
  }

  formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  private reloadAfterMutation() {
    this.loadComments();
    this.commentsMutated.emit();
  }

  private setComments(comments: Comment[]) {
    this.comments = this.uniqueById(comments);
    this.commentsChange.emit(this.comments);
    this.totalCountChange.emit(this.rootComments.length);
    this.unresolvedCountChange.emit(this.unresolvedCount);
    if (this.focusedCommentId) {
      this.scheduleFocusedCommentScroll(this.focusedCommentId);
    }
  }

  private focusRetryTimeout: ReturnType<typeof setTimeout> | null = null;
  private scheduleFocusedCommentScroll(commentId: string) {
    this.clearFocusRetry();
    this.runAfterPaint(() => {
      if (!this.scrollToFocusedComment(commentId)) {
        this.focusRetryTimeout = setTimeout(() => this.scrollToFocusedComment(commentId), 100);
      }
    });
  }

  private scrollToFocusedComment(commentId: string): boolean {
    const target = this.host.nativeElement.querySelector<HTMLElement>(`[data-comment-id="${this.escapeSelector(commentId)}"]`);
    if (!target) {
      return false;
    }

    this.elementHighlighter.highlightElement(target, { color: this.focusHighlightColor });
    return true;
  }

  private runAfterPaint(callback: () => void) {
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(callback);
      return;
    }
    setTimeout(callback, 0);
  }

  private escapeSelector(value: string): string {
    if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
      return CSS.escape(value);
    }
    return value.replace(/["\\]/g, '\\$&');
  }

  private clearFocusTimers() {
    this.clearFocusRetry();
  }

  private clearLoadRetry() {
    if (this.loadRetryTimeout) {
      clearTimeout(this.loadRetryTimeout);
      this.loadRetryTimeout = null;
    }
  }

  private clearFocusRetry() {
    if (this.focusRetryTimeout) {
      clearTimeout(this.focusRetryTimeout);
      this.focusRetryTimeout = null;
    }
  }

  private uniqueById(comments: Comment[]): Comment[] {
    const unique = new Map<string, Comment>();
    for (const comment of comments) {
      const existing = unique.get(comment.id);
      unique.set(comment.id, {
        ...existing,
        ...comment,
        replies: this.uniqueById([...(existing?.replies ?? []), ...(comment.replies ?? [])]),
      });
    }
    return [...unique.values()];
  }
}
