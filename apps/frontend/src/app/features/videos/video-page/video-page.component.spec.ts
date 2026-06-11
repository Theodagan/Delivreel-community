import { FormBuilder } from '@angular/forms';
import { of } from 'rxjs';

import { VideoPageComponent } from './video-page.component';

describe('VideoPageComponent', () => {
  const makeDeps = () => {
    const route = { snapshot: { paramMap: { get: jest.fn().mockReturnValue(null) } } };
    const videoService = {
      getEffectiveStatus: jest.fn((video: any) => video.status),
      approveVideo: jest.fn().mockReturnValue(of({ id: 'v1', approvedAt: '2026-06-07T00:00:00.000Z' })),
      signOffVideo: jest.fn().mockReturnValue(of({ id: 'v1', signedOffAt: '2026-06-07T00:00:00.000Z' })),
      revokeApproval: jest.fn().mockReturnValue(of({ id: 'v1', approvedAt: null, approvedBy: null })),
      revokeSignOff: jest.fn().mockReturnValue(of({ id: 'v1', signedOffAt: null, signedOffBy: null })),
    };
    const authService = { getToken: jest.fn(), getCurrentUser: jest.fn() };
    const settingsService = { getPreferences: jest.fn().mockReturnValue(of({})) };
    const router = { navigate: jest.fn() };
    return { route, videoService, authService, settingsService, router };
  };

  it('formats file sizes', () => {
    const deps = makeDeps();
    const component = new VideoPageComponent(deps.route as never, deps.videoService as never, deps.authService as never, deps.settingsService as never, new FormBuilder(), deps.router as never, { nativeElement: document.createElement('div') } as never);

    expect(component.formatFileSize(0)).toBe('0 Bytes');
    expect(component.formatFileSize(1024)).toBe('1 KB');
  });

  it('toggles the comments sidebar container', () => {
    const deps = makeDeps();
    const component = new VideoPageComponent(deps.route as never, deps.videoService as never, deps.authService as never, deps.settingsService as never, new FormBuilder(), deps.router as never, { nativeElement: document.createElement('div') } as never);

    component.toggleComments();
    expect(component.commentsOpen()).toBe(true);
    component.closeComments();
    expect(component.commentsOpen()).toBe(false);
  });

  it('selects the comments tab instead of opening sidebar in compact mode', () => {
    const deps = makeDeps();
    const component = new VideoPageComponent(deps.route as never, deps.videoService as never, deps.authService as never, deps.settingsService as never, new FormBuilder(), deps.router as never, { nativeElement: document.createElement('div') } as never);
    component.containerWidth.set(900);

    component.toggleComments();

    expect(component.activeTab()).toBe('comments');
    expect(component.commentsOpen()).toBe(false);
  });

  it('closes the sidebar when selecting the comments tab', () => {
    const deps = makeDeps();
    const component = new VideoPageComponent(deps.route as never, deps.videoService as never, deps.authService as never, deps.settingsService as never, new FormBuilder(), deps.router as never, { nativeElement: document.createElement('div') } as never);
    component.commentsOpen.set(true);

    component.setActiveTab('comments');

    expect(component.commentsOpen()).toBe(false);
    expect(component.activeTab()).toBe('comments');
  });

  it('increments marker refresh after comments mutate', () => {
    const deps = makeDeps();
    const component = new VideoPageComponent(deps.route as never, deps.videoService as never, deps.authService as never, deps.settingsService as never, new FormBuilder(), deps.router as never, { nativeElement: document.createElement('div') } as never);

    component.onCommentsMutated();

    expect(component.markerRefresh()).toBe(1);
  });

  it('opens the sidebar and stores focused comment without activating the comments tab in wide mode', () => {
    const deps = makeDeps();
    const component = new VideoPageComponent(deps.route as never, deps.videoService as never, deps.authService as never, deps.settingsService as never, new FormBuilder(), deps.router as never, { nativeElement: document.createElement('div') } as never);

    component.focusComment({ id: 'c1' } as never);

    expect(component.focusedCommentId()).toBe('c1');
    expect(component.focusedCommentVersion()).toBe(1);
    expect(component.commentsOpen()).toBe(true);
    // The comments tab must stay inactive in wide mode so only the sidebar
    // comments component renders (never both surfaces at once).
    expect(component.activeTab()).not.toBe('comments');
    expect(component.activeTab()).toBe('chat');
  });

  it('selects comments tab and stores focused comment in compact mode', () => {
    jest.useFakeTimers();
    const originalRaf = window.requestAnimationFrame;
    window.requestAnimationFrame = ((callback: FrameRequestCallback) => {
      setTimeout(() => callback(0), 0);
      return 1;
    }) as never;
    const deps = makeDeps();
    const component = new VideoPageComponent(deps.route as never, deps.videoService as never, deps.authService as never, deps.settingsService as never, new FormBuilder(), deps.router as never, { nativeElement: document.createElement('div') } as never);
    component.containerWidth.set(900);
    component.commentsOpen.set(true);

    component.focusComment({ id: 'c1' } as never);

    expect(component.focusedCommentId()).toBe(null);
    expect(component.focusedCommentVersion()).toBe(0);
    expect(component.commentsOpen()).toBe(false);
    expect(component.activeTab()).toBe('comments');

    jest.runOnlyPendingTimers();

    expect(component.focusedCommentId()).toBe('c1');
    expect(component.focusedCommentVersion()).toBe(1);
    expect(component.commentsOpen()).toBe(false);
    expect(component.activeTab()).toBe('comments');
    window.requestAnimationFrame = originalRaf;
    jest.useRealTimers();
  });

  it('syncs comment surface when container width changes', () => {
    const deps = makeDeps();
    const component = new VideoPageComponent(deps.route as never, deps.videoService as never, deps.authService as never, deps.settingsService as never, new FormBuilder(), deps.router as never, { nativeElement: document.createElement('div') } as never);
    component.commentsOpen.set(true);

    component.onContainerResize(900);

    expect(component.isCompactCommentsLayout()).toBe(true);
    expect(component.commentsOpen()).toBe(false);
    expect(component.activeTab()).toBe('comments');

    component.onContainerResize(901);

    expect(component.isCompactCommentsLayout()).toBe(false);
    // Wide layout has no Comments tab trigger, so the comments view moves back
    // into the sidebar instead of leaving an orphaned tab panel.
    expect(component.activeTab()).toBe('chat');
    expect(component.commentsOpen()).toBe(true);
  });

  it('navigates to the project route', () => {
    const deps = makeDeps();
    const component = new VideoPageComponent(deps.route as never, deps.videoService as never, deps.authService as never, deps.settingsService as never, new FormBuilder(), deps.router as never, { nativeElement: document.createElement('div') } as never);

    component.navigateToProject('p2');

    expect(deps.router.navigate).toHaveBeenCalledWith(['/projects', 'p2']);
  });
});
