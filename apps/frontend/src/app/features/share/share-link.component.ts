import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { MagicLinkService } from '../../core/services/magic-link.service';

@Component({
  selector: 'app-share-link',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="share-page">
      @if (error) {
        <section class="share-card"><h1>Link unavailable</h1><p>{{ error }}</p></section>
      } @else {
        <section class="share-card"><h1>Opening secure link</h1><p>Checking access...</p></section>
      }
    </div>
  `,
  styles: [`
    .share-page { min-height: 100vh; display: grid; place-items: center; padding: 24px; background: var(--bg-app); }
    .share-card { max-width: 420px; padding: 24px; border: 1px solid var(--border); border-radius: var(--radius-lg); background: var(--bg-card); box-shadow: var(--shadow-1); }
    h1 { font: var(--type-headline-md); margin-bottom: 8px; }
    p { color: var(--fg-muted); }
  `],
})
export class ShareLinkComponent implements OnInit {
  error = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private magicLinkService: MagicLinkService,
  ) {}

  ngOnInit() {
    const token = this.route.snapshot.paramMap.get('token');
    if (!token) {
      this.error = 'Missing magic link token.';
      return;
    }

    this.magicLinkService.resolve(token).subscribe({
      next: (response) => this.router.navigateByUrl(response.target.route, { replaceUrl: true }),
      error: (error) => {
        this.magicLinkService.clear();
        this.error = error?.error?.message || 'This link is invalid, expired, or revoked.';
      },
    });
  }
}
