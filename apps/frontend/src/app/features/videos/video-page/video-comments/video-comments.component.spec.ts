import { FormBuilder } from '@angular/forms';
import { of, Subject } from 'rxjs';

import { VideoCommentsComponent } from './video-comments.component';

describe('VideoCommentsComponent', () => {
  const makeComponent = () => {
    const commentService = {
      getCommentsByVideo: jest.fn().mockReturnValue(of([])),
      createComment: jest.fn().mockReturnValue(of({})),
      updateComment: jest.fn().mockReturnValue(of({})),
      deleteComment: jest.fn().mockReturnValue(of(undefined)),
      resolveComment: jest.fn().mockReturnValue(of({})),
    };
    const authService = { getCurrentUser: jest.fn().mockReturnValue({ id: 'u1' }) };
    const hostElement = document.createElement('section');
    const elementHighlighter = { highlightElement: jest.fn() };
    const component = new VideoCommentsComponent(commentService as never, authService as never, new FormBuilder(), { nativeElement: hostElement } as never, elementHighlighter as never);
    component.videoId = 'v1';
    component.projectId = 'p1';
    return { component, commentService, hostElement, elementHighlighter };
  };

  it('creates comments using the latest current time input', () => {
    const { component, commentService } = makeComponent();
    component.currentTime = 42;
    component.commentForm.patchValue({ text: 'Timestamped feedback' });

    component.addComment();

    expect(commentService.createComment).toHaveBeenCalledWith({
      text: 'Timestamped feedback',
      timestamp: 42,
      videoId: 'v1',
    });
  });

  it('does not create a second comment while a create is pending', () => {
    const { component, commentService } = makeComponent();
    commentService.createComment.mockReturnValue(new Subject<any>().asObservable());
    component.commentForm.patchValue({ text: 'Pending' });

    component.addComment();
    component.addComment();

    expect(commentService.createComment).toHaveBeenCalledTimes(1);
    expect(component.isCreatingComment).toBe(true);
  });

  it('creates replies using the latest current time input', () => {
    const { component, commentService } = makeComponent();
    component.currentTime = 55;
    component.replyForm.patchValue({ text: 'Reply' });

    component.submitReply('c1');

    expect(commentService.createComment).toHaveBeenCalledWith({
      text: 'Reply',
      timestamp: 55,
      videoId: 'v1',
      parentCommentId: 'c1',
    });
  });

  it('does not create a second reply for the same parent while pending', () => {
    const { component, commentService } = makeComponent();
    commentService.createComment.mockReturnValue(new Subject<any>().asObservable());
    component.replyForm.patchValue({ text: 'Pending reply' });

    component.submitReply('c1');
    component.submitReply('c1');

    expect(commentService.createComment).toHaveBeenCalledTimes(1);
    expect(component.replyingCommentIds.has('c1')).toBe(true);
  });

  it('filters only root comments in sorted comments', () => {
    const { component } = makeComponent();
    component.comments = [
      { id: 'reply', parentCommentId: 'root', timestamp: 1, resolved: false } as never,
      { id: 'root', timestamp: 5, resolved: false } as never,
    ];

    expect(component.sortedComments.map((comment) => comment.id)).toEqual(['root']);
  });

  it('deduplicates duplicate ids from loaded comments and replies', () => {
    const { component, commentService } = makeComponent();
    commentService.getCommentsByVideo.mockReturnValue(of([
      {
        id: 'root',
        timestamp: 5,
        resolved: false,
        replies: [
          { id: 'reply', timestamp: 6, resolved: false },
          { id: 'reply', timestamp: 6, resolved: false },
        ],
      },
      { id: 'root', timestamp: 5, resolved: false, replies: [] },
    ]));

    component.loadComments();

    expect(component.comments.map((comment) => comment.id)).toEqual(['root']);
    expect(component.comments[0].replies?.map((reply) => reply.id)).toEqual(['reply']);
  });

  it('retries empty comment loads before accepting an empty result', () => {
    jest.useFakeTimers();
    const { component, commentService } = makeComponent();
    const loadedComment = { id: 'loaded', timestamp: 3, resolved: false };
    commentService.getCommentsByVideo
      .mockReturnValueOnce(of([]))
      .mockReturnValueOnce(of([loadedComment]));

    component.loadComments();

    expect(component.comments).toEqual([]);
    expect(commentService.getCommentsByVideo).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(100);

    expect(commentService.getCommentsByVideo).toHaveBeenCalledTimes(2);
    expect(component.comments.map((comment) => comment.id)).toEqual([loadedComment.id]);
    jest.useRealTimers();
  });

  it('confirms empty comments after retry attempts are exhausted', () => {
    jest.useFakeTimers();
    const { component, commentService } = makeComponent();
    const totalCountSpy = jest.spyOn(component.totalCountChange, 'emit');
    commentService.getCommentsByVideo.mockReturnValue(of([]));

    component.loadComments();
    jest.advanceTimersByTime(100);
    jest.advanceTimersByTime(200);
    jest.advanceTimersByTime(400);

    expect(commentService.getCommentsByVideo).toHaveBeenCalledTimes(4);
    expect(component.comments).toEqual([]);
    expect(totalCountSpy).toHaveBeenLastCalledWith(0);
    jest.useRealTimers();
  });

  it('cancels pending load retries on destroy', () => {
    jest.useFakeTimers();
    const { component, commentService } = makeComponent();
    commentService.getCommentsByVideo.mockReturnValue(of([]));

    component.loadComments();
    component.ngOnDestroy();
    jest.advanceTimersByTime(100);

    expect(commentService.getCommentsByVideo).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });

  it('ignores late load emissions after destroy', () => {
    const { component, commentService } = makeComponent();
    const response = new Subject<any[]>();
    commentService.getCommentsByVideo.mockReturnValue(response.asObservable());

    component.loadComments();
    component.ngOnDestroy();
    response.next([{ id: 'late', timestamp: 1, resolved: false }]);

    expect(component.comments).toEqual([]);
  });

  it('lets writes finish but ignores late UI callbacks after destroy', () => {
    const { component, commentService } = makeComponent();
    const response = new Subject<any>();
    const mutatedSpy = jest.spyOn(component.commentsMutated, 'emit');
    commentService.updateComment.mockReturnValue(response.asObservable());
    component.editingCommentId = 'c1';
    component.editCommentForm.patchValue({ text: 'Updated' });

    component.saveCommentEdit({ id: 'c1', timestamp: 1, resolved: false } as never);
    component.ngOnDestroy();
    response.next({});

    expect(commentService.updateComment).toHaveBeenCalledTimes(1);
    expect(component.editingCommentId).toBe('c1');
    expect(mutatedSpy).not.toHaveBeenCalled();
  });

  it('scrolls to and highlights focused comments', () => {
    jest.useFakeTimers();
    const { component, hostElement, elementHighlighter } = makeComponent();
    const target = document.createElement('article');
    target.setAttribute('data-comment-id', 'c1');
    hostElement.appendChild(target);

    component.focusedCommentId = 'c1';
    component.ngOnChanges({ focusedCommentId: { currentValue: 'c1', previousValue: null, firstChange: false, isFirstChange: () => false } });
    jest.runOnlyPendingTimers();
    jest.runOnlyPendingTimers();

    expect(elementHighlighter.highlightElement).toHaveBeenCalledWith(target, { color: 'var(--ui-primary)' });
    jest.useRealTimers();
  });

  it('retries focus when the same comment id is selected again', () => {
    jest.useFakeTimers();
    const { component, hostElement, elementHighlighter } = makeComponent();
    const target = document.createElement('article');
    target.setAttribute('data-comment-id', 'c1');
    hostElement.appendChild(target);
    component.focusedCommentId = 'c1';

    component.focusedCommentVersion = 1;
    component.ngOnChanges({ focusedCommentVersion: { currentValue: 1, previousValue: 0, firstChange: false, isFirstChange: () => false } });
    jest.runOnlyPendingTimers();
    jest.runOnlyPendingTimers();
    component.focusedCommentVersion = 2;
    component.ngOnChanges({ focusedCommentVersion: { currentValue: 2, previousValue: 1, firstChange: false, isFirstChange: () => false } });
    jest.runOnlyPendingTimers();
    jest.runOnlyPendingTimers();

    expect(elementHighlighter.highlightElement).toHaveBeenCalledTimes(2);
    jest.useRealTimers();
  });
});
