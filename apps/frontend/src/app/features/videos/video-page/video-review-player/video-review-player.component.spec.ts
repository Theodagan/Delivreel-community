import { of } from 'rxjs';

import { VideoReviewPlayerComponent } from './video-review-player.component';

describe('VideoReviewPlayerComponent', () => {
  const makeComponent = () => {
    const commentService = { getCommentsByVideo: jest.fn().mockReturnValue(of([])) };
    const authService = { getToken: jest.fn().mockReturnValue('token') };
    const component = new VideoReviewPlayerComponent(commentService as never, authService as never);
    component.videoId = 'v1';
    component.projectId = 'p1';
    return { component, commentService };
  };

  it('builds timeline markers from root comments and replies', () => {
    const { component } = makeComponent();
    component.comments = [
      {
        id: 'parent-1',
        text: 'Parent',
        timestamp: 5,
        resolved: false,
        replies: [{ id: 'reply-1', text: 'Reply', parentCommentId: 'parent-1', timestamp: 7, resolved: false }],
      },
      { id: 'reply-1', text: 'Duplicate reply', parentCommentId: 'parent-1', timestamp: 7, resolved: false },
    ] as never;

    expect(component.timelineComments.map((comment) => comment.id)).toEqual(['parent-1', 'reply-1']);
  });

  it('can hide reply comments from timeline markers', () => {
    const { component } = makeComponent();
    component.comments = [
      {
        id: 'parent-1',
        text: 'Parent',
        timestamp: 5,
        resolved: false,
        replies: [{ id: 'reply-1', parentCommentId: 'parent-1', timestamp: 7, resolved: false }],
      },
    ] as never;

    component.showReplyMarkers = false;

    expect(component.timelineComments.map((comment) => comment.id)).toEqual(['parent-1']);
  });

  it('clamps marker position to the timeline bounds', () => {
    const { component } = makeComponent();
    component.videoDuration = 100;

    expect(component.markerPosition({ timestamp: -1 } as never)).toBe(0);
    expect(component.markerPosition({ timestamp: 150 } as never)).toBe(100);
  });

  it('emits selected marker comments after seeking', () => {
    const { component } = makeComponent();
    const comment = { id: 'c1', timestamp: 12, text: 'Look here' } as never;
    const playbackHost = { setCurrentTime: jest.fn() };
    component.playbackHost = playbackHost as never;
    const emitSpy = jest.spyOn(component.commentMarkerSelected, 'emit');

    component.seekToComment(comment);

    expect(playbackHost.setCurrentTime).toHaveBeenCalledWith(12);
    expect(emitSpy).toHaveBeenCalledWith(comment);
  });

  it('formats marker labels for accessible tooltips', () => {
    const { component } = makeComponent();

    expect(component.markerLabel({ timestamp: 65, text: 'Check cut' } as never)).toBe('1:05 Check cut');
  });
});
