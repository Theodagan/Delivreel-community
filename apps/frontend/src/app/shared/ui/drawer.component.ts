import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'ui-drawer',
  standalone: true,
  template: `<div class="drawer-overlay" [class.open]="open" (click)="close()">
    <div class="drawer-panel" [class.open]="open" [class.right]="side === 'right'" (click)="$event.stopPropagation()">
      @if (title) {<div class="drawer-header">
        <h3>{{ title }}</h3>
        <button class="drawer-close" (click)="close()" aria-label="Close">&times;</button>
      </div>}
      <div class="drawer-body"><ng-content></ng-content></div>
    </div>
  </div>`,
  styles: `
    .drawer-overlay { position: fixed; inset: 0; background: light-dark(rgba(255,255,255,.72), rgba(0,0,0,.5));
      z-index: 1100; opacity: 0; pointer-events: none; transition: opacity 0.25s;
    }
    .drawer-overlay.open { opacity: 1; pointer-events: auto; }
    .drawer-panel { position: fixed; top: 0; bottom: 0; left: 0;
      width: min(400px, 90vw); background: var(--bg-elevated);
      box-shadow: var(--shadow-2); transform: translateX(-100%); backdrop-filter: blur(16px);
      transition: transform 0.25s; display: flex; flex-direction: column; z-index: 1101;
    }
    .drawer-panel.right { left: auto; right: 0; transform: translateX(100%); }
    .drawer-panel.open { transform: translateX(0); }
    .drawer-header { display: flex; align-items: center; justify-content: space-between;
      padding: var(--space-md) var(--space-lg); border-bottom: 1px solid var(--border);
    }
    .drawer-header h3 { font: var(--type-headline-md); margin: 0; }
    .drawer-close { background: transparent; border: none; color: var(--fg-muted);
      font-size: 1.5rem; cursor: pointer; padding: var(--space-xs);
    }
    .drawer-body { flex: 1; overflow-y: auto; padding: var(--space-lg); }
  `
})
export class UiDrawerComponent {
  @Input() open = false;
  @Input() side: 'left' | 'right' = 'left';
  @Input() title?: string;
  @Output() openChange = new EventEmitter<boolean>();

  close() { this.open = false; this.openChange.emit(false); }
}
