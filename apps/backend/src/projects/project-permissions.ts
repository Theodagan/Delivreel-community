import { ProjectMemberRole } from './entities/project-member.entity.js';

export type ProjectPermissionKey =
  | 'canView'
  | 'canComment'
  | 'canResolveComments'
  | 'canUploadVideos'
  | 'canDownloadVideos'
  | 'canApproveVideos'
  | 'canSignOffVideos'
  | 'canInviteMembers'
  | 'canManageSettings';

export type ProjectPermissions = Record<ProjectPermissionKey, boolean>;

export const FULL_PROJECT_PERMISSIONS: ProjectPermissions = {
  canView: true,
  canComment: true,
  canResolveComments: true,
  canUploadVideos: true,
  canDownloadVideos: true,
  canApproveVideos: true,
  canSignOffVideos: true,
  canInviteMembers: true,
  canManageSettings: true,
};

export const VIEW_ONLY_PROJECT_PERMISSIONS: ProjectPermissions = {
  canView: true,
  canComment: false,
  canResolveComments: false,
  canUploadVideos: false,
  canDownloadVideos: false,
  canApproveVideos: false,
  canSignOffVideos: false,
  canInviteMembers: false,
  canManageSettings: false,
};

export function defaultPermissionsForRole(role: ProjectMemberRole): ProjectPermissions {
  if (role === 'owner' || role === 'team_lead') {
    return FULL_PROJECT_PERMISSIONS;
  }
  if (role === 'collaborator') {
    return {
      canView: true,
      canComment: true,
      canResolveComments: true,
      canUploadVideos: true,
      canDownloadVideos: true,
      canApproveVideos: true,
      canSignOffVideos: false,
      canInviteMembers: false,
      canManageSettings: false,
    };
  }
  if (role === 'client') {
    return {
      canView: true,
      canComment: true,
      canResolveComments: false,
      canUploadVideos: false,
      canDownloadVideos: false,
      canApproveVideos: false,
      canSignOffVideos: false,
      canInviteMembers: false,
      canManageSettings: false,
    };
  }
  return VIEW_ONLY_PROJECT_PERMISSIONS;
}

export function pickPermissions(input: Partial<ProjectPermissions> | undefined, fallback: ProjectPermissions): ProjectPermissions {
  return {
    canView: input?.canView ?? fallback.canView,
    canComment: input?.canComment ?? fallback.canComment,
    canResolveComments: input?.canResolveComments ?? fallback.canResolveComments,
    canUploadVideos: input?.canUploadVideos ?? fallback.canUploadVideos,
    canDownloadVideos: input?.canDownloadVideos ?? fallback.canDownloadVideos,
    canApproveVideos: input?.canApproveVideos ?? fallback.canApproveVideos,
    canSignOffVideos: input?.canSignOffVideos ?? fallback.canSignOffVideos,
    canInviteMembers: input?.canInviteMembers ?? fallback.canInviteMembers,
    canManageSettings: input?.canManageSettings ?? fallback.canManageSettings,
  };
}
