import { of } from 'rxjs';

import { SidebarNavComponent } from './sidebar-nav.component';

describe('SidebarNavComponent', () => {
  const makeComponent = () => new SidebarNavComponent({ isAuthenticated$: of(true) } as never);

  it('toggles desktop collapsed state', () => {
    const component = makeComponent();

    component.toggle();

    expect(component.collapsed).toBe(true);

    component.toggle();

    expect(component.collapsed).toBe(false);
  });

  it('toggles mobile drawer state directly', () => {
    const component = makeComponent();

    component.toggleMobile();

    expect(component.mobileOpen).toBe(true);
  });
});
