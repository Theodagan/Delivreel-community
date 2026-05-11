import { io } from 'socket.io-client';

import { WebSocketService } from './websocket.service';

jest.mock('socket.io-client', () => ({
  io: jest.fn(),
}));

describe('WebSocketService', () => {
  const mockAuthService = {
    getToken: jest.fn().mockReturnValue('token-123'),
    getCurrentUser: jest.fn().mockReturnValue({ id: 'u1', role: 'admin' }),
  };

  let handlers: Record<string, (...args: any[]) => void>;
  let socket: {
    on: jest.Mock;
    emit: jest.Mock;
    disconnect: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    handlers = {};
    socket = {
      on: jest.fn((event: string, cb: (...args: any[]) => void) => {
        handlers[event] = cb;
      }),
      emit: jest.fn(),
      disconnect: jest.fn(),
    };
    (io as jest.Mock).mockReturnValue(socket);
  });

  it('connects with auth token and subscribes to events', () => {
    const service = new WebSocketService(mockAuthService as never);

    service.connect();

    expect(io).toHaveBeenCalledWith('http://localhost', {
      auth: { token: 'token-123' },
    });
    expect(socket.on).toHaveBeenCalledWith('commentCreated', expect.any(Function));
    expect(socket.on).toHaveBeenCalledWith('commentUpdated', expect.any(Function));
    expect(socket.on).toHaveBeenCalledWith('commentDeleted', expect.any(Function));
  });

  it('emits room and comment events', () => {
    const service = new WebSocketService(mockAuthService as never);
    service.connect();

    service.joinVideo('video-1');
    service.leaveVideo('video-1');
    service.createComment({ text: 'hi', videoId: 'video-1' });
    service.updateComment('comment-1', { text: 'updated' });
    service.deleteComment('comment-1');

    expect(socket.emit).toHaveBeenCalledWith('joinVideo', { videoId: 'video-1' });
    expect(socket.emit).toHaveBeenCalledWith('leaveVideo', { videoId: 'video-1' });
    expect(socket.emit).toHaveBeenCalledWith('createComment', {
      comment: { text: 'hi', videoId: 'video-1' },
      userId: 'u1',
    });
    expect(socket.emit).toHaveBeenCalledWith('updateComment', {
      commentId: 'comment-1',
      updateData: { text: 'updated' },
      userId: 'u1',
      userRole: 'admin',
    });
    expect(socket.emit).toHaveBeenCalledWith('deleteComment', {
      commentId: 'comment-1',
      userId: 'u1',
      userRole: 'admin',
    });
  });

  it('publishes socket comment events through comments$', () => {
    const service = new WebSocketService(mockAuthService as never);
    const received: any[] = [];
    service.comments$.subscribe((message) => received.push(message));

    service.connect();
    handlers['commentCreated']({ id: 'c1' });
    handlers['commentUpdated']({ id: 'c2' });
    handlers['commentDeleted']({ commentId: 'c3' });

    expect(received).toEqual([
      { type: 'created', comment: { id: 'c1' } },
      { type: 'updated', comment: { id: 'c2' } },
      { type: 'deleted', commentId: 'c3' },
    ]);
  });

  it('disconnects active socket', () => {
    const service = new WebSocketService(mockAuthService as never);
    service.connect();

    service.disconnect();

    expect(socket.disconnect).toHaveBeenCalled();
  });
});
