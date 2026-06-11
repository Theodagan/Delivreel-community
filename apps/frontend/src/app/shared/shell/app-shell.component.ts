import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, RouterOutlet } from '@angular/router';

import { SidebarNavComponent } from './sidebar-nav.component';
import { TopBarComponent } from './top-bar.component';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterModule, RouterOutlet, SidebarNavComponent, TopBarComponent],
  template: `
    <div class="app-shell">
      <app-sidebar-nav #sidebar></app-sidebar-nav>
      <div class="shell-main">
        <app-top-bar (menuToggle)="sidebar.toggle()"></app-top-bar>
        <main class="shell-content">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>
  `,
  styles: [
    `:host { display: block; height: 100vh; }`,
    `.app-shell { display: flex; height: 100%; }
    .shell-main { display: flex; flex-direction: column; flex: 1; min-width: 0; }
    .shell-content { flex: 1; overflow-y: auto; padding: 0 var(--gutter) 74px; }`
  ]
})
export class AppShellComponent {}
