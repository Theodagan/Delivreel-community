import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-account-menu',
  standalone: true,
  imports: [RouterModule],
  template: `
    <div class="account-menu">
      <button class="account-trigger" (click)="open = !open" [attr.aria-expanded]="open">
        <span class="material-symbols-outlined">account_circle</span>
        <span class="account-name">{{ user?.name }}</span>
      </button>
      @if (open) {
        <div class="account-dropdown">
          <div class="dropdown-header">{{ user?.name }}<br><small>{{ user?.email }}</small></div>
          @if (isHosted) {
            <a routerLink="/profile" class="dropdown-item">
              <span class="material-symbols-outlined">person</span> Profile
            </a>
          }
          @if (!isHosted) {
            <a routerLink="/settings" class="dropdown-item">
              <span class="material-symbols-outlined">person</span> Account
            </a>
          }
          <hr>
          <button class="dropdown-item danger" (click)="logout()">
            <span class="material-symbols-outlined">logout</span> Logout
          </button>
        </div>
      }
    </div>
    @if (open) {
      <div class="dropdown-backdrop" (click)="open = false"></div>
    }
  `,
  styles: [`
    .account-menu { position: relative; anchor-scope: --account-menu-trigger; }
    .account-trigger { display: flex; align-items: center; gap: var(--space-sm);
      border: 1px solid var(--glass-edge); background: var(--surface-soft);
      cursor: pointer; color: var(--fg-default); font: var(--type-body-md);
      padding: 6px 11px; border-radius: 20px 4px 20px 4px;
      backdrop-filter: blur(12px); transition: box-shadow .14s;
      anchor-name: --account-menu-trigger; }
    .account-trigger:hover { box-shadow: var(--holy-glow); }
    .account-name { max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .account-dropdown { position: absolute; top: 100%; right: 0; margin-top: var(--space-xs);
      min-width: 200px; background: var(--surface); border: 1px solid var(--glass-edge);
      border-radius: 20px 4px 20px 4px; box-shadow: var(--shadow-2); z-index: 1200;
      backdrop-filter: blur(24px) saturate(140%); padding: var(--space-xs) 0; }
    @supports (top: anchor(bottom)) {
      .account-dropdown { position: fixed; position-anchor: --account-menu-trigger;
        top: anchor(bottom); right: anchor(right); margin-top: var(--space-xs);
        position-try-fallbacks: --account-menu-above, --account-menu-below-start, --account-menu-above-start; }
      @position-try --account-menu-above {
        top: auto; bottom: anchor(top); margin-top: 0; margin-bottom: var(--space-xs);
      }
      @position-try --account-menu-below-start {
        right: auto; left: anchor(left);
      }
      @position-try --account-menu-above-start {
        top: auto; right: auto; bottom: anchor(top); left: anchor(left); margin-top: 0; margin-bottom: var(--space-xs);
      }
    }
    .dropdown-header { padding: var(--space-sm) var(--space-md); font: var(--type-body-md); color: var(--fg-default);
      border-bottom: 1px solid var(--glass-edge); margin-bottom: var(--space-xs); }
    .dropdown-header small { color: var(--fg-muted); font: var(--type-body-md); }
    .dropdown-item { display: flex; align-items: center; gap: var(--space-sm); padding: var(--space-sm) var(--space-md);
      color: var(--fg-default); font: var(--type-body-md); text-decoration: none; border: none;
      background: transparent; cursor: pointer; width: 100%; text-align: left; }
    .dropdown-item:hover { background: var(--surface-soft); }
    .dropdown-item .material-symbols-outlined { font-size: 18px; }
    .dropdown-item.danger { color: var(--ui-coral); }
    hr { border: none; border-top: 1px solid var(--glass-edge); margin: var(--space-xs) 0; }
    .dropdown-backdrop { position: fixed; inset: 0; z-index: 1199; }
  `]
})
export class AccountMenuComponent {
  open = false;
  isHosted = (environment.appEnvironment as string) !== 'selfhost';
  user = this.authService.getCurrentUser();

  constructor(private authService: AuthService) {}

  logout() { this.authService.logout(); }
}
