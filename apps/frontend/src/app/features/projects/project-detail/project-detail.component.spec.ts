import { FormBuilder } from '@angular/forms';
import { of } from 'rxjs';

import { ProjectDetailComponent } from './project-detail.component';

describe('ProjectDetailComponent', () => {
  const fb = new FormBuilder();

  const makeDeps = () => {
    const route = {
      snapshot: {
        paramMap: {
          get: jest.fn().mockReturnValue('project-1'),
        },
      },
    };
    const projectService = {
      getProjectSettings: jest.fn().mockReturnValue(of({
        project: { id: 'project-1', ownerId: 1, title: 'Project A', videos: [] },
        capabilities: { canUploadVideos: true },
      })),
    };
    const videoService = {
      uploadVideo: jest.fn().mockReturnValue(of({ provider: 'local' })),
      getVideoStatus: jest.fn().mockReturnValue(of({ id: 'video-1', status: 'ready', updatedAt: 'now' })),
    };
    const authService = {
      getCurrentUser: jest.fn().mockReturnValue({ id: 1, role: 'user' }),
    };
    const uploadGate = {
      requestUploadAccess: jest.fn().mockResolvedValue(true),
    };
    return { route, projectService, videoService, authService, uploadGate };
  };

  it('loads project on init from route id', () => {
    const { route, projectService, videoService, authService, uploadGate } = makeDeps();
    const component = new ProjectDetailComponent(
      route as never,
      projectService as never,
      videoService as never,
      authService as never,
      uploadGate as never,
      fb,
    );

    component.ngOnInit();

    expect(projectService.getProjectSettings).toHaveBeenCalledWith('project-1');
    expect(component.project?.id).toBe('project-1');
    expect(component.project?.capabilities?.canUploadVideos).toBe(true);
  });

  it('polls processing videos after loading a project', () => {
    const { route, projectService, videoService, authService, uploadGate } = makeDeps();
    projectService.getProjectSettings.mockReturnValue(of({
      project: {
        id: 'project-1',
        ownerId: 1,
        title: 'Project A',
        videos: [{ id: 'video-1', status: 'processing', updatedAt: 'before' }],
      },
      capabilities: { canUploadVideos: true },
    }));
    const component = new ProjectDetailComponent(
      route as never,
      projectService as never,
      videoService as never,
      authService as never,
      uploadGate as never,
      fb,
    );

    component.ngOnInit();

    expect(videoService.getVideoStatus).toHaveBeenCalledWith('video-1');
    expect(component.project?.videos[0].status).toBe('ready');
    expect(component.project?.videos[0].updatedAt).toBe('now');
    component.ngOnDestroy();
  });

  it('allows upload when project capabilities allow it', () => {
    const { route, projectService, videoService, authService, uploadGate } = makeDeps();
    const component = new ProjectDetailComponent(
      route as never,
      projectService as never,
      videoService as never,
      authService as never,
      uploadGate as never,
      fb,
    );
    component.project = { id: 'project-1', ownerId: 1, capabilities: { canUploadVideos: true } } as never;

    expect(component.canUploadVideo()).toBe(true);
  });

  it('allows super admins to upload when project capabilities deny it', () => {
    const { route, projectService, videoService, authService, uploadGate } = makeDeps();
    authService.getCurrentUser.mockReturnValue({ id: 2, role: 'super_admin' });
    const component = new ProjectDetailComponent(
      route as never,
      projectService as never,
      videoService as never,
      authService as never,
      uploadGate as never,
      fb,
    );
    component.project = { id: 'project-1', ownerId: 1, capabilities: { canUploadVideos: false } } as never;

    expect(component.canUploadVideo()).toBe(true);
  });

  it('denies upload for normal users when project capabilities deny it', () => {
    const { route, projectService, videoService, authService, uploadGate } = makeDeps();
    const component = new ProjectDetailComponent(
      route as never,
      projectService as never,
      videoService as never,
      authService as never,
      uploadGate as never,
      fb,
    );
    component.project = { id: 'project-1', ownerId: 1, capabilities: { canUploadVideos: false } } as never;

    expect(component.canUploadVideo()).toBe(false);
  });

  it('submits upload with selected file and form data', async () => {
    const { route, projectService, videoService, authService, uploadGate } = makeDeps();
    const component = new ProjectDetailComponent(
      route as never,
      projectService as never,
      videoService as never,
      authService as never,
      uploadGate as never,
      fb,
    );
    component.project = { id: 'project-1', ownerId: 1, capabilities: { canUploadVideos: true } } as never;
    component.selectedFile = new File(['video'], 'demo.mp4', { type: 'video/mp4' });
    component.uploadForm.setValue({
      title: 'New upload',
      description: 'A new version',
    });

    await component.onUpload();

    expect(uploadGate.requestUploadAccess).not.toHaveBeenCalled();
    expect(videoService.uploadVideo).toHaveBeenCalledTimes(1);
    const sentForm = videoService.uploadVideo.mock.calls[0][0] as FormData;
    expect(sentForm.get('title')).toBe('New upload');
    expect(sentForm.get('description')).toBe('A new version');
    expect(sentForm.get('projectId')).toBe('project-1');
  });

  it('opens upload modal after upload gate allows access', async () => {
    const { route, projectService, videoService, authService, uploadGate } = makeDeps();
    const component = new ProjectDetailComponent(
      route as never,
      projectService as never,
      videoService as never,
      authService as never,
      uploadGate as never,
      fb,
    );
    component.project = { id: 'project-1', ownerId: 1, capabilities: { canUploadVideos: true } } as never;

    await component.openUploadPanel();

    expect(uploadGate.requestUploadAccess).toHaveBeenCalledWith('project-1');
    expect(component.showUploadModal).toBe(true);
  });

  it('opens upload modal for super admins without requesting payment gate access', async () => {
    const { route, projectService, videoService, authService, uploadGate } = makeDeps();
    authService.getCurrentUser.mockReturnValue({ id: 2, role: 'super_admin' });
    const component = new ProjectDetailComponent(
      route as never,
      projectService as never,
      videoService as never,
      authService as never,
      uploadGate as never,
      fb,
    );
    component.project = { id: 'project-1', ownerId: 1, capabilities: { canUploadVideos: false } } as never;

    await component.openUploadPanel();

    expect(uploadGate.requestUploadAccess).not.toHaveBeenCalled();
    expect(component.showUploadModal).toBe(true);
  });

  it('keeps upload modal closed when upload gate denies access', async () => {
    const { route, projectService, videoService, authService, uploadGate } = makeDeps();
    uploadGate.requestUploadAccess.mockResolvedValue(false);
    const component = new ProjectDetailComponent(
      route as never,
      projectService as never,
      videoService as never,
      authService as never,
      uploadGate as never,
      fb,
    );
    component.project = { id: 'project-1', ownerId: 'owner-1' } as never;

    await component.openUploadPanel();

    expect(uploadGate.requestUploadAccess).toHaveBeenCalledWith('project-1');
    expect(component.showUploadModal).toBe(false);
  });
});
