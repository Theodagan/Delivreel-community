import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import { UiDrawerComponent } from '../ui/drawer.component';
import { SupportLinkComponent } from './support-link.component';

@Component({
  selector: 'app-sidebar-nav',
  standalone: true,
  imports: [RouterModule, UiDrawerComponent, SupportLinkComponent],
  styles: [`
    :host { display: flex; }
    .sidebar { display: flex; flex-direction: column; width: 240px; min-width: 240px;
      background: var(--surface); backdrop-filter: blur(18px) saturate(125%);
      border-right: 1px solid var(--glass-edge);
      transition: width 0.25s cubic-bezier(.22,1,.36,1), min-width 0.25s; overflow: hidden; }
    .sidebar-brand { display: flex; align-items: center; justify-content: space-between; gap: var(--space-xs);
      height: 56px; padding: 0 var(--space-sm) 0 var(--space-md);
      border-bottom: 1px solid var(--glass-edge); }
    .brand-link { flex: 1; min-width: 0; text-decoration: none; color: var(--fg-default); font: var(--type-headline-md); }
    .brand-compact { display: none; }
    .sidebar-nav-content { flex: 1; padding: var(--space-sm); display: flex; flex-direction: column; gap: 2px;
      overflow-y: auto; }
    .nav-item { display: flex; align-items: center; gap: var(--space-sm); padding: var(--space-sm) var(--space-md);
      text-decoration: none; color: var(--fg-muted); font: var(--type-body-md);
      border-radius: 14px 3px 14px 3px;
      transition: background 0.15s, color 0.15s; white-space: nowrap; overflow: hidden; }
    .nav-item:hover { background: var(--surface-soft); color: var(--fg-default); }
    .nav-item.active { background: light-dark(rgba(26,84,240,.12), rgba(77,232,255,.10)); color: var(--ui-primary); }
    .nav-icon { font-size: 20px; width: 20px; height: 20px; flex-shrink: 0; }
    .nav-label { white-space: nowrap; }
    .sidebar-footer { padding: var(--space-sm); border-top: 1px solid var(--glass-edge); }
    .mobile-nav { padding: var(--space-sm); display: flex; flex-direction: column; gap: 2px; }
    .sidebar.collapsed { width: 64px; min-width: 64px; }
    .sidebar.collapsed .sidebar-brand { justify-content: center; padding: 0 var(--space-xs); }
    .sidebar.collapsed .brand-link { flex: 0 0 auto; text-align: center; width: auto; }
    .sidebar.collapsed .brand-full,
    .sidebar.collapsed .nav-label { display: none; }
    .sidebar.collapsed .brand-compact { display: inline; }
    .sidebar.collapsed .nav-item { justify-content: center; padding: var(--space-sm); border-radius: 12px 2px 12px 2px; }
    @media (min-width: 768px) and (max-width: 1023px) {
      .sidebar.collapsed { width: 64px; min-width: 64px; }
      .sidebar:not(.collapsed) { width: 240px; min-width: 240px; }
      .sidebar.collapsed .sidebar-brand { justify-content: center; padding: 0 var(--space-xs); }
      .sidebar.collapsed .brand-link { flex: 0 0 auto; text-align: center; width: auto; }
      .sidebar.collapsed .brand-full,
      .sidebar.collapsed .nav-label { display: none; }
      .sidebar.collapsed .brand-compact { display: inline; }
      .sidebar.collapsed .nav-item { justify-content: center; padding: var(--space-sm); border-radius: 12px 2px 12px 2px; }
    }
    @media (max-width: 767px) { .sidebar { display: none; } }
  `],
  template: `
    <!-- Mobile drawer -->
    <ui-drawer [(open)]="mobileOpen" side="left" title="Navigation">
      <nav class="sidebar-nav-content mobile-nav">
        @for (item of navItems; track item.path) {
            @if (!item.adminOnly || isAuthenticated) {
            <a [routerLink]="item.path" routerLinkActive="active" class="nav-item">
              <span class="material-symbols-outlined nav-icon">{{ item.icon }}</span>
              <span class="nav-label">{{ item.label }}</span>
            </a>
          }
        }
      </nav>
    </ui-drawer>

    <!-- Desktop sidebar -->
    <aside class="sidebar" [class.collapsed]="collapsed" [class.mobile-hidden]="!mobileOpen">
      <div class="sidebar-brand">
        <a routerLink="/dashboard" class="brand-link">
          <span class="brand-full">Delivreel</span>
          <span class="brand-compact">D</span>
        </a>
      </div>
      <nav class="sidebar-nav-content">
        <button class="nav-item" type="button" (click)="toggleDesktop()">
          <span class="material-symbols-outlined nav-icon" aria-hidden="true">{{ collapsed ? 'keyboard_double_arrow_right' : 'keyboard_double_arrow_left' }}</span>
          <span class="nav-label">{{ collapsed ? 'Expand menu' : 'Collapse menu' }}</span>
        </button>
        @for (item of navItems; track item.path) {
            @if (!item.adminOnly || isAuthenticated) {
            <a [routerLink]="item.path" routerLinkActive="active" class="nav-item">
              <span class="material-symbols-outlined nav-icon">{{ item.icon }}</span>
              <span class="nav-label">{{ item.label }}</span>
            </a>
          }
        }
      </nav>
      <div class="sidebar-footer">
        <app-support-link></app-support-link>
      </div>
    </aside>
  `
})
export class SidebarNavComponent implements OnInit {
  mobileOpen = false;
  collapsed = false;
  isAuthenticated = false;

  navItems = [
    { path: '/dashboard', icon: 'dashboard', label: 'Dashboard' },
    { path: '/projects', icon: 'folder_copy', label: 'Projects' },
    { path: '/analytics', icon: 'query_stats', label: 'Analytics', adminOnly: true },
    { path: '/archive', icon: 'inventory_2', label: 'Archive' },
    { path: '/settings', icon: 'settings', label: 'Settings' },
  ];

  constructor(private authService: AuthService) {}

  ngOnInit() {
    this.authService.isAuthenticated$.subscribe(auth => this.isAuthenticated = auth);
  }

  toggle() {
    if (this.isMobileViewport()) {
      this.toggleMobile();
      return;
    }

    this.toggleDesktop();
  }

  toggleDesktop() {
    this.collapsed = !this.collapsed;
  }

  toggleMobile() { this.mobileOpen = !this.mobileOpen; }

  private isMobileViewport(): boolean {
    return typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia('(max-width: 767px)').matches;
  }
}
