import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslationService, SupportedLanguage } from '../../core/services/translation.service';

@Component({
  selector: 'app-language-switcher',
  standalone: true,
  imports: [CommonModule],
  styles: [`
    .lang-switcher { display: flex; gap: 4px; }
    .lang-btn {
      background: transparent; border: 1px solid var(--glass-edge); border-radius: 6px;
      padding: 4px 10px; cursor: pointer; font: var(--type-label-sm); color: var(--fg-muted);
      transition: background 0.15s, color 0.15s;
    }
    .lang-btn:hover { background: var(--surface-soft); color: var(--fg-default); }
    .lang-btn.active { background: var(--ui-primary); color: #fff; border-color: var(--ui-primary); }
  `],
  template: `
    <div class="lang-switcher">
      <button class="lang-btn" [class.active]="translationService.currentLang === 'en'"
        (click)="switchTo('en')">EN</button>
      <button class="lang-btn" [class.active]="translationService.currentLang === 'fr'"
        (click)="switchTo('fr')">FR</button>
    </div>
  `,
})
export class LanguageSwitcherComponent {
  constructor(public readonly translationService: TranslationService) {}

  switchTo(lang: SupportedLanguage) {
    this.translationService.setLanguage(lang);
  }
}