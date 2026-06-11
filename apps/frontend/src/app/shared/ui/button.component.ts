import { Component, Input } from '@angular/core';

@Component({
  selector: 'ui-button',
  standalone: true,
  template: `<button
    [type]="type"
    [disabled]="disabled"
    [class]="variant"
    [class.btn-sm]="size === 'sm'"
    [class.btn-lg]="size === 'lg'"
    [attr.aria-busy]="loading"
  ><ng-content></ng-content></button>`,
  styles: `
    button {
      display: inline-flex; align-items: center; justify-content: center;
      gap: var(--space-sm); border: none; cursor: pointer;
      font: var(--type-body-md); border-radius: var(--radius);
      padding: var(--space-sm) var(--space-lg); transition: background 0.15s, box-shadow 0.15s;
    }
    button:disabled { opacity: 0.5; cursor: not-allowed; }
    .primary { background: var(--accent); color: var(--accent-on); }
    .primary:hover:not(:disabled) { box-shadow: 0 2px 8px rgba(79,70,229,0.35); }
    .secondary { background: var(--surface-container-high); color: var(--fg-default); border: 1px solid var(--border); }
    .secondary:hover:not(:disabled) { background: var(--surface-container-highest); }
    .ghost { background: transparent; color: var(--fg-muted); }
    .ghost:hover:not(:disabled) { background: var(--surface-container-high); color: var(--fg-default); }
    .danger { background: var(--status-danger-bg); color: var(--status-danger-fg); }
    .btn-sm { font: var(--type-body-md); padding: var(--space-xs) var(--space-md); }
    .btn-lg { font: var(--type-body-lg); padding: var(--space-md) var(--space-xl); }
  `
})
export class UiButtonComponent {
  @Input() variant: 'primary' | 'secondary' | 'ghost' | 'danger' = 'primary';
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Input() disabled = false;
  @Input() loading = false;
}
