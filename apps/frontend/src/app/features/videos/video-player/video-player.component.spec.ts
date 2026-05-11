import { VideoPlayerComponent } from './video-player.component';
import { FormBuilder } from '@angular/forms';

describe('VideoPlayerComponent', () => {
  const fb = new FormBuilder();

  const makeDeps = () => {
    const route = { snapshot: { paramMap: { get: jest.fn().mockReturnValue(null) } } };
    const videoService = {
      getEffectiveStatus: jest.fn((video: any) => video.status),
    };
    const commentService = {};
    const webSocketService = {};
    const authService = {
      isAdmin: jest.fn().mockReturnValue(false),
      getCurrentUser: jest.fn().mockReturnValue({ id: 'u1', role: 'client' }),
      getToken: jest.fn().mockReturnValue('token-123'),
    };
    const router = {
      navigate: jest.fn(),
    };
    const settingsService = {};

    return { route, videoService, commentService, webSocketService, authService, settingsService, router };
  };

  it('formats time and file size helpers', () => {
    const { route, videoService, commentService, webSocketService, authService, settingsService, router } =
      makeDeps();
    const component = new VideoPlayerComponent(
      route as never,
      videoService as never,
      commentService as never,
      webSocketService as never,
      authService as never,
      settingsService as never,
      fb,
      router as never,
    );

    expect(component.formatTime(65)).toBe('1:05');
    expect(component.formatFileSize(0)).toBe('0 Bytes');
    expect(component.formatFileSize(1024)).toBe('1 KB');
  });

  it('checks comment management permissions', () => {
    const { route, videoService, commentService, webSocketService, authService, settingsService, router } =
      makeDeps();
    const component = new VideoPlayerComponent(
      route as never,
      videoService as never,
      commentService as never,
      webSocketService as never,
      authService as never,
      settingsService as never,
      fb,
      router as never,
    );

    component.video = { project: { ownerId: 'u1' } } as never;

    expect(component.canManageComment({ authorId: 'u1' } as never)).toBe(true);
    expect(component.canResolveComment({} as never)).toBe(true);
    expect(component.canManageComment({ authorId: 'u2' } as never)).toBe(false);
  });

  it('navigates to project route', () => {
    const { route, videoService, commentService, webSocketService, authService, settingsService, router } =
      makeDeps();
    const component = new VideoPlayerComponent(
      route as never,
      videoService as never,
      commentService as never,
      webSocketService as never,
      authService as never,
      settingsService as never,
      fb,
      router as never,
    );

    component.navigateToProject('project-2');

    expect(router.navigate).toHaveBeenCalledWith(['/projects', 'project-2']);
  });
});
