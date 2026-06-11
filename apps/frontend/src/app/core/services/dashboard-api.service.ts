import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ActivityItem {
  kind: string;
  commentId: string;
  text: string;
  author: string;
  videoTitle: string;
  projectId: string;
  timestamp: string;
}

export interface FeedbackItem {
  commentId: string;
  text: string;
  author: string;
  videoTitle: string;
  projectId: string;
  timestamp: string;
}

export interface StorageInfo {
  totalBytes?: number;
  mode?: string;
  message?: string;
}

@Injectable({ providedIn: 'root' })
export class DashboardApi {
  private base = `${environment.apiUrl}/dashboard`;

  constructor(private http: HttpClient) {}

  getActivity(limit = 10): Observable<ActivityItem[]> {
    return this.http.get<ActivityItem[]>(`${this.base}/activity`, { params: { limit: String(limit) } });
  }

  getFeedback(limit = 10): Observable<FeedbackItem[]> {
    return this.http.get<FeedbackItem[]>(`${this.base}/feedback`, { params: { limit: String(limit) } });
  }

  getStorage(): Observable<StorageInfo> {
    return this.http.get<StorageInfo>(`${this.base}/storage`);
  }
}
