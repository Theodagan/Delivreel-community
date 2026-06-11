import { Renderer2, RendererFactory2 } from '@angular/core';

import { ElementHighlighterService } from './element-highlighter.service';

describe('ElementHighlighterService', () => {
  const makeService = () => {
    const renderer: Partial<Renderer2> = {
      setStyle: jest.fn((element: HTMLElement, name: string, value: string) => element.style.setProperty(name, value)),
      addClass: jest.fn((element: HTMLElement, className: string) => element.classList.add(className)),
      removeClass: jest.fn((element: HTMLElement, className: string) => element.classList.remove(className)),
    };
    const rendererFactory = {
      createRenderer: jest.fn().mockReturnValue(renderer),
    } as unknown as RendererFactory2;

    return { service: new ElementHighlighterService(rendererFactory), renderer };
  };

  it('applies highlight styles and class to an element', () => {
    jest.useFakeTimers();
    const originalRaf = window.requestAnimationFrame;
    window.requestAnimationFrame = ((callback: FrameRequestCallback) => {
      setTimeout(() => callback(0), 0);
      return 1;
    }) as never;
    const { service, renderer } = makeService();
    const element = document.createElement('article');
    element.scrollIntoView = jest.fn();

    service.highlightElement(element, { color: 'red', durationMs: 50 });
    jest.runOnlyPendingTimers();

    expect(renderer.setStyle).toHaveBeenCalledWith(element, '--focus-highlight-color', 'red');
    expect(renderer.setStyle).toHaveBeenCalledWith(element, '--focus-highlight-duration', '50ms');
    expect(element.scrollIntoView).toHaveBeenCalledWith({ block: 'center', behavior: 'smooth' });
    expect(element.classList.contains('focus-highlight-element')).toBe(true);

    jest.runOnlyPendingTimers();

    expect(element.classList.contains('focus-highlight-element')).toBe(false);
    window.requestAnimationFrame = originalRaf;
    jest.useRealTimers();
  });
});
