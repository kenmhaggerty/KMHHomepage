import { beforeEach, describe, expect, it, vi } from 'vitest';
import { applyViewportMode, initViewportMode } from '../src/scripts/viewportMode';
import { VIEWPORT_STORAGE_KEY } from '../src/utils/viewport';

function setWindowWidth(width: number) {
  Object.defineProperty(window, 'innerWidth', { value: width, configurable: true });
}

function renderToggle() {
  document.body.innerHTML = `
    <div class="viewport-toggle">
      <button data-mode-button="mobile" aria-pressed="false"></button>
      <button data-mode-button="desktop" aria-pressed="false"></button>
    </div>
  `;
}

function button(mode: string): HTMLButtonElement {
  const el = document.querySelector<HTMLButtonElement>(`[data-mode-button="${mode}"]`);
  if (!el) throw new Error(`no ${mode} button`);
  return el;
}

beforeEach(() => {
  localStorage.clear();
  renderToggle();
  setWindowWidth(1024);
  delete document.documentElement.dataset.viewport;
});

describe('applyViewportMode', () => {
  it('sets the html attribute and button states', () => {
    applyViewportMode(document, 'mobile');
    expect(document.documentElement.dataset.viewport).toBe('mobile');
    expect(button('mobile').getAttribute('aria-pressed')).toBe('true');
    expect(button('desktop').getAttribute('aria-pressed')).toBe('false');
  });
});

describe('initViewportMode', () => {
  it('applies desktop by default on large screens', () => {
    initViewportMode(document, window);
    expect(document.documentElement.dataset.viewport).toBe('desktop');
  });

  it('applies a stored mobile preference', () => {
    localStorage.setItem(VIEWPORT_STORAGE_KEY, 'mobile');
    initViewportMode(document, window);
    expect(document.documentElement.dataset.viewport).toBe('mobile');
  });

  it('forces mobile below the breakpoint', () => {
    setWindowWidth(500);
    initViewportMode(document, window);
    expect(document.documentElement.dataset.viewport).toBe('mobile');
  });

  it('switches mode and stores the preference when a toggle is clicked', () => {
    initViewportMode(document, window);
    button('mobile').click();
    expect(document.documentElement.dataset.viewport).toBe('mobile');
    expect(localStorage.getItem(VIEWPORT_STORAGE_KEY)).toBe('mobile');
    button('desktop').click();
    expect(document.documentElement.dataset.viewport).toBe('desktop');
    expect(localStorage.getItem(VIEWPORT_STORAGE_KEY)).toBe('desktop');
  });

  it('ignores toggle clicks on small screens', () => {
    setWindowWidth(500);
    initViewportMode(document, window);
    button('desktop').click();
    expect(document.documentElement.dataset.viewport).toBe('mobile');
    expect(localStorage.getItem(VIEWPORT_STORAGE_KEY)).toBeNull();
  });

  it('re-resolves the mode on resize', () => {
    initViewportMode(document, window);
    expect(document.documentElement.dataset.viewport).toBe('desktop');
    setWindowWidth(500);
    window.dispatchEvent(new Event('resize'));
    expect(document.documentElement.dataset.viewport).toBe('mobile');
    setWindowWidth(1200);
    window.dispatchEvent(new Event('resize'));
    expect(document.documentElement.dataset.viewport).toBe('desktop');
  });

  it('still works when localStorage throws', () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    initViewportMode(document, window);
    expect(document.documentElement.dataset.viewport).toBe('desktop');
    button('mobile').click();
    expect(document.documentElement.dataset.viewport).toBe('mobile');
    getItem.mockRestore();
    setItem.mockRestore();
  });
});
