import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import { ProjectService, Project } from '../../core/services/project.service';
import { VideoService, Video } from '../../core/services/video.service';
import { DashboardApi, ActivityItem, FeedbackItem, StorageInfo } from '../../core/services/dashboard-api.service';
import { UiBadgeComponent } from '../../shared/ui/badge.component';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, UiBadgeComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
})
export class DashboardComponent implements OnInit {
  currentUser = this.authService.getCurrentUser();
  projects: Project[] = [];
  videos: Video[] = [];
  activity: ActivityItem[] = [];
  feedback: FeedbackItem[] = [];
  storage: StorageInfo | null = null;
  isHosted = (environment.appEnvironment as string) !== 'selfhost';

  constructor(
    private authService: AuthService,
    private projectService: ProjectService,
    private videoService: VideoService,
    private dashboardApi: DashboardApi,
  ) {}

  ngOnInit() {
    this.loadProjects();
    this.loadVideos();
    this.loadActivity();
    this.loadFeedback();
    this.loadStorage();
  }

  get recentProjects(): Project[] { return this.projects.slice(0, 3); }
  get recentVideos(): Video[] { return this.videos.slice(0, 5); }
  get processingVideos(): number { return this.videos.filter(v => v.status === 'processing').length; }
  get readyVideos(): number { return this.videos.filter(v => v.status === 'ready').length; }

  formatBytes(bytes: number): string {
    if (!bytes) return '0 B';
    const u = ['B', 'KB', 'MB', 'GB', 'TB'];
    let i = 0;
    let v = bytes;
    while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
    return `${v.toFixed(i > 0 ? 1 : 0)} ${u[i]}`;
  }

  activityKindLabel(kind: string): string {
    switch (kind) {
      case 'comment': return 'commented on';
      case 'reply': return 'replied to';
      case 'resolve': return 'resolved a comment on';
      default: return kind;
    }
  }

  private loadProjects() {
    this.projectService.getProjects().subscribe({ next: p => this.projects = p });
  }

  private loadVideos() {
    this.videoService.getVideos().subscribe({ next: v => this.videos = v });
  }

  private loadActivity() {
    this.dashboardApi.getActivity(5).subscribe({ next: a => this.activity = a });
  }

  private loadFeedback() {
    this.dashboardApi.getFeedback(5).subscribe({ next: f => this.feedback = f });
  }

  private loadStorage() {
    this.dashboardApi.getStorage().subscribe({ next: s => this.storage = s });
  }
}
