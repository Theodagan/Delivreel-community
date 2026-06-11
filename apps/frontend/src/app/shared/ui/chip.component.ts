import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'ui-chip',
  standalone: true,
  template: `<span [class.active]="active" (click)="onChipClick()">
    @if (icon) { <span class="chip-icon material-symbols-outlined">{{ icon }}</span> }
    <span class="chip-label"><ng-content></ng-content></span>
    @if (dismissible) {
      <button class="chip-dismiss" (click)="onDismiss($event)" aria-label="Remove">&times;</button>
    }
  </span>`,
  styles: `
    span { display: inline-flex; align-items: center; gap: var(--space-xs);
      padding: var(--space-xs) var(--space-sm); border-radius: var(--radius);
      background: var(--surface-container-high); color: var(--fg-default);
      font: var(--type-body-md); border: 1px solid var(--border);
      cursor: pointer; transition: background 0.15s;
    }
    span:hover { background: var(--surface-container-highest); }
    .active { background: var(--primary-container); color: var(--on-primary-container); border-color: transparent; }
    .chip-icon { font-size: 16px; width: 16px; height: 16px; }
    .chip-label { white-space: nowrap; }
    .chip-dismiss { display: inline-flex; align-items: center; justify-content: center;
      width: 18px; height: 18px; border: none; background: transparent;
      color: var(--fg-muted); cursor: pointer; font-size: 14px; border-radius: 50%; padding: 0;
    }
    .chip-dismiss:hover { background: var(--surface-container); }
  `
})
export class UiChipComponent {
  @Input() active = false;
  @Input() dismissible = false;
  @Input() icon?: string;
  @Output() dismissed = new EventEmitter<void>();
  @Output() chipClick = new EventEmitter<void>();

  onDismiss(event: Event) { event.stopPropagation(); this.dismissed.emit(); }
  onChipClick() { this.chipClick.emit(); }
}
