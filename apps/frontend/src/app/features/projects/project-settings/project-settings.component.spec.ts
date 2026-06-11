import { FormBuilder } from '@angular/forms';
import { of, throwError } from 'rxjs';

import { ProjectSettings } from './project-settings.component';

describe('ProjectSettings access links', () => {
  const route = { snapshot: { paramMap: { get: () => 'project-1' } } };
  const videoService = { updateVideoSettings: jest.fn() };
  const fb = new FormBuilder();

  it('creates access links and exposes the raw share URL once', () => {
    const projectService = {
      createProjectAccessLink: jest.fn().mockReturnValue(of({ token: 'dl_token', accessLink: { id: 'link-1' } })),
      getProjectSettings: jest.fn(),
    };
    const component = new ProjectSettings(route as never, projectService as never, videoService as never, fb);
    component.projectId = 'project-1';
    component.settings = { capabilities: { canManageSettings: true } } as never;
    component.accessLinkForm.setValue({
      label: 'Client Review',
      videoId: '',
      expiresAt: '',
      selectedPermissions: ['canView', 'canComment'],
    });

    component.createAccessLink();

    expect(projectService.createProjectAccessLink).toHaveBeenCalledWith('project-1', expect.objectContaining({
      label: 'Client Review',
      videoId: null,
      canComment: true,
    }));
    expect(component.rawAccessLinkUrls['link-1']).toContain('/share/dl_token');
    expect(component.createPermissionsOpen).toBe(false);
  });

  it('toggles create-form access link permissions explicitly', () => {
    const projectService = { getProjectSettings: jest.fn() };
    const component = new ProjectSettings(route as never, projectService as never, videoService as never, fb);

    expect(component.isCreatePermissionSelected('canView')).toBe(true);

    component.toggleCreatePermission('canComment');
    component.toggleCreatePermission('canView');

    expect(component.accessLinkForm.get('selectedPermissions')?.value).toEqual(['canComment']);
    expect(component.selectedPermissionSummary(['canComment'])).toBe('Comment');
  });

  it('opens a permission edit modal and toggles existing access link permissions', () => {
    const projectService = { getProjectSettings: jest.fn() };
    const component = new ProjectSettings(route as never, projectService as never, videoService as never, fb);
    const link = { id: 'link-1', label: 'Client', canView: true, canComment: false };

    component.startEditLinkPermissions(link as never);
    component.toggleEditingPermission('link-1', 'canComment');
    component.toggleEditingPermission('link-1', 'canView');

    expect(component.editingAccessLink).toBe(link);
    expect(component.editingPermissions['link-1']).toEqual(['canComment']);
    expect(component.isEditingPermissionSelected('link-1', 'canComment')).toBe(true);
  });

  it('saves modal permission edits and closes the modal', () => {
    const projectService = {
      updateProjectAccessLink: jest.fn().mockReturnValue(of({})),
      getProjectSettings: jest.fn(),
    };
    const component = new ProjectSettings(route as never, projectService as never, videoService as never, fb);
    component.projectId = 'project-1';
    const link = { id: 'link-1', label: 'Client', canView: true, canComment: false };

    component.startEditLinkPermissions(link as never);
    component.toggleEditingPermission('link-1', 'canComment');
    component.saveLinkPermissions(link as never);

    expect(projectService.updateProjectAccessLink).toHaveBeenCalledWith('project-1', 'link-1', expect.objectContaining({
      canView: true,
      canComment: true,
    }));
    expect(component.editingAccessLink).toBeNull();
    expect(component.editingPermissions['link-1']).toBeUndefined();
  });

  it('only copies access links when the raw URL is available', () => {
    const projectService = { getProjectSettings: jest.fn() };
    const component = new ProjectSettings(route as never, projectService as never, videoService as never, fb);

    expect(component.canCopyLink('link-1')).toBe(false);
    expect(component.copyLink('link-1')).toBe(false);

    component.rawAccessLinkUrls['link-1'] = 'http://localhost/share/dl_token';

    expect(component.canCopyLink('link-1')).toBe(true);
    expect(component.copyLink('link-1')).toBe(true);
  });

  it('surfaces access link creation errors', () => {
    const projectService = {
      createProjectAccessLink: jest.fn().mockReturnValue(throwError(() => ({ error: { message: 'Access denied' } }))),
      getProjectSettings: jest.fn(),
    };
    const component = new ProjectSettings(route as never, projectService as never, videoService as never, fb);
    component.projectId = 'project-1';
    component.settings = { capabilities: { canManageSettings: true } } as never;
    component.accessLinkForm.patchValue({ label: 'Client Review', selectedPermissions: ['canView'] });

    component.createAccessLink();

    expect(component.error).toBe('Access denied');
  });
});
