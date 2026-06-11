import { HttpClient } from '@angular/common/http';

import { ChatComponent } from './chat.component';

describe('ChatComponent', () => {
  const makeComponent = () => new ChatComponent(
    { getToken: jest.fn().mockReturnValue('token') } as never,
    { get: jest.fn() } as unknown as HttpClient,
  );

  const attachSocket = (component: ChatComponent, emit: jest.Mock) => {
    (component as unknown as { socket: { emit: jest.Mock } }).socket = { emit };
    component.isConnected = true;
  };

  it('formats a transcript from loaded messages', () => {
    const component = makeComponent();
    component.messages = [
      {
        id: 'm1',
        videoId: 'v1',
        userId: 1,
        userName: 'Alice',
        message: 'Looks good.',
        createdAt: '2026-06-07T10:00:00.000Z',
      },
    ];

    expect(component.formatTranscript()).toContain('Alice: Looks good.');
  });

  it('formats an empty transcript', () => {
    const component = makeComponent();

    expect(component.formatTranscript()).toBe('No chat messages.');
  });

  it('appends and clears the message after a successful send acknowledgement', () => {
    const component = makeComponent();
    component.videoId = 'v1';
    component.projectId = 'p1';
    component.newMessage = ' Hello ';
    const message = {
      id: 'm1',
      videoId: 'v1',
      userId: 1,
      userName: 'Alice',
      message: 'Hello',
      createdAt: '2026-06-07T10:00:00.000Z',
    };
    const emit = jest.fn((_event: string, _payload: unknown, ack: (response: unknown) => void) => ack({ success: true, message }));
    attachSocket(component, emit);

    component.sendMessage();

    expect(emit).toHaveBeenCalledWith('sendMessage', { videoId: 'v1', projectId: 'p1', message: 'Hello' }, expect.any(Function));
    expect(component.messages).toEqual([message]);
    expect(component.newMessage).toBe('');
    expect(component.sendError).toBeNull();
    expect(component.isSending).toBe(false);
  });

  it('keeps the message and surfaces the error after a failed send acknowledgement', () => {
    const component = makeComponent();
    component.videoId = 'v1';
    component.projectId = 'p1';
    component.newMessage = 'Blocked';
    const emit = jest.fn((_event: string, _payload: unknown, ack: (response: unknown) => void) => ack({ success: false, error: 'Access denied' }));
    attachSocket(component, emit);

    component.sendMessage();

    expect(component.messages).toEqual([]);
    expect(component.newMessage).toBe('Blocked');
    expect(component.sendError).toBe('Access denied');
    expect(component.isSending).toBe(false);
  });
}
);
