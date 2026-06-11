import { of } from 'rxjs';

import { DashboardComponent } from './dashboard.component';

describe('DashboardComponent', () => {
  it('loads projects and videos on init', () => {
    const authService = {
      getCurrentUser: jest.fn().mockReturnValue({ id: 'u1' }),
    };
    const projectService = {
      getProjects: jest.fn().mockReturnValue(
        of([
          { id: 'p1', title: 'P1' },
          { id: 'p2', title: 'P2' },
          { id: 'p3', title: 'P3' },
          { id: 'p4', title: 'P4' },
        ]),
      ),
    };
    const videoService = {
      getVideos: jest.fn().mockReturnValue(
        of([
          { id: 'v1', status: 'processing' },
          { id: 'v2', status: 'ready' },
          { id: 'v3', status: 'ready' },
        ]),
      ),
    };

    const dashboardApi = {
      getActivity: jest.fn().mockReturnValue(of([])),
      getFeedback: jest.fn().mockReturnValue(of([])),
      getStorage: jest.fn().mockReturnValue(of({ totalBytes: 0 })),
    };

    const component = new DashboardComponent(
      authService as never,
      projectService as never,
      videoService as never,
      dashboardApi as never,
    );

    component.ngOnInit();

    expect(component.projects).toHaveLength(4);
    expect(component.videos).toHaveLength(3);
    expect(component.recentProjects).toHaveLength(3);
    expect(component.recentVideos).toHaveLength(3);
    expect(component.processingVideos).toBe(1);
    expect(component.readyVideos).toBe(2);
  });
});
