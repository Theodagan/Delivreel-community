import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

export interface Comment {
  id: string;
  text: string;
  timestamp: number;
  resolved: boolean;
  resolvedAt?: string;
  videoId: string;
  authorId: string;
  author: any;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCommentRequest {
  text: string;
  timestamp: number;
  videoId: string;
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

  constructor(private http: HttpClient) {}

  getCommentsByVideo(videoId: string): Observable<Comment[]> {
    return this.http.get<Comment[]>(`${this.apiUrl}?videoId=${videoId}`);
  }

  createComment(comment: CreateCommentRequest): Observable<Comment> {
    return this.http.post<Comment>(this.apiUrl, comment);
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
}