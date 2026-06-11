import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'ui-view-toggle',
  standalone: true,
  template: `<div class="toggle" role="radiogroup" [attr.aria-label]="label">
    <button role="radio" [attr.aria-checked]="mode === 'grid'" [class.active]="mode === 'grid'" (click)="mode = 'grid'; modeChange.emit('grid')" title="Grid view">
      <span class="material-symbols-outlined">grid_view</span>
    </button>
    <button role="radio" [attr.aria-checked]="mode === 'list'" [class.active]="mode === 'list'" (click)="mode = 'list'; modeChange.emit('list')" title="List view">
      <span class="material-symbols-outlined">view_list</span>
    </button>
  </div>`,
  styles: `
    .toggle { display: inline-flex; border-radius: var(--radius);
      background: var(--surface-container-high); padding: 2px; gap: 2px;
    }
    button { display: inline-flex; align-items: center; justify-content: center;
      border: none; cursor: pointer; background: transparent;
      color: var(--fg-muted); border-radius: var(--radius-sm);
      width: 32px; height: 32px; transition: background 0.15s, color 0.15s;
    }
    button:hover { background: var(--surface-container); }
    .active { background: var(--bg-card); color: var(--fg-default); box-shadow: var(--shadow-1); }
    .material-symbols-outlined { font-size: 18px; }
  `
})
export class UiViewToggleComponent {
  @Input() mode: 'grid' | 'list' = 'grid';
  @Input() label = 'View mode';
  @Output() modeChange = new EventEmitter<'grid' | 'list'>();
}
