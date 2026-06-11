import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { forkJoin, interval, of, Subscription } from 'rxjs';
import { startWith, switchMap } from 'rxjs/operators';

import { AuthService } from '../../../core/services/auth.service';
import { ProjectService, Project } from '../../../core/services/project.service';
import { VideoService, VideoStatusResponse } from '../../../core/services/video.service';
import { UploadGate } from '../../../core/upload-gate/upload-gate.service';
import { UiBadgeComponent } from '../../../shared/ui/badge.component';

const PROCESSING_STATUS_POLL_MS = 5000;

@Component({
  selector: 'app-project-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, UiBadgeComponent],
  templateUrl: './project-detail.component.html',
  styleUrls: ['./project-detail.component.css']
})
export class ProjectDetailComponent implements OnInit, OnDestroy {
  project: Project | null = null;
  showUploadModal = false;
  uploadForm: FormGroup;
  selectedFile: File | null = null;
  isUploading = false;
  uploadProgress = 0;
  isAdmin = false;
  private processingPollSubscription: Subscription | null = null;

  constructor(
    private route: ActivatedRoute,
    private projectService: ProjectService,
    private videoService: VideoService,
    private authService: AuthService,
    private uploadGate: UploadGate,
    private fb: FormBuilder
  ) {
    this.uploadForm = this.fb.group({
      title: ['', [Validators.required]],
      description: ['']
    });
  }

  ngOnInit() {
    const projectId = this.route.snapshot.paramMap.get('id');
    if (projectId) {
      this.loadProject(projectId);
    }
  }

  ngOnDestroy() {
    this.stopProcessingPolling();
  }

  loadProject(id: string) {
    this.projectService.getProjectSettings(id).subscribe({
      next: (settings) => {
        this.project = {
          ...settings.project,
          capabilities: settings.capabilities,
        };
        this.startProcessingPolling();
      },
      error: (error) => {
        console.error('Error loading project:', error);
      }
    });
  }

  private startProcessingPolling() {
    this.stopProcessingPolling();

    if (this.getProcessingVideoIds().length === 0) {
      return;
    }

    this.processingPollSubscription = interval(PROCESSING_STATUS_POLL_MS).pipe(
      startWith(0),
      switchMap(() => {
        const processingVideoIds = this.getProcessingVideoIds();
        if (processingVideoIds.length === 0) {
          return of([] as VideoStatusResponse[]);
        }
        return forkJoin(processingVideoIds.map((id) => this.videoService.getVideoStatus(id)));
      })
    ).subscribe({
      next: (statuses) => {
        this.applyVideoStatuses(statuses);
        if (this.getProcessingVideoIds().length === 0) {
          this.stopProcessingPolling();
        }
      },
      error: (error) => {
        console.error('Error polling video status:', error);
        this.stopProcessingPolling();
      }
    });
  }

  private stopProcessingPolling() {
    this.processingPollSubscription?.unsubscribe();
    this.processingPollSubscription = null;
  }

  private getProcessingVideoIds(): string[] {
    return this.project?.videos
      ?.filter((video) => video.status === 'processing')
      .map((video) => video.id)
      ?? [];
  }

  private applyVideoStatuses(statuses: VideoStatusResponse[]) {
    if (!this.project) {
      return;
    }

    for (const status of statuses) {
      const video = this.project.videos.find((candidate) => candidate.id === status.id);
      if (video) {
        video.status = status.status;
        video.updatedAt = status.updatedAt;
      }
    }
  }

  canUploadVideo(): boolean {
    if (!this.project) return false;
    if (this.isSuperAdmin()) return true;
    return !!this.project.capabilities?.canUploadVideos;
  }

  private isSuperAdmin(): boolean {
    return this.authService.getCurrentUser()?.role === 'super_admin';
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
    }
  }

  async openUploadPanel() {
    if (!this.project) {
      return;
    }

    if (this.isSuperAdmin()) {
      this.showUploadModal = true;
      return;
    }

    const allowed = await this.uploadGate.requestUploadAccess(this.project.id);
    if (allowed) {
      this.showUploadModal = true;
    }
  }

  async onUpload() {
    if (this.uploadForm.valid && this.selectedFile && this.project) {
      this.isUploading = true;
      this.uploadProgress = 0;
      
      const formData = new FormData();
      formData.append('video', this.selectedFile);
      formData.append('title', this.uploadForm.value.title);
      formData.append('description', this.uploadForm.value.description || '');
      formData.append('projectId', this.project.id);

      this.videoService.uploadVideo(formData, this.selectedFile, (progress) => {
        this.uploadProgress = progress;
      }).subscribe({
        next: () => {
          this.uploadProgress = 100;
          this.loadProject(this.project!.id);
          this.closeUploadModal();
        },
        error: (error) => {
          console.error('Error uploading video:', error);
          this.isUploading = false;
          this.uploadProgress = 0;
        }
      });
    }
  }

  closeUploadModal() {
    this.showUploadModal = false;
    this.uploadForm.reset();
    this.selectedFile = null;
    this.isUploading = false;
    this.uploadProgress = 0;
  }
}
