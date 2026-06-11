import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AfterViewChecked, Component, ElementRef, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { io, Socket } from 'socket.io-client';

import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';

export interface ChatMessage {
  id: string;
  videoId: string;
  userId: number;
  userName: string;
  message: string;
  createdAt: string;
}

type ChatSendResponse =
  | { success: true; message: ChatMessage }
  | { success: false; error?: string };

type ChatJoinResponse =
  | { success: true }
  | { success: false; error?: string };

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css'],
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  @Input({ required: true }) videoId!: string;
  @Input({ required: true }) projectId!: string;
  @Input() canComment = true;
  @Input() isSignedOff = false;
  @ViewChild('scrollContainer') private scrollContainer?: ElementRef<HTMLElement>;

  messages: ChatMessage[] = [];
  newMessage = '';
  isConnected = false;
  isSending = false;
  sendError: string | null = null;
  connectionError: string | null = null;

  private socket: Socket | null = null;
  private shouldAutoScroll = true;
  private sendTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private authService: AuthService,
    private http: HttpClient,
  ) {}

  ngOnInit() {
    if (!this.videoId) return;
    this.loadRecentMessages();
    this.connectSocket();
  }

  ngOnDestroy() {
    this.disconnectSocket();
  }

  ngAfterViewChecked() {
    if (this.shouldAutoScroll) {
      this.scrollToBottom();
    }
  }

  sendMessage() {
    const trimmed = this.newMessage.trim();
    if (!trimmed || !this.socket || !this.isConnected || this.isSending || this.sendDisabledReason) return;

    this.isSending = true;
    this.sendError = null;

    this.sendTimeout = setTimeout(() => {
      this.isSending = false;
      this.sendError = 'Message send timed out. Please try again.';
      this.sendTimeout = null;
    }, 10000);

    this.socket.emit('sendMessage', {
      videoId: this.videoId,
      projectId: this.projectId,
      message: trimmed,
    }, (response: ChatSendResponse) => {
      this.clearSendTimeout();
      this.isSending = false;

      if (!response?.success) {
        this.sendError = response?.error || 'Message could not be sent.';
        return;
      }

      this.addMessageIfMissing(response.message);
      this.newMessage = '';
    });
  }

  get sendDisabledReason(): string | null {
    if (this.isSignedOff) {
      return 'Chat is locked because this video is signed off.';
    }
    if (!this.canComment) {
      return 'You do not have permission to chat on this video.';
    }
    return null;
  }

  downloadTranscript() {
    const transcript = this.formatTranscript();
    const blob = new Blob([transcript], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `chat-transcript-${this.videoId}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }

  formatTranscript(): string {
    if (!this.messages.length) {
      return 'No chat messages.';
    }

    return this.messages
      .map((message) => {
        const timestamp = new Date(message.createdAt).toLocaleString();
        return `[${timestamp}] ${message.userName || 'User'}: ${message.message}`;
      })
      .join('\n');
  }

  formatTime(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  private loadRecentMessages() {
    this.http.get<ChatMessage[]>(`${environment.apiUrl}/chat?videoId=${this.videoId}&limit=50`).subscribe({
      next: (messages) => {
        this.messages = messages;
        this.shouldAutoScroll = true;
      },
      error: (err) => console.error('Error loading chat messages:', err),
    });
  }

  private connectSocket() {
    const token = this.authService.getToken();
    this.socket = io(`${environment.socketUrl}/chat`, {
      auth: { token },
    });

    this.socket.on('connect', () => {
      this.isConnected = true;
      this.connectionError = null;
      this.socket?.emit('joinChat', { videoId: this.videoId, projectId: this.projectId }, (response: ChatJoinResponse) => {
        if (!response?.success) {
          this.connectionError = response?.error || 'Could not join chat for this video.';
          this.isConnected = false;
        }
      });
    });

    this.socket.on('disconnect', (reason) => {
      this.isConnected = false;
      this.connectionError = reason === 'io client disconnect' ? null : 'Chat disconnected. Reconnecting...';
    });

    this.socket.on('connect_error', (error) => {
      this.isConnected = false;
      this.connectionError = error.message || 'Chat connection failed.';
    });

    this.socket.on('newMessage', (message: ChatMessage) => {
      this.addMessageIfMissing(message);
    });
  }

  private disconnectSocket() {
    if (this.socket) {
      this.socket.emit('leaveChat', { videoId: this.videoId, projectId: this.projectId });
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
    this.clearSendTimeout();
  }

  private addMessageIfMissing(message: ChatMessage) {
    if (this.messages.some((existing) => existing.id === message.id)) return;
    this.messages.push(message);
    this.shouldAutoScroll = true;
  }

  private clearSendTimeout() {
    if (!this.sendTimeout) return;
    clearTimeout(this.sendTimeout);
    this.sendTimeout = null;
  }

  private scrollToBottom() {
    if (!this.scrollContainer) return;
    const el = this.scrollContainer.nativeElement;
    el.scrollTop = el.scrollHeight;
    this.shouldAutoScroll = false;
  }
}
