import { Component, Output, EventEmitter, Input } from '@angular/core';
import { AccountMenuComponent } from './account-menu.component';
import { LanguageSwitcherComponent } from '../ui/language-switcher.component';

@Component({
  selector: 'app-top-bar',
  standalone: true,
  imports: [AccountMenuComponent, LanguageSwitcherComponent],
  template: `
    <header class="top-bar">
      <button class="hamburger" (click)="menuToggle.emit()" aria-label="Open menu">
        <span class="material-symbols-outlined">menu</span>
      </button>
      <div class="top-bar-search">
        <span class="material-symbols-outlined">search</span>
        <input type="text" placeholder="Search..." disabled />
      </div>
      <div class="top-bar-actions">
        <app-language-switcher></app-language-switcher>
        <button class="icon-btn" aria-label="Notifications" disabled>
          <span class="material-symbols-outlined">notifications</span>
        </button>
        <app-account-menu></app-account-menu>
      </div>
    </header>
  `,
  styles: `
    .top-bar { display: flex; align-items: center; gap: var(--space-md); position: relative; z-index: 1200;
      height: 56px; padding: 10px 14px; margin-bottom: 22px;
      border: 1px solid var(--glass-edge);
      background: light-dark(rgba(255,255,255,.36), rgba(255,255,255,.04)); }
    .top-bar::before { content: ""; position: absolute; inset: 0; border-radius: inherit;
      backdrop-filter: blur(18px) saturate(125%); z-index: -1; }
    .hamburger { display: flex; align-items: center; justify-content: center;
      border: 1px solid var(--glass-edge); background: var(--surface-soft); color: var(--fg-default); cursor: pointer;
      width: 34px; height: 34px; border-radius: 16px 3px 16px 3px;
      transition: box-shadow .14s; }
    .hamburger:hover { box-shadow: var(--holy-glow); }
    @media (min-width: 768px) { .hamburger { display: none; } }
    .top-bar-search { display: flex; align-items: center; gap: var(--space-xs);
      flex: 1; max-width: 320px; background: var(--surface-soft);
      border: 1px solid var(--glass-edge); border-radius: 20px 4px 20px 4px;
      padding: var(--space-xs) var(--space-sm); backdrop-filter: blur(12px); }
    .top-bar-search .material-symbols-outlined { font-size: 18px; color: var(--fg-muted); }
    .top-bar-search input { border: none; background: transparent; color: var(--fg-default);
      font: var(--type-body-md); width: 100%; outline: none; }
    .top-bar-actions { display: flex; align-items: center; gap: var(--space-xs); margin-left: auto; position: relative; }
    .icon-btn { display: flex; align-items: center; justify-content: center;
      border: 1px solid var(--glass-edge); background: var(--surface-soft); color: var(--fg-muted); cursor: pointer;
      width: 34px; height: 34px; border-radius: 16px 3px 16px 3px;
      transition: box-shadow .14s; }
    .icon-btn:hover { box-shadow: var(--holy-glow); color: var(--fg-default); }
  `
})
export class TopBarComponent {
  @Input() showMenuToggle = true;
  @Output() menuToggle = new EventEmitter<void>();
}
