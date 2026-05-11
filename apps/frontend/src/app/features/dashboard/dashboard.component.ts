import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import { ProjectService, Project } from '../../core/services/project.service';
import { VideoService, Video } from '../../core/services/video.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  currentUser = this.authService.getCurrentUser();
  projects: Project[] = [];
  videos: Video[] = [];

  constructor(
    private authService: AuthService,
    private projectService: ProjectService,
    private videoService: VideoService
  ) {}

  ngOnInit() {
    this.loadProjects();
    this.loadVideos();
  }

  get recentProjects(): Project[] {
    return this.projects.slice(0, 3);
  }

  get recentVideos(): Video[] {
    return this.videos.slice(0, 5);
  }

  get processingVideos(): number {
    return this.videos.filter(v => v.status === 'processing').length;
  }

  get readyVideos(): number {
    return this.videos.filter(v => v.status === 'ready').length;
  }

  private loadProjects() {
    this.projectService.getProjects().subscribe({
      next: (projects) => {
        this.projects = projects;
      },
      error: (error) => {
        console.error('Error loading projects:', error);
      }
    });
  }

  private loadVideos() {
    this.videoService.getVideos().subscribe({
      next: (videos) => {
        this.videos = videos;
      },
      error: (error) => {
        console.error('Error loading videos:', error);
      }
    });
  }
}