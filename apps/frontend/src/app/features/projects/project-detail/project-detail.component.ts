import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

import { AuthService } from '../../../core/services/auth.service';
import { ProjectService, Project } from '../../../core/services/project.service';
import { VideoService, CreateVideoRequest } from '../../../core/services/video.service';

@Component({
  selector: 'app-project-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './project-detail.component.html',
  styleUrls: ['./project-detail.component.css']
})
export class ProjectDetailComponent implements OnInit {
  project: Project | null = null;
  showUploadModal = false;
  uploadForm: FormGroup;
  selectedFile: File | null = null;
  isUploading = false;
  uploadProgress = 0;
  isAdmin = false;

  constructor(
    private route: ActivatedRoute,
    private projectService: ProjectService,
    private videoService: VideoService,
    private authService: AuthService,
    private fb: FormBuilder
  ) {
    this.uploadForm = this.fb.group({
      title: ['', [Validators.required]],
      description: ['']
    });
    this.isAdmin = this.authService.isAdmin();
  }

  ngOnInit() {
    const projectId = this.route.snapshot.paramMap.get('id');
    if (projectId) {
      this.loadProject(projectId);
    }
  }

  loadProject(id: string) {
    this.projectService.getProject(id).subscribe({
      next: (project) => {
        this.project = project;
      },
      error: (error) => {
        console.error('Error loading project:', error);
      }
    });
  }

  canUploadVideo(): boolean {
    if (!this.project) return false;
    const currentUser = this.authService.getCurrentUser();
    return this.isAdmin || this.project.ownerId === currentUser?.id;
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
    }
  }

  onUpload() {
    if (this.uploadForm.valid && this.selectedFile && this.project) {
      this.isUploading = true;
      
      const formData = new FormData();
      formData.append('video', this.selectedFile);
      formData.append('title', this.uploadForm.value.title);
      formData.append('description', this.uploadForm.value.description || '');
      formData.append('projectId', this.project.id);

      this.videoService.uploadVideo(formData, this.selectedFile).subscribe({
        next: () => {
          this.loadProject(this.project!.id);
          this.closeUploadModal();
        },
        error: (error) => {
          console.error('Error uploading video:', error);
          this.isUploading = false;
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
