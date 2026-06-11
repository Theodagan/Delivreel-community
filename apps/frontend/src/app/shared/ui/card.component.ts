import { Component, Input } from '@angular/core';

@Component({
  selector: 'ui-card',
  standalone: true,
  template: `<div [class]="variant"><ng-content></ng-content></div>`,
  styles: `
    div { border-radius: var(--radius-lg); padding: var(--space-lg); }
    .default { background: var(--bg-card); border: 1px solid var(--border); box-shadow: var(--shadow-1); }
    .elevated { background: var(--bg-card-high); border: 1px solid var(--border); box-shadow: var(--shadow-2); }
    .flat { background: var(--surface-container); }
    .outlined { background: transparent; border: 1px solid var(--border-strong); }
  `
})
export class UiCardComponent {
  @Input() variant: 'default' | 'elevated' | 'flat' | 'outlined' = 'default';
}
