import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ConfigService } from '@nestjs/config';
import jwt from 'jsonwebtoken';

import { ChatService } from './chat.service.js';
import { ProjectAccessContext } from '../projects/project-access.service.js';

@WebSocketGateway({
  namespace: 'chat',
  cors: {
    origin: [`http://localhost:${process.env.FRONTEND_PORT ?? '4200'}`, `http://localhost:${process.env.NGINX_PORT ?? '8080'}`],
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly chatService: ChatService,
    private readonly configService: ConfigService,
  ) {}

  handleConnection(client: Socket) {
    try {
      client.data.accessContext = this.getAccessContext(client);
      console.log(`Chat client connected: ${client.id}`);
    } catch {
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    console.log(`Chat client disconnected: ${client.id}`);
  }

  @SubscribeMessage('joinChat')
  async joinChat(
    @MessageBody() data: { videoId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      await this.chatService.assertCanView(data.videoId, client.data.accessContext);
      client.join(`chat-${data.videoId}`);
      console.log(`Chat client ${client.id} joined chat for video ${data.videoId}`);
      const response = { success: true } as const;
      return response;
    } catch (error) {
      const message = this.getErrorMessage(error);
      console.warn(`Chat client ${client.id} failed to join chat for video ${data.videoId}: ${message}`);
      const response = { success: false, error: message } as const;
      return response;
    }
  }

  @SubscribeMessage('leaveChat')
  async leaveChat(
    @MessageBody() data: { videoId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(`chat-${data.videoId}`);
    console.log(`Chat client ${client.id} left chat for video ${data.videoId}`);
  }

  @SubscribeMessage('sendMessage')
  async sendMessage(
    @MessageBody() data: { videoId: string; message: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const chatMessage = await this.chatService.createMessage(
        data.videoId,
        client.data.accessContext,
        data.message,
      );

      const room = `chat-${data.videoId}`;
      this.server.to(room).emit('newMessage', chatMessage);

      const response = { success: true, message: chatMessage } as const;
      return response;
    } catch (error) {
      const message = this.getErrorMessage(error);
      console.warn(`Chat client ${client.id} failed to send message for video ${data.videoId}: ${message}`);
      const response = { success: false, error: message } as const;
      return response;
    }
  }

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Unexpected chat error';
  }

  private getAccessContext(client: Socket): ProjectAccessContext {
    const token = client.handshake.auth?.token;
    const secret = this.configService.get<string>('JWT_SECRET');
    if (typeof token !== 'string' || !secret) {
      throw new Error('Unauthorized');
    }
    const payload = jwt.verify(token, secret) as unknown as { sub: number; email?: string };
    return {
      principalType: 'user',
      userId: payload.sub,
    };
  }
}
