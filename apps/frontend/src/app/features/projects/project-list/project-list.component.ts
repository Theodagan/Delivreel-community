import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

import { AuthService } from '../../../core/services/auth.service';
import { ProjectService, Project, CreateProjectRequest, UpdateProjectRequest } from '../../../core/services/project.service';
import { UiBadgeComponent } from '../../../shared/ui/badge.component';
import { UiViewToggleComponent } from '../../../shared/ui/view-toggle.component';
import { UiSortControlComponent } from '../../../shared/ui/sort-control.component';

type ViewMode = 'grid' | 'list';

@Component({
  selector: 'app-project-list',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, UiBadgeComponent, UiViewToggleComponent, UiSortControlComponent],
  templateUrl: './project-list.component.html',
  styleUrls: ['./project-list.component.css'],
})
export class ProjectListComponent implements OnInit {
  projects: Project[] = [];
  showCreateModal = false;
  showEditModal = false;
  editingProject: Project | null = null;
  projectForm: FormGroup;
  isLoading = false;
  isAdmin = false;
  viewMode: ViewMode = 'grid';
  sortField = 'createdAt';
  sortOptions = [
    { field: 'createdAt', label: 'Date Added' },
    { field: 'updatedAt', label: 'Last Updated' },
    { field: 'title', label: 'Title' },
    { field: 'videoCount', label: 'Video Count' },
  ];

  constructor(
    private projectService: ProjectService,
    private authService: AuthService,
    private fb: FormBuilder,
  ) {
    this.projectForm = this.fb.group({
      title: ['', [Validators.required]],
      description: [''],
      clientEmails: [''],
    });
    this.isAdmin = false;
    const saved = localStorage.getItem('delivreel.viewMode.projects');
    if (saved === 'list') this.viewMode = 'list';
  }

  ngOnInit() { this.loadProjects(); }

  get sortedProjects(): Project[] {
    const sorted = [...this.projects];
    switch (this.sortField) {
      case 'title': sorted.sort((a, b) => a.title.localeCompare(b.title)); break;
      case 'updatedAt': sorted.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()); break;
      case 'videoCount': sorted.sort((a, b) => (b.videos?.length || 0) - (a.videos?.length || 0)); break;
      default: sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return sorted;
  }

  onViewModeChange(mode: ViewMode) {
    this.viewMode = mode;
    localStorage.setItem('delivreel.viewMode.projects', mode);
  }

  loadProjects() {
    this.projectService.getProjects().subscribe({ next: p => this.projects = p });
  }

  editProject(project: Project) {
    this.editingProject = project;
    this.projectForm.patchValue({ title: project.title, description: project.description || '', clientEmails: project.clientEmails?.join('\n') || '' });
    this.showEditModal = true;
  }

  canEditProject(project: Project): boolean {
    return project.ownerId === this.authService.getCurrentUser()?.id;
  }

  onSubmit() {
    if (!this.projectForm.valid) return;
    this.isLoading = true;
    const { title, description, clientEmails: raw } = this.projectForm.value;
    const clientEmails = raw ? raw.split('\n').map((e: string) => e.trim()).filter(Boolean) : [];
    const payload = { title, description: description || undefined, clientEmails };

    if (this.editingProject) {
      this.projectService.updateProject(this.editingProject.id, payload as UpdateProjectRequest).subscribe({
        next: () => { this.loadProjects(); this.closeModal(); },
        error: () => this.isLoading = false,
      });
    } else {
      this.projectService.createProject(payload as CreateProjectRequest).subscribe({
        next: () => { this.loadProjects(); this.closeModal(); },
        error: () => this.isLoading = false,
      });
    }
  }

  closeModal() {
    this.showCreateModal = this.showEditModal = false;
    this.editingProject = null;
    this.projectForm.reset();
    this.isLoading = false;
  }
}
