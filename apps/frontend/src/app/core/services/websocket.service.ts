import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';

import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {
  private socket: Socket | null = null;
  private commentSubject = new Subject<any>();

  public comments$ = this.commentSubject.asObservable();

  constructor(private authService: AuthService) {}

  connect() {
    if (this.socket) return;

    const token = this.authService.getToken();
    this.socket = io(environment.socketUrl, {
      auth: {
        token: token
      }
    });

    this.socket.on('connect', () => {
      console.log('Connected to WebSocket');
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from WebSocket');
    });

    this.socket.on('commentCreated', (comment) => {
      this.commentSubject.next({ type: 'created', comment });
    });

    this.socket.on('commentUpdated', (comment) => {
      this.commentSubject.next({ type: 'updated', comment });
    });

    this.socket.on('commentDeleted', (data) => {
      this.commentSubject.next({ type: 'deleted', commentId: data.commentId });
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  joinVideo(videoId: string) {
    if (this.socket) {
      this.socket.emit('joinVideo', { videoId });
    }
  }

  leaveVideo(videoId: string) {
    if (this.socket) {
      this.socket.emit('leaveVideo', { videoId });
    }
  }

  createComment(comment: any) {
    if (this.socket) {
      const user = this.authService.getCurrentUser();
      this.socket.emit('createComment', { 
        comment, 
        userId: user?.id 
      });
    }
  }

  updateComment(commentId: string, updateData: any) {
    if (this.socket) {
      const user = this.authService.getCurrentUser();
      this.socket.emit('updateComment', { 
        commentId, 
        updateData, 
        userId: user?.id,
        userRole: user?.role
      });
    }
  }

  deleteComment(commentId: string) {
    if (this.socket) {
      const user = this.authService.getCurrentUser();
      this.socket.emit('deleteComment', { 
        commentId, 
        userId: user?.id,
        userRole: user?.role
      });
    }
  }
}
