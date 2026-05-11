import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

import { AuthService } from '../../../core/services/auth.service';
import { ProjectService, Project, CreateProjectRequest, UpdateProjectRequest } from '../../../core/services/project.service';

@Component({
  selector: 'app-project-list',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './project-list.component.html',
  styleUrls: ['./project-list.component.css']
})
export class ProjectListComponent implements OnInit {
  projects: Project[] = [];
  showCreateModal = false;
  showEditModal = false;
  editingProject: Project | null = null;
  projectForm: FormGroup;
  isLoading = false;
  isAdmin = false;

  constructor(
    private projectService: ProjectService,
    private authService: AuthService,
    private fb: FormBuilder
  ) {
    this.projectForm = this.fb.group({
      title: ['', [Validators.required]],
      description: [''],
      clientEmails: ['']
    });
    this.isAdmin = this.authService.isAdmin();
  }

  ngOnInit() {
    this.loadProjects();
  }

  loadProjects() {
    this.projectService.getProjects().subscribe({
      next: (projects) => {
        this.projects = projects;
      },
      error: (error) => {
        console.error('Error loading projects:', error);
      }
    });
  }

  editProject(project: Project) {
    this.editingProject = project;
    this.projectForm.patchValue({
      title: project.title,
      description: project.description || '',
      clientEmails: project.clientEmails?.join('\n') || ''
    });
    this.showEditModal = true;
  }

  canEditProject(project: Project): boolean {
    const currentUser = this.authService.getCurrentUser();
    return this.isAdmin || project.ownerId === currentUser?.id;
  }

  onSubmit() {
    if (this.projectForm.valid) {
      this.isLoading = true;
      const formData = this.projectForm.value;
      
      // Convert clientEmails from string to array
      const clientEmails = formData.clientEmails
        ? formData.clientEmails.split('\n').map((email: string) => email.trim()).filter((email: string) => email)
        : [];

      if (this.editingProject) {
        const updateData: UpdateProjectRequest = {
          title: formData.title,
          description: formData.description || undefined,
          clientEmails
        };

        this.projectService.updateProject(this.editingProject.id, updateData).subscribe({
          next: () => {
            this.loadProjects();
            this.closeModal();
          },
          error: (error) => {
            console.error('Error updating project:', error);
            this.isLoading = false;
          }
        });
      } else {
        const createData: CreateProjectRequest = {
          title: formData.title,
          description: formData.description || undefined,
          clientEmails
        };

        this.projectService.createProject(createData).subscribe({
          next: () => {
            this.loadProjects();
            this.closeModal();
          },
          error: (error) => {
            console.error('Error creating project:', error);
            this.isLoading = false;
          }
        });
      }
    }
  }

  closeModal() {
    this.showCreateModal = false;
    this.showEditModal = false;
    this.editingProject = null;
    this.projectForm.reset();
    this.isLoading = false;
  }
}