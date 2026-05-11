import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

export type TimelineMarkerSize = 'compact' | 'comfortable' | 'large';
export type CommentFilter = 'all' | 'open' | 'resolved';

export interface ApplicationSettings {
  appEnvironment: 'dev' | 'prod' | 'selfhost';
  timelineMarkerSize: TimelineMarkerSize;
  defaultCommentFilter: CommentFilter;
  autoplayOnLoad: boolean;
  showProviderBadge: boolean;
}

export interface ApplicationPreferences {
  timelineMarkerSize: TimelineMarkerSize;
  defaultCommentFilter: CommentFilter;
  autoplayOnLoad: boolean;
  showProviderBadge: boolean;
}

export interface UpdateApplicationSettings {
  timelineMarkerSize?: TimelineMarkerSize;
  defaultCommentFilter?: CommentFilter;
  autoplayOnLoad?: boolean;
  showProviderBadge?: boolean;
}

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly apiUrl = `${environment.apiUrl}/settings`;

  constructor(private http: HttpClient) {}

  getSettings(): Observable<ApplicationSettings> {
    return this.http.get<ApplicationSettings>(this.apiUrl);
  }

  getPreferences(): Observable<ApplicationPreferences> {
    return this.http.get<ApplicationPreferences>(`${this.apiUrl}/preferences`);
  }

  updateSettings(settings: UpdateApplicationSettings): Observable<ApplicationSettings> {
    return this.http.patch<ApplicationSettings>(this.apiUrl, settings);
  }
}
