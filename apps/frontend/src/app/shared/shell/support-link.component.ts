import { Component, inject } from '@angular/core';
import { SUPPORT_URL } from '../../core/support-url.token';

@Component({
  selector: 'app-support-link',
  standalone: true,
  template: `<a [href]="url" target="_blank" rel="noopener" class="support-link">
    <span class="material-symbols-outlined">help_outline</span>
    <span class="nav-label">Support</span>
  </a>`,
  styles: `
    .support-link { display: flex; align-items: center; gap: var(--space-sm);
      color: var(--fg-muted); text-decoration: none; font: var(--type-body-md);
      padding: var(--space-sm) var(--space-md); border-radius: var(--radius);
      transition: color 0.15s, background 0.15s; }
    .support-link:hover { background: var(--surface-container); color: var(--fg-default); }
    .material-symbols-outlined { font-size: 20px; }
  `
})
export class SupportLinkComponent {
  url = inject(SUPPORT_URL);
}
