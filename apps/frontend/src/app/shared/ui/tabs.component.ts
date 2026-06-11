import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'ui-tabs',
  standalone: true,
  template: `<nav role="tablist">
    @for (tab of tabs; track tab.id) {
      <button
        role="tab"
        [attr.aria-selected]="activeTab === tab.id"
        [class.active]="activeTab === tab.id"
        (click)="select(tab.id)"
      >{{ tab.label }}</button>
    }
  </nav>`,
  styles: `
    nav { display: flex; gap: 0; border-bottom: 1px solid var(--border); }
    button { border: none; cursor: pointer; background: transparent;
      color: var(--fg-muted); font: var(--type-body-md); padding: var(--space-sm) var(--space-md);
      border-bottom: 2px solid transparent; transition: color 0.15s, border-color 0.15s;
    }
    button:hover { color: var(--fg-default); }
    .active { color: var(--accent); border-bottom-color: var(--accent); }
  `
})
export class UiTabsComponent {
  @Input() tabs: { id: string; label: string }[] = [];
  @Input() activeTab: string = '';
  @Output() activeTabChange = new EventEmitter<string>();

  select(id: string) { this.activeTab = id; this.activeTabChange.emit(id); }
}
