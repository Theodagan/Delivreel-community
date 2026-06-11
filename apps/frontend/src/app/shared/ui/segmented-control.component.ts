import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'ui-segmented-control',
  standalone: true,
  template: `<div class="segments" role="radiogroup">
    @for (opt of options; track opt.value) {
      <button
        role="radio"
        [attr.aria-checked]="selected === opt.value"
        [class.active]="selected === opt.value"
        (click)="select(opt.value)"
      >{{ opt.label }}</button>
    }
  </div>`,
  styles: `
    .segments { display: inline-flex; border-radius: var(--radius-lg);
      background: var(--surface-container-high); padding: 2px; gap: 2px;
    }
    button { border: none; cursor: pointer; background: transparent;
      color: var(--fg-muted); font: var(--type-body-md); border-radius: var(--radius-md);
      padding: var(--space-xs) var(--space-md); transition: background 0.15s, color 0.15s;
    }
    button:hover { background: var(--surface-container); }
    .active { background: var(--bg-card); color: var(--fg-default); box-shadow: var(--shadow-1); }
  `
})
export class UiSegmentedControlComponent {
  @Input() options: { label: string; value: string }[] = [];
  @Input() selected: string = '';
  @Output() selectedChange = new EventEmitter<string>();

  select(value: string) { this.selected = value; this.selectedChange.emit(value); }
}
