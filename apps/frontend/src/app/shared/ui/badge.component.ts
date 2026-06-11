import { Component, Input } from '@angular/core';

@Component({
  selector: 'ui-badge',
  standalone: true,
  template: `<span [class]="variant"><ng-content></ng-content></span>`,
  styles: `
    span { display: inline-flex; align-items: center; gap: var(--space-xs);
      padding: 2px var(--space-sm); border-radius: var(--radius);
      font: var(--type-label-caps); text-transform: uppercase; letter-spacing: var(--tracking-label-caps);
    }
    .success { background: var(--status-success-bg); color: var(--status-success-fg); }
    .warning { background: var(--status-warn-bg); color: var(--status-warn-fg); }
    .danger { background: var(--status-danger-bg); color: var(--status-danger-fg); }
    .info { background: var(--primary-container); color: var(--on-primary-container); }
    .neutral { background: var(--surface-container-high); color: var(--fg-muted); }
  `
})
export class UiBadgeComponent {
  @Input() variant: 'success' | 'warning' | 'danger' | 'info' | 'neutral' = 'neutral';
}
