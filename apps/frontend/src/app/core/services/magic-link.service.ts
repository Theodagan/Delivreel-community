import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ProjectAccessLink, ProjectPermissions } from './project.service';

export interface MagicLinkResolveResponse {
  accessLink: ProjectAccessLink;
  capabilities: ProjectPermissions;
  target: {
    type: 'project' | 'video';
    projectId: string;
    videoId?: string;
    route: string;
  };
}

@Injectable({ providedIn: 'root' })
export class MagicLinkService {
  private readonly tokenKey = 'magic_link_token';
  private readonly accessKey = 'magic_link_access';

  constructor(private http: HttpClient) {}

  resolve(token: string): Observable<MagicLinkResolveResponse> {
    return this.http.post<MagicLinkResolveResponse>(`${environment.apiUrl}/magic-links/resolve`, { token }).pipe(
      tap((response) => this.setAccess(token, response)),
    );
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  getAccess(): MagicLinkResolveResponse | null {
    const raw = localStorage.getItem(this.accessKey);
    return raw ? JSON.parse(raw) : null;
  }

  clear() {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.accessKey);
  }

  canActivateUrl(url: string): boolean {
    const access = this.getAccess();
    if (!access) {
      return false;
    }
    if (access.target.type === 'video') {
      return url.startsWith(`/videos/${access.target.videoId}`);
    }
    return url.startsWith(`/projects/${access.target.projectId}`) || url.startsWith(`/videos/`);
  }

  private setAccess(token: string, response: MagicLinkResolveResponse) {
    localStorage.setItem(this.tokenKey, token);
    localStorage.setItem(this.accessKey, JSON.stringify(response));
  }
}
