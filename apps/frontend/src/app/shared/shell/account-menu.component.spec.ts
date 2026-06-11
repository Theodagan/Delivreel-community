import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { AccountMenuComponent } from './account-menu.component';
import { AuthService, User } from '../../core/services/auth.service';

describe('AccountMenuComponent', () => {
  const mockUser: User = { id: 1, email: 'test@example.com', name: 'Test User', role: 'user' };
  const mockAuthService = {
    getCurrentUser: jest.fn().mockReturnValue(mockUser),
    logout: jest.fn(),
  };

  async function setup() {
    await TestBed.configureTestingModule({
      imports: [AccountMenuComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(AccountMenuComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('does not render dropdown or backdrop when closed', async () => {
    const fixture = await setup();
    const el: HTMLElement = fixture.nativeElement;

    expect(el.querySelector('.account-dropdown')).toBeNull();
    expect(el.querySelector('.dropdown-backdrop')).toBeNull();
    expect(el.querySelector('.account-trigger')?.getAttribute('aria-expanded')).toBe('false');
  });

  it('renders dropdown and backdrop on click and sets aria-expanded to true', async () => {
    const fixture = await setup();
    const el: HTMLElement = fixture.nativeElement;

    const trigger = el.querySelector('.account-trigger') as HTMLButtonElement;
    expect(trigger).not.toBeNull();

    trigger.click();
    fixture.detectChanges();

    expect(el.querySelector('.account-dropdown')).not.toBeNull();
    expect(el.querySelector('.dropdown-backdrop')).not.toBeNull();
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
  });

  it('hides dropdown when backdrop is clicked', async () => {
    const fixture = await setup();
    const el: HTMLElement = fixture.nativeElement;

    const trigger = el.querySelector('.account-trigger') as HTMLButtonElement;
    trigger.click();
    fixture.detectChanges();

    const backdrop = el.querySelector('.dropdown-backdrop') as HTMLDivElement;
    expect(backdrop).not.toBeNull();

    backdrop.click();
    fixture.detectChanges();

    expect(el.querySelector('.account-dropdown')).toBeNull();
    expect(el.querySelector('.dropdown-backdrop')).toBeNull();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('anchors the dropdown to the account trigger', () => {
    const styles = readFileSync(join(__dirname, 'account-menu.component.ts'), 'utf8');

    expect(styles).toContain('anchor-scope: --account-menu-trigger');
    expect(styles).toContain('anchor-name: --account-menu-trigger');
    expect(styles).toContain('position-anchor: --account-menu-trigger');
    expect(styles).toContain('position: fixed');
    expect(styles).toContain('top: anchor(bottom)');
    expect(styles).toContain('right: anchor(right)');
    expect(styles).toContain('@position-try --account-menu-above');
  });
});
