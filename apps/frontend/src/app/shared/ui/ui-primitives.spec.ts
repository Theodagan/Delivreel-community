import { UiButtonComponent } from './button.component';
import { UiCardComponent } from './card.component';
import { UiBadgeComponent } from './badge.component';
import { UiChipComponent } from './chip.component';
import { UiSegmentedControlComponent } from './segmented-control.component';
import { UiViewToggleComponent } from './view-toggle.component';
import { UiSortControlComponent } from './sort-control.component';
import { UiTabsComponent } from './tabs.component';
import { UiDrawerComponent } from './drawer.component';

describe('UI primitives', () => {
  it('UiButton defaults to primary', () => {
    const c = new UiButtonComponent();
    expect(c.variant).toBe('primary');
  });

  it('UiCard defaults to default', () => {
    const c = new UiCardComponent();
    expect(c.variant).toBe('default');
  });

  it('UiBadge defaults to neutral', () => {
    const c = new UiBadgeComponent();
    expect(c.variant).toBe('neutral');
  });

  it('UiChip emits dismissed', () => {
    const c = new UiChipComponent();
    const spy = jest.fn();
    c.dismissed.subscribe(spy);
    c.onDismiss(new MouseEvent('click'));
    expect(spy).toHaveBeenCalled();
  });

  it('UiSegmentedControl emits selectedChange', () => {
    const c = new UiSegmentedControlComponent();
    const spy = jest.fn();
    c.selectedChange.subscribe(spy);
    c.select('foo');
    expect(spy).toHaveBeenCalledWith('foo');
  });

  it('UiViewToggle defaults mode to grid', () => {
    const c = new UiViewToggleComponent();
    expect(c.mode).toBe('grid');
  });

  it('UiSortControl emits fieldChange', () => {
    const c = new UiSortControlComponent();
    const spy = jest.fn();
    c.fieldChange.subscribe(spy);
    c.fieldChange.emit('createdAt');
    expect(spy).toHaveBeenCalledWith('createdAt');
  });

  it('UiTabs selects tab', () => {
    const c = new UiTabsComponent();
    const spy = jest.fn();
    c.activeTabChange.subscribe(spy);
    c.select('tab1');
    expect(spy).toHaveBeenCalledWith('tab1');
  });

  it('UiDrawer close sets open=false', () => {
    const c = new UiDrawerComponent();
    c.open = true;
    const spy = jest.fn();
    c.openChange.subscribe(spy);
    c.close();
    expect(c.open).toBe(false);
    expect(spy).toHaveBeenCalledWith(false);
  });
});
