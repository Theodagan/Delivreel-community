import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'ui-sort-control',
  standalone: true,
  template: `<select [value]="field" (change)="onChange($event)" [attr.aria-label]="label">
    <option value="" disabled>{{ label }}</option>
    @for (opt of options; track opt.field) {
      <option [value]="opt.field">{{ opt.label }}</option>
    }
  </select>`,
  styles: `
    select { padding: var(--space-xs) var(--space-sm); border: 1px solid var(--border);
      border-radius: var(--radius); background: var(--surface-container);
      color: var(--fg-default); font: var(--type-body-md); cursor: pointer; min-width: 140px;
    }
  `
})
export class UiSortControlComponent {
  @Input() options: { field: string; label: string }[] = [];
  @Input() field: string = '';
  @Input() label = 'Sort by';
  @Output() fieldChange = new EventEmitter<string>();

  onChange(event: Event) {
    const val = (event.target as HTMLSelectElement).value;
    this.field = val;
    this.fieldChange.emit(val);
  }
}
