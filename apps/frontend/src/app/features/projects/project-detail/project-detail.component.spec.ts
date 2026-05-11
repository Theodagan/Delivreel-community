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
      getProject: jest.fn().mockReturnValue(
        of({ id: 'project-1', ownerId: 'owner-1', title: 'Project A' }),
      ),
    };
    const videoService = {
      uploadVideo: jest.fn().mockReturnValue(of({ provider: 'local' })),
    };
    const authService = {
      isAdmin: jest.fn().mockReturnValue(false),
      getCurrentUser: jest.fn().mockReturnValue({ id: 'owner-1' }),
    };
    return { route, projectService, videoService, authService };
  };

  it('loads project on init from route id', () => {
    const { route, projectService, videoService, authService } = makeDeps();
    const component = new ProjectDetailComponent(
      route as never,
      projectService as never,
      videoService as never,
      authService as never,
      fb,
    );

    component.ngOnInit();

    expect(projectService.getProject).toHaveBeenCalledWith('project-1');
    expect(component.project?.id).toBe('project-1');
  });

  it('allows project owner to upload', () => {
    const { route, projectService, videoService, authService } = makeDeps();
    const component = new ProjectDetailComponent(
      route as never,
      projectService as never,
      videoService as never,
      authService as never,
      fb,
    );
    component.project = { id: 'project-1', ownerId: 'owner-1' } as never;

    expect(component.canUploadVideo()).toBe(true);
  });

  it('submits upload with selected file and form data', () => {
    const { route, projectService, videoService, authService } = makeDeps();
    const component = new ProjectDetailComponent(
      route as never,
      projectService as never,
      videoService as never,
      authService as never,
      fb,
    );
    component.project = { id: 'project-1', ownerId: 'owner-1' } as never;
    component.selectedFile = new File(['video'], 'demo.mp4', { type: 'video/mp4' });
    component.uploadForm.setValue({
      title: 'New upload',
      description: 'A new version',
    });

    component.onUpload();

    expect(videoService.uploadVideo).toHaveBeenCalledTimes(1);
    const sentForm = videoService.uploadVideo.mock.calls[0][0] as FormData;
    expect(sentForm.get('title')).toBe('New upload');
    expect(sentForm.get('description')).toBe('A new version');
    expect(sentForm.get('projectId')).toBe('project-1');
  });
});
