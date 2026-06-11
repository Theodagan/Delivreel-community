import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

export interface Project {
  id: string;
  title: string;
  description?: string;
  clientEmails: string[];
  ownerId: number;
  owner: any;
  videos: any[];
  approverIds?: string[];
  createdAt: string;
  updatedAt: string;
  capabilities?: ProjectPermissions;
}

export interface EligibleApprover {
  id: number;
  name: string;
  email: string;
  isActive: boolean;
}

export type ProjectMemberRole = 'owner' | 'team_lead' | 'collaborator' | 'client' | 'viewer';
export type ProjectMemberStatus = 'invited' | 'active' | 'disabled';

export interface ProjectPermissions {
  canView: boolean;
  canComment: boolean;
  canResolveComments: boolean;
  canUploadVideos: boolean;
  canDownloadVideos: boolean;
  canApproveVideos: boolean;
  canSignOffVideos: boolean;
  canInviteMembers: boolean;
  canManageSettings: boolean;
}

export interface ProjectMember extends ProjectPermissions {
  id: string;
  projectId: string;
  userId?: string | null;
  email: string;
  displayName?: string | null;
  role: ProjectMemberRole;
  status: ProjectMemberStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectAccessLink extends ProjectPermissions {
  id: string;
  projectId: string;
  videoId?: string | null;
  label: string;
  status: 'active' | 'revoked';
  expiresAt?: string | null;
  lastUsedAt?: string | null;
  createdByUserId: string;
  revokedByUserId?: string | null;
  revokedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type CreateProjectAccessLinkRequest = Partial<ProjectPermissions> & {
  label: string;
  videoId?: string | null;
  expiresAt?: string | null;
};

export type UpdateProjectAccessLinkRequest = Partial<ProjectPermissions> & {
  label?: string;
  expiresAt?: string | null;
};

export interface ProjectAccessLinkTokenResponse {
  accessLink: ProjectAccessLink;
  token: string;
}

export interface ProjectSettingsVideo {
  id: string;
  title: string;
  status: string;
  downloadEnabled: boolean;
  downloadSupported: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectSettingsResponse {
  project: Project;
  capabilities: ProjectPermissions;
  accessSource: string;
  members: ProjectMember[];
  accessLinks: ProjectAccessLink[];
  videos: ProjectSettingsVideo[];
  metadata: {
    videoCount: number;
    memberCount: number;
  };
  payment: null;
}

export interface CreateProjectRequest {
  title: string;
  description?: string;
  clientEmails?: string[];
}

export interface UpdateProjectRequest {
  title?: string;
  description?: string;
  clientEmails?: string[];
  approverIds?: string[];
}

@Injectable({
  providedIn: 'root'
})
export class ProjectService {
  private readonly apiUrl = `${environment.apiUrl}/projects`;

  constructor(private http: HttpClient) {}

  getProjects(): Observable<Project[]> {
    return this.http.get<Project[]>(this.apiUrl);
  }

  getProject(id: string): Observable<Project> {
    return this.http.get<Project>(`${this.apiUrl}/${id}`);
  }

  createProject(project: CreateProjectRequest): Observable<Project> {
    return this.http.post<Project>(this.apiUrl, project);
  }

  updateProject(id: string, project: UpdateProjectRequest): Observable<Project> {
    return this.http.patch<Project>(`${this.apiUrl}/${id}`, project);
  }

  deleteProject(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  getEligibleApprovers(projectId: string): Observable<EligibleApprover[]> {
    return this.http.get<EligibleApprover[]>(`${this.apiUrl}/${projectId}/eligible-approvers`);
  }

  getProjectSettings(id: string): Observable<ProjectSettingsResponse> {
    return this.http.get<ProjectSettingsResponse>(`${this.apiUrl}/${id}/settings`);
  }

  updateProjectSettings(id: string, payload: Record<string, unknown>): Observable<ProjectSettingsResponse> {
    return this.http.patch<ProjectSettingsResponse>(`${this.apiUrl}/${id}/settings`, payload);
  }

  addProjectMember(id: string, payload: Partial<ProjectMember> & { email: string }): Observable<ProjectMember> {
    return this.http.post<ProjectMember>(`${this.apiUrl}/${id}/members`, payload);
  }

  updateProjectMember(projectId: string, memberId: string, payload: Partial<ProjectMember>): Observable<ProjectMember> {
    return this.http.patch<ProjectMember>(`${this.apiUrl}/${projectId}/members/${memberId}`, payload);
  }

  removeProjectMember(projectId: string, memberId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${projectId}/members/${memberId}`);
  }

  createProjectAccessLink(projectId: string, payload: CreateProjectAccessLinkRequest): Observable<ProjectAccessLinkTokenResponse> {
    return this.http.post<ProjectAccessLinkTokenResponse>(`${this.apiUrl}/${projectId}/settings/access-links`, payload);
  }

  updateProjectAccessLink(projectId: string, linkId: string, payload: UpdateProjectAccessLinkRequest): Observable<ProjectAccessLink> {
    return this.http.patch<ProjectAccessLink>(`${this.apiUrl}/${projectId}/settings/access-links/${linkId}`, payload);
  }

  revokeProjectAccessLink(projectId: string, linkId: string): Observable<ProjectAccessLink> {
    return this.http.post<ProjectAccessLink>(`${this.apiUrl}/${projectId}/settings/access-links/${linkId}/revoke`, {});
  }

  rotateProjectAccessLink(projectId: string, linkId: string): Observable<ProjectAccessLinkTokenResponse> {
    return this.http.post<ProjectAccessLinkTokenResponse>(`${this.apiUrl}/${projectId}/settings/access-links/${linkId}/rotate`, {});
  }
}
