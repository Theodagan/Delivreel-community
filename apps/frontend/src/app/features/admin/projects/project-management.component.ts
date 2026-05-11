import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { Project, ProjectService } from '../../../core/services/project.service';

@Component({
  selector: 'app-project-management',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './project-management.component.html',
  styleUrls: ['./project-management.component.css']
})
export class ProjectManagementComponent implements OnInit {
  projects: Project[] = [];
  isLoading = false;
  error: string | null = null;
  editingProject: Project | null = null;
  projectForm: FormGroup;

  constructor(
    private projectService: ProjectService,
    private fb: FormBuilder
  ) {
    this.projectForm = this.fb.group({
      title: ['', Validators.required],
      description: [''],
      clientEmails: [''],
    });
  }

  ngOnInit() {
    this.loadProjects();
  }

  loadProjects() {
    this.isLoading = true;
    this.error = null;
    this.projectService.getProjects().subscribe({
      next: (projects) => {
        this.projects = projects;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Failed to load projects:', error);
        this.error = 'Projects could not be loaded.';
        this.isLoading = false;
      }
    });
  }

  startEdit(project: Project) {
    this.editingProject = project;
    this.projectForm.patchValue({
      title: project.title,
      description: project.description || '',
      clientEmails: project.clientEmails?.join(', ') || '',
    });
  }

  saveProject() {
    if (!this.editingProject || this.projectForm.invalid) {
      return;
    }

    const value = this.projectForm.value;
    this.projectService.updateProject(this.editingProject.id, {
      title: value.title,
      description: value.description,
      clientEmails: this.parseEmails(value.clientEmails),
    }).subscribe({
      next: () => {
        this.cancelEdit();
        this.loadProjects();
      },
      error: (error) => {
        console.error('Failed to update project:', error);
        this.error = 'Project could not be saved.';
      }
    });
  }

  deleteProject(project: Project) {
    if (!confirm(`Delete project "${project.title}"? This cannot be undone.`)) {
      return;
    }
    this.projectService.deleteProject(project.id).subscribe({
      next: () => this.loadProjects(),
      error: (error) => {
        console.error('Failed to delete project:', error);
        this.error = 'Project could not be deleted.';
      }
    });
  }

  cancelEdit() {
    this.editingProject = null;
    this.projectForm.reset();
  }

  private parseEmails(value: string): string[] {
    return (value || '')
      .split(',')
      .map(email => email.trim())
      .filter(Boolean);
  }
}
