import { Routes } from '@angular/router';

export const adminRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent)
  },
  {
    path: 'users',
    loadComponent: () => import('./users/user-management.component').then(m => m.UserManagementComponent)
  },
  {
    path: 'projects',
    loadComponent: () => import('./projects/project-management.component').then(m => m.ProjectManagementComponent)
  }
];