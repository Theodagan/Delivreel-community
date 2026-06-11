import { CommonModule, KeyValuePipe } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';

import { ProjectAccessLink, ProjectMember, ProjectMemberRole, ProjectPermissions, ProjectService, ProjectSettingsResponse } from '../../../core/services/project.service';
import { VideoService } from '../../../core/services/video.service';
import { copyToClipboard } from '../../../core/utils/clipboard';

@Component({
  selector: 'app-project-settings',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, KeyValuePipe],
  templateUrl: './project-settings.html',
  styleUrls: ['./project-settings.css'],
})
export class ProjectSettings implements OnInit {
  projectId = '';
  settings: ProjectSettingsResponse | null = null;
  isLoading = false;
  isSaving = false;
  error: string | null = null;
  message: string | null = null;
  inviteForm: FormGroup;
  accessLinkForm: FormGroup;
  rawAccessLinkUrls: Record<string, string> = {};
  editingPermissions: Record<string, string[]> = {};
  createPermissionsOpen = false;
  editingAccessLink: ProjectAccessLink | null = null;

  readonly roles: ProjectMemberRole[] = ['team_lead', 'collaborator', 'client', 'viewer'];
  readonly permissionKeys: Array<keyof ProjectPermissions> = [
    'canView',
    'canComment',
    'canResolveComments',
    'canUploadVideos',
    'canDownloadVideos',
    'canApproveVideos',
    'canSignOffVideos',
    'canInviteMembers',
    'canManageSettings',
  ];
  readonly accessLinkPermissionKeys: Array<keyof ProjectPermissions> = [
    'canView',
    'canComment',
    'canResolveComments',
    'canUploadVideos',
    'canDownloadVideos',
    'canApproveVideos',
    'canSignOffVideos',
  ];

  constructor(
    private route: ActivatedRoute,
    private projectService: ProjectService,
    private videoService: VideoService,
    private fb: FormBuilder,
  ) {
    this.inviteForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      displayName: [''],
      role: ['client', [Validators.required]],
    });
    this.accessLinkForm = this.fb.group({
      label: ['', [Validators.required]],
      videoId: [''],
      expiresAt: [''],
      selectedPermissions: [['canView']],
    });
  }

  ngOnInit() {
    this.projectId = this.route.snapshot.paramMap.get('id') ?? '';
    if (this.projectId) {
      this.loadSettings();
    }
  }

  loadSettings() {
    this.isLoading = true;
    this.error = null;
    this.projectService.getProjectSettings(this.projectId).subscribe({
      next: (settings) => {
        this.settings = settings;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Failed to load project settings:', error);
        this.error = error?.error?.message || 'Project settings unavailable.';
        this.isLoading = false;
      }
    });
  }

  addMember() {
    if (this.inviteForm.invalid || !this.settings?.capabilities.canInviteMembers) {
      return;
    }
    const payload = this.inviteForm.value;
    this.projectService.addProjectMember(this.projectId, payload).subscribe({
      next: () => {
        this.inviteForm.reset({ role: 'client' });
        this.message = 'Member invited.';
        this.loadSettings();
      },
      error: (error) => {
        console.error('Failed to invite member:', error);
        this.error = error?.error?.message || 'Member could not be invited.';
      }
    });
  }

  createAccessLink() {
    if (this.accessLinkForm.invalid || !this.settings?.capabilities.canManageSettings) {
      return;
    }
    const value = this.accessLinkForm.value;
    const selectedPermissions = value.selectedPermissions as string[];
    const permissions: Record<string, boolean> = {};
    for (const key of this.accessLinkPermissionKeys) {
      permissions[key] = selectedPermissions.includes(key);
    }
    this.projectService.createProjectAccessLink(this.projectId, {
      ...permissions,
      label: value.label,
      videoId: value.videoId || null,
      expiresAt: value.expiresAt || null,
    } as never).subscribe({
      next: (response) => {
        const url = this.buildShareUrl(response.token);
        this.rawAccessLinkUrls[response.accessLink.id] = url;
        this.message = 'Magic link created. Copy it now; the token will not be shown again.';
        this.accessLinkForm.reset({ selectedPermissions: ['canView'] });
        this.createPermissionsOpen = false;
        this.loadSettings();
      },
      error: (error) => {
        console.error('Failed to create access link:', error);
        this.error = error?.error?.message || 'Access link could not be created.';
      }
    });
  }

  startEditLinkPermissions(link: ProjectAccessLink) {
    this.editingPermissions[link.id] = this.accessLinkPermissionKeys.filter(k => link[k]);
    this.editingAccessLink = link;
  }

  cancelEditLinkPermissions(linkId: string) {
    delete this.editingPermissions[linkId];
    if (this.editingAccessLink?.id === linkId) {
      this.editingAccessLink = null;
    }
  }

  closeEditPermissionsModal() {
    if (!this.editingAccessLink) {
      return;
    }
    this.cancelEditLinkPermissions(this.editingAccessLink.id);
  }

  toggleCreatePermissions() {
    if (!this.settings?.capabilities.canManageSettings) {
      return;
    }
    this.createPermissionsOpen = !this.createPermissionsOpen;
  }

  isCreatePermissionSelected(key: keyof ProjectPermissions): boolean {
    return this.selectedCreatePermissions().includes(key);
  }

  toggleCreatePermission(key: keyof ProjectPermissions) {
    const selected = this.selectedCreatePermissions();
    const next = selected.includes(key)
      ? selected.filter(permission => permission !== key)
      : [...selected, key];
    this.accessLinkForm.patchValue({ selectedPermissions: next });
  }

  isEditingPermissionSelected(linkId: string, key: keyof ProjectPermissions): boolean {
    return (this.editingPermissions[linkId] ?? []).includes(key);
  }

  toggleEditingPermission(linkId: string, key: keyof ProjectPermissions) {
    const selected = this.editingPermissions[linkId] ?? [];
    this.editingPermissions[linkId] = selected.includes(key)
      ? selected.filter(permission => permission !== key)
      : [...selected, key];
  }

  saveLinkPermissions(link: ProjectAccessLink) {
    const selected = this.editingPermissions[link.id] ?? [];
    const payload: Record<string, boolean> = {};
    for (const key of this.accessLinkPermissionKeys) {
      payload[key] = selected.includes(key);
    }
    this.projectService.updateProjectAccessLink(this.projectId, link.id, payload as never).subscribe({
      next: () => {
        delete this.editingPermissions[link.id];
        if (this.editingAccessLink?.id === link.id) {
          this.editingAccessLink = null;
        }
        this.loadSettings();
      },
      error: (error) => this.error = error?.error?.message || 'Access link could not be updated.',
    });
  }

  copyLink(linkId: string): boolean {
    const url = this.rawAccessLinkUrls[linkId];
    if (!url) {
      return false;
    }
    copyToClipboard(url);
    this.message = 'Share link copied to clipboard.';
    return true;
  }

  canCopyLink(linkId: string): boolean {
    return Boolean(this.rawAccessLinkUrls[linkId]);
  }

  copyGlobalLink() {
    const keys = Object.keys(this.rawAccessLinkUrls);
    if (keys.length === 0) {
      return;
    }
    const url = this.rawAccessLinkUrls[keys[keys.length - 1]];
    copyToClipboard(url);
    this.message = 'Share link copied to clipboard.';
  }

  revokeAccessLink(link: ProjectAccessLink) {
    this.projectService.revokeProjectAccessLink(this.projectId, link.id).subscribe({
      next: () => {
        this.message = 'Magic link revoked.';
        this.loadSettings();
      },
      error: (error) => this.error = error?.error?.message || 'Access link could not be revoked.',
    });
  }

  rotateAccessLink(link: ProjectAccessLink) {
    this.projectService.rotateProjectAccessLink(this.projectId, link.id).subscribe({
      next: (response) => {
        const url = this.buildShareUrl(response.token);
        this.rawAccessLinkUrls[response.accessLink.id] = url;
        this.message = 'Magic link rotated. Copy the new link now.';
        this.loadSettings();
      },
      error: (error) => this.error = error?.error?.message || 'Access link could not be rotated.',
    });
  }

  updateMemberPermission(member: ProjectMember, key: keyof ProjectPermissions, event: Event) {
    const input = event.target as HTMLInputElement;
    this.updateMember(member, { [key]: input.checked });
  }

  updateMemberRole(member: ProjectMember, event: Event) {
    const select = event.target as HTMLSelectElement;
    this.updateMember(member, { role: select.value as ProjectMemberRole });
  }

  updateMemberStatus(member: ProjectMember, event: Event) {
    const select = event.target as HTMLSelectElement;
    this.updateMember(member, { status: select.value as ProjectMember['status'] });
  }

  removeMember(member: ProjectMember) {
    this.projectService.removeProjectMember(this.projectId, member.id).subscribe({
      next: () => {
        this.message = 'Member removed.';
        this.loadSettings();
      },
      error: (error) => {
        console.error('Failed to remove member:', error);
        this.error = error?.error?.message || 'Member could not be removed.';
      }
    });
  }

  toggleVideoDownload(videoId: string, event: Event) {
    const input = event.target as HTMLInputElement;
    this.videoService.updateVideoSettings(videoId, { downloadEnabled: input.checked }).subscribe({
      next: () => {
        this.message = 'Video download visibility updated.';
        this.loadSettings();
      },
      error: (error) => {
        console.error('Failed to update video download setting:', error);
        this.error = error?.error?.message || 'Video setting could not be saved.';
      }
    });
  }

  permissionLabel(key: string): string {
    return key.replace(/^can/, '').replace(/([A-Z])/g, ' $1').trim();
  }

  activePermissions(link: ProjectAccessLink): string[] {
    return (this.accessLinkPermissionKeys as string[]).filter(k => link[k as keyof ProjectPermissions]);
  }

  selectedPermissionSummary(selected: string[]): string {
    if (!selected.length) {
      return 'No permissions selected';
    }
    if (selected.length <= 2) {
      return selected.map(key => this.permissionLabel(key)).join(', ');
    }
    return `${selected.length} permissions selected`;
  }

  getLinkLabel(linkId: string): string {
    return this.settings?.accessLinks?.find(l => l.id === linkId)?.label ?? linkId;
  }

  private buildShareUrl(token: string): string {
    return `${window.location.origin}/share/${encodeURIComponent(token)}`;
  }

  private selectedCreatePermissions(): string[] {
    return this.accessLinkForm.get('selectedPermissions')?.value ?? [];
  }

  private updateMember(member: ProjectMember, payload: Partial<ProjectMember>) {
    if (!this.settings?.capabilities.canManageSettings) {
      return;
    }
    this.projectService.updateProjectMember(this.projectId, member.id, payload).subscribe({
      next: () => this.loadSettings(),
      error: (error) => {
        console.error('Failed to update member:', error);
        this.error = error?.error?.message || 'Member could not be updated.';
      }
    });
  }
}
