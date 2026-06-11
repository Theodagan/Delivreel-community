import { Injectable, Renderer2, RendererFactory2 } from '@angular/core';

export interface HighlightElementOptions {
  color?: string;
  durationMs?: number;
  scroll?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ElementHighlighterService {
  private readonly renderer: Renderer2;
  private readonly timers = new WeakMap<HTMLElement, ReturnType<typeof setTimeout>>();

  constructor(rendererFactory: RendererFactory2) {
    this.renderer = rendererFactory.createRenderer(null, null);
  }

  highlightElement(element: HTMLElement, options: HighlightElementOptions = {}) {
    const durationMs = options.durationMs ?? 1400;
    const color = options.color ?? 'var(--ui-primary)';
    const existingTimer = this.timers.get(element);

    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    this.renderer.setStyle(element, '--focus-highlight-color', color);
    this.renderer.setStyle(element, '--focus-highlight-duration', `${durationMs}ms`);

    if (options.scroll ?? true) {
      element.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }

    this.renderer.removeClass(element, 'focus-highlight-element');
    this.runAfterPaint(() => {
      this.renderer.addClass(element, 'focus-highlight-element');
      const timer = setTimeout(() => {
        this.renderer.removeClass(element, 'focus-highlight-element');
        this.timers.delete(element);
      }, durationMs);
      this.timers.set(element, timer);
    });
  }

  private runAfterPaint(callback: () => void) {
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => callback());
      return;
    }

    setTimeout(callback, 0);
  }
}
