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
import { UseGuards } from '@nestjs/common';

import { CommentsService } from './comments.service.js';
import { CreateCommentDto } from './dto/create-comment.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

const frontendPort = process.env.FRONTEND_PORT ?? '4200';
const nginxPort = process.env.NGINX_PORT ?? '8080';

const corsOrigins = [
  `http://localhost:${frontendPort}`,
  `http://localhost:${nginxPort}`,
];

@WebSocketGateway({
  cors: {
    origin: corsOrigins,
    credentials: true,
  },
})
export class CommentsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private readonly commentsService: CommentsService) {}

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('joinVideo')
  async joinVideo(
    @MessageBody() data: { videoId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`video-${data.videoId}`);
    console.log(`Client ${client.id} joined video ${data.videoId}`);
  }

  @SubscribeMessage('leaveVideo')
  async leaveVideo(
    @MessageBody() data: { videoId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(`video-${data.videoId}`);
    console.log(`Client ${client.id} left video ${data.videoId}`);
  }

  @UseGuards(JwtAuthGuard)
  @SubscribeMessage('createComment')
  async createComment(
    @MessageBody() data: { comment: CreateCommentDto; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const comment = await this.commentsService.create(data.comment, data.userId);
      
      // Broadcast the new comment to all clients in the video room
      this.server.to(`video-${data.comment.videoId}`).emit('commentCreated', comment);
      
      return { success: true, comment };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  @UseGuards(JwtAuthGuard)
  @SubscribeMessage('updateComment')
  async updateComment(
    @MessageBody() data: { 
      commentId: string; 
      updateData: any; 
      userId: string; 
      userRole: string 
    },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const comment = await this.commentsService.update(
        data.commentId, 
        data.updateData, 
        data.userId, 
        data.userRole
      );
      
      // Broadcast the updated comment
      this.server.to(`video-${comment.videoId}`).emit('commentUpdated', comment);
      
      return { success: true, comment };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  @UseGuards(JwtAuthGuard)
  @SubscribeMessage('deleteComment')
  async deleteComment(
    @MessageBody() data: { 
      commentId: string; 
      userId: string; 
      userRole: string 
    },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const comment = await this.commentsService.findOne(data.commentId);
      const videoId = comment.videoId;
      
      await this.commentsService.remove(data.commentId, data.userId, data.userRole);
      
      // Broadcast the deletion
      this.server.to(`video-${videoId}`).emit('commentDeleted', { commentId: data.commentId });
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}
