import { of, firstValueFrom, Subject } from 'rxjs';

import { CommentService } from './comment.service';

describe('CommentService', () => {
  const makeHttp = () => ({
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  });

  it('fetches comments by video', async () => {
    const http = makeHttp();
    const service = new CommentService(http as never);
    http.get.mockReturnValue(of([]));

    await firstValueFrom(service.getCommentsByVideo('video-1'));

    expect(http.get).toHaveBeenCalledWith('/api/comments?videoId=video-1');
  });

  it('creates a comment', async () => {
    const http = makeHttp();
    const service = new CommentService(http as never);
    const payload = { text: 'Looks good', timestamp: 3, videoId: 'video-1' };
    http.post.mockReturnValue(of({ id: 'c1' }));

    await firstValueFrom(service.createComment(payload));

    expect(http.post).toHaveBeenCalledWith('/api/comments', payload);
  });

  it('coalesces identical pending comment creates into one request', async () => {
    const http = makeHttp();
    const service = new CommentService(http as never);
    const response = new Subject<any>();
    const payload = { text: 'Looks good', timestamp: 3, videoId: 'video-1' };
    http.post.mockReturnValue(response.asObservable());

    const first = firstValueFrom(service.createComment(payload));
    const second = firstValueFrom(service.createComment({ ...payload }));
    response.next({ id: 'c1' });
    response.complete();

    await expect(Promise.all([first, second])).resolves.toEqual([{ id: 'c1' }, { id: 'c1' }]);
    expect(http.post).toHaveBeenCalledTimes(1);
  });

  it('does not coalesce different comment create payloads', async () => {
    const http = makeHttp();
    const service = new CommentService(http as never);
    http.post.mockReturnValue(of({ id: 'c1' }));

    await firstValueFrom(service.createComment({ text: 'One', timestamp: 3, videoId: 'video-1' }));
    await firstValueFrom(service.createComment({ text: 'Two', timestamp: 3, videoId: 'video-1' }));

    expect(http.post).toHaveBeenCalledTimes(2);
  });

  it('allows a later identical create after the pending request completes', async () => {
    const http = makeHttp();
    const service = new CommentService(http as never);
    const payload = { text: 'Looks good', timestamp: 3, videoId: 'video-1' };
    http.post.mockReturnValue(of({ id: 'c1' }));

    await firstValueFrom(service.createComment(payload));
    await firstValueFrom(service.createComment(payload));

    expect(http.post).toHaveBeenCalledTimes(2);
  });

  it('updates a comment', async () => {
    const http = makeHttp();
    const service = new CommentService(http as never);
    http.patch.mockReturnValue(of({ id: 'c1', text: 'Updated' }));

    await firstValueFrom(service.updateComment('c1', { text: 'Updated' }));

    expect(http.patch).toHaveBeenCalledWith('/api/comments/c1', { text: 'Updated' });
  });

  it('deletes a comment', async () => {
    const http = makeHttp();
    const service = new CommentService(http as never);
    http.delete.mockReturnValue(of(undefined));

    await firstValueFrom(service.deleteComment('c1'));

    expect(http.delete).toHaveBeenCalledWith('/api/comments/c1');
  });

  it('resolves a comment', async () => {
    const http = makeHttp();
    const service = new CommentService(http as never);
    http.patch.mockReturnValue(of({ id: 'c1', resolved: true }));

    await firstValueFrom(service.resolveComment('c1'));

    expect(http.patch).toHaveBeenCalledWith('/api/comments/c1/resolve', {});
  });
});
