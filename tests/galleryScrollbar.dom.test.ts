import { beforeEach, describe, expect, it, vi } from 'vitest';
import { initGalleryScrollbars } from '../src/scripts/galleryScrollbar';

interface Sizes {
  trackWidth?: number;
  viewportWidth?: number;
  contentWidth?: number;
  persistent?: boolean;
}

function renderGallery({
  trackWidth = 1000,
  viewportWidth = 500,
  contentWidth = 2000,
  persistent = false,
}: Sizes = {}) {
  document.body.innerHTML = `
    <div data-gallery>
      <div data-gallery-scroll></div>
      <div data-gallery-track${persistent ? '="persistent"' : ''}>
        <div data-gallery-scrubber></div>
      </div>
    </div>
  `;
  const viewport = document.querySelector<HTMLElement>('[data-gallery-scroll]')!;
  const track = document.querySelector<HTMLElement>('[data-gallery-track]')!;
  const scrubber = document.querySelector<HTMLElement>('[data-gallery-scrubber]')!;

  Object.defineProperty(viewport, 'clientWidth', { value: viewportWidth, configurable: true });
  Object.defineProperty(viewport, 'scrollWidth', { value: contentWidth, configurable: true });
  let scrollLeft = 0;
  Object.defineProperty(viewport, 'scrollLeft', {
    configurable: true,
    get: () => scrollLeft,
    set: (value: number) => {
      scrollLeft = value;
      viewport.dispatchEvent(new Event('scroll'));
    },
  });
  Object.defineProperty(track, 'clientWidth', { value: trackWidth, configurable: true });
  Object.defineProperty(scrubber, 'clientWidth', {
    configurable: true,
    get: () => parseFloat(scrubber.style.width) || 0,
  });
  scrubber.setPointerCapture = () => {};
  track.getBoundingClientRect = () =>
    ({ left: 0, right: 1000, top: 0, bottom: 6, width: 1000, height: 6, x: 0, y: 0 }) as DOMRect;

  return { viewport, track, scrubber };
}

function pointerEvent(type: string, init: { pointerId?: number; clientX?: number } = {}): Event {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.assign(event, { pointerId: init.pointerId ?? 1, clientX: init.clientX ?? 0 });
  return event;
}

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('initGalleryScrollbars', () => {
  it('sizes the scrubber from the scroll metrics', () => {
    const { scrubber } = renderGallery();
    initGalleryScrollbars(document, window);
    expect(scrubber.style.width).toBe('250px');
    expect(scrubber.style.transform).toBe('translateX(0px)');
  });

  it('moves the scrubber when the container scrolls', () => {
    const { viewport, scrubber } = renderGallery();
    initGalleryScrollbars(document, window);
    viewport.scrollLeft = 750;
    expect(scrubber.style.transform).toBe('translateX(375px)');
  });

  it('keeps a persistent track when the content fits, filling it', () => {
    const { track, scrubber } = renderGallery({ contentWidth: 400, persistent: true });
    initGalleryScrollbars(document, window);
    expect(track.hidden).toBe(false);
    // Nothing to scroll, so the scrubber spans the whole track.
    expect(scrubber.style.width).toBe('1000px');
  });

  it('still sizes a persistent track normally when the content overflows', () => {
    const { track, scrubber } = renderGallery({ persistent: true });
    initGalleryScrollbars(document, window);
    expect(track.hidden).toBe(false);
    expect(scrubber.style.width).toBe('250px');
  });

  it('leaves a persistent track alone as filtering changes the content width', () => {
    const { viewport, track } = renderGallery({ contentWidth: 400, persistent: true });
    initGalleryScrollbars(document, window);
    expect(track.hidden).toBe(false);

    Object.defineProperty(viewport, 'scrollWidth', { value: 2000, configurable: true });
    document.dispatchEvent(new Event('casestudyfilterschange'));
    expect(track.hidden).toBe(false);

    Object.defineProperty(viewport, 'scrollWidth', { value: 400, configurable: true });
    document.dispatchEvent(new Event('casestudyfilterschange'));
    expect(track.hidden).toBe(false);
  });

  it('hides the track when the content fits', () => {
    const { track } = renderGallery({ contentWidth: 400 });
    initGalleryScrollbars(document, window);
    expect(track.hidden).toBe(true);
  });

  it('hides the track when the content overflows by less than a pixel', () => {
    const { track } = renderGallery({ viewportWidth: 500, contentWidth: 500.5 });
    initGalleryScrollbars(document, window);
    expect(track.hidden).toBe(true);
  });

  it('shows the track when the content overflows', () => {
    const { track } = renderGallery();
    initGalleryScrollbars(document, window);
    expect(track.hidden).toBe(false);
  });

  it('reveals and re-hides the track as filtering changes the content width', () => {
    const { viewport, track } = renderGallery({ contentWidth: 400 });
    initGalleryScrollbars(document, window);
    expect(track.hidden).toBe(true);

    Object.defineProperty(viewport, 'scrollWidth', { value: 2000, configurable: true });
    document.dispatchEvent(new Event('casestudyfilterschange'));
    expect(track.hidden).toBe(false);

    Object.defineProperty(viewport, 'scrollWidth', { value: 400, configurable: true });
    document.dispatchEvent(new Event('casestudyfilterschange'));
    expect(track.hidden).toBe(true);
  });

  it('updates on window resize and filter changes', () => {
    const { viewport, scrubber } = renderGallery();
    initGalleryScrollbars(document, window);
    viewport.scrollLeft = 1500;
    Object.defineProperty(viewport, 'scrollWidth', { value: 3000, configurable: true });
    window.dispatchEvent(new Event('resize'));
    expect(scrubber.style.transform).toBe('translateX(500px)');
    Object.defineProperty(viewport, 'scrollWidth', { value: 2000, configurable: true });
    document.dispatchEvent(new Event('casestudyfilterschange'));
    expect(scrubber.style.transform).toBe('translateX(750px)');
  });

  it('scrolls the container when the scrubber is dragged', () => {
    const { viewport, scrubber } = renderGallery();
    initGalleryScrollbars(document, window);
    scrubber.dispatchEvent(pointerEvent('pointerdown', { pointerId: 7, clientX: 100 }));
    scrubber.dispatchEvent(pointerEvent('pointermove', { pointerId: 7, clientX: 475 }));
    expect(viewport.scrollLeft).toBeCloseTo(750);
    scrubber.dispatchEvent(pointerEvent('pointerup', { pointerId: 7 }));
    // After the drag ends, moves are ignored.
    scrubber.dispatchEvent(pointerEvent('pointermove', { pointerId: 7, clientX: 999 }));
    expect(viewport.scrollLeft).toBeCloseTo(750);
  });

  it('ignores pointer moves from other pointers during a drag', () => {
    const { viewport, scrubber } = renderGallery();
    initGalleryScrollbars(document, window);
    scrubber.dispatchEvent(pointerEvent('pointerdown', { pointerId: 7, clientX: 100 }));
    scrubber.dispatchEvent(pointerEvent('pointermove', { pointerId: 8, clientX: 475 }));
    expect(viewport.scrollLeft).toBe(0);
  });

  it('jumps the scroll position when the track is clicked', () => {
    const { viewport, track } = renderGallery();
    initGalleryScrollbars(document, window);
    track.dispatchEvent(pointerEvent('pointerdown', { clientX: 500 }));
    expect(viewport.scrollLeft).toBeCloseTo(750);
  });

  it('re-measures when a ResizeObserver reports the viewport changing size', () => {
    // jsdom has no ResizeObserver, so the branch that uses one is only reached
    // with a stand-in; this captures the callback and fires it by hand.
    const callbacks: Array<() => void> = [];
    class StubResizeObserver {
      constructor(cb: () => void) {
        callbacks.push(cb);
      }
      observe() {}
      disconnect() {}
    }
    vi.stubGlobal('ResizeObserver', StubResizeObserver);
    try {
      const { viewport, scrubber } = renderGallery();
      initGalleryScrollbars(document, window);
      expect(callbacks).toHaveLength(1);
      expect(scrubber.style.width).toBe('250px');

      Object.defineProperty(viewport, 'scrollWidth', { value: 4000, configurable: true });
      callbacks[0]();

      expect(scrubber.style.width).toBe('125px');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('ignores galleries with missing pieces', () => {
    document.body.innerHTML = '<div data-gallery><div data-gallery-scroll></div></div>';
    expect(() => initGalleryScrollbars(document, window)).not.toThrow();
  });
});
