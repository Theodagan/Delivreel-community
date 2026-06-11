import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';

export type SupportedLanguage = 'en' | 'fr';

const STORAGE_KEY = 'delivreel.lang';

@Injectable({ providedIn: 'root' })
export class TranslationService {
  private translations = new Map<string, string>();
  private currentLangSubject = new BehaviorSubject<SupportedLanguage>('en');
  public currentLang$ = this.currentLangSubject.asObservable();

  constructor(private http: HttpClient) {
    const saved = localStorage.getItem(STORAGE_KEY) as SupportedLanguage | null;
    if (saved === 'en' || saved === 'fr') {
      this.setLanguage(saved);
    }
  }

  get currentLang(): SupportedLanguage {
    return this.currentLangSubject.value;
  }

  setLanguage(lang: SupportedLanguage): void {
    this.http.get<Record<string, string>>(`/assets/i18n/${lang}.json`).subscribe({
      next: (data) => {
        this.translations.clear();
        this.flattenTranslations(data, '');
        this.currentLangSubject.next(lang);
        localStorage.setItem(STORAGE_KEY, lang);
      },
      error: (error) => {
        console.error(`Failed to load translations for ${lang}`, error);
      },
    });
  }

  translate(key: string, fallback?: string): string {
    return this.translations.get(key) ?? fallback ?? key;
  }

  private flattenTranslations(obj: Record<string, unknown>, prefix: string): void {
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (typeof value === 'string') {
        this.translations.set(fullKey, value);
      } else if (typeof value === 'object' && value !== null) {
        this.flattenTranslations(value as Record<string, unknown>, fullKey);
      }
    }
  }
}