import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { finalize, shareReplay } from 'rxjs/operators';

import { environment } from '../../../environments/environment';

export interface Comment {
  id: string;
  text: string;
  timestamp: number;
  resolved: boolean;
  resolvedAt?: string;
  videoId: string;
  authorId: number;
  parentCommentId?: string;
  author: any;
  replies?: Comment[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateCommentRequest {
  text: string;
  timestamp: number;
  videoId: string;
  parentCommentId?: string;
}

export interface UpdateCommentRequest {
  text?: string;
  timestamp?: number;
}

@Injectable({
  providedIn: 'root'
})
export class CommentService {
  private readonly apiUrl = `${environment.apiUrl}/comments`;
  private readonly pendingCreates = new Map<string, Observable<Comment>>();

  constructor(private http: HttpClient) {}

  getCommentsByVideo(videoId: string): Observable<Comment[]> {
    return this.http.get<Comment[]>(`${this.apiUrl}?videoId=${videoId}`);
  }

  createComment(comment: CreateCommentRequest): Observable<Comment> {
    const key = this.createDedupeKey(comment);
    const pending = this.pendingCreates.get(key);
    if (pending) {
      return pending;
    }

    const request = this.http.post<Comment>(this.apiUrl, comment).pipe(
      finalize(() => this.pendingCreates.delete(key)),
      shareReplay({ bufferSize: 1, refCount: true }),
    );
    this.pendingCreates.set(key, request);
    return request;
  }

  updateComment(id: string, comment: UpdateCommentRequest): Observable<Comment> {
    return this.http.patch<Comment>(`${this.apiUrl}/${id}`, comment);
  }

  deleteComment(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  resolveComment(id: string): Observable<Comment> {
    return this.http.patch<Comment>(`${this.apiUrl}/${id}/resolve`, {});
  }

  private createDedupeKey(comment: CreateCommentRequest): string {
    return JSON.stringify({
      videoId: comment.videoId,
      parentCommentId: comment.parentCommentId ?? '',
      timestamp: Number(comment.timestamp),
      text: comment.text.trim(),
    });
  }
}
