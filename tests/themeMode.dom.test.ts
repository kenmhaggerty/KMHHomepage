import { beforeEach, describe, expect, it } from 'vitest';
import { applyThemeMode, initThemeMode } from '../src/scripts/themeMode';
import { THEME_STORAGE_KEY } from '../src/utils/theme';

interface FakeWin {
  win: Window;
  written: Array<[string, string]>;
  setSystemDark: (dark: boolean) => void;
}

/**
 * The theme functions take the window, so storage and the media query are
 * stubbed rather than relying on the test environment's own.
 */
function makeWindow({ stored = null as string | null, dark = false, throws = false }): FakeWin {
  const written: Array<[string, string]> = [];
  const changeListeners: Array<() => void> = [];
  let systemDark = dark;
  const win = {
    localStorage: {
      getItem: () => {
        if (throws) throw new Error('storage blocked');
        return stored;
      },
      setItem: (key: string, value: string) => {
        if (throws) throw new Error('storage blocked');
        written.push([key, value]);
      },
    },
    matchMedia: () => ({
      get matches() {
        return systemDark;
      },
      addEventListener: (_type: string, cb: () => void) => changeListeners.push(cb),
    }),
  } as unknown as Window;
  return {
    win,
    written,
    setSystemDark: (next: boolean) => {
      systemDark = next;
      changeListeners.forEach((cb) => cb());
    },
  };
}

function renderToggle() {
  document.body.innerHTML = `
    <div class="icon-toggle theme-toggle">
      <button data-theme-button="light" aria-pressed="false"></button>
      <button data-theme-button="dark" aria-pressed="false"></button>
    </div>
  `;
}

function button(mode: string): HTMLButtonElement {
  const el = document.querySelector<HTMLButtonElement>(`[data-theme-button="${mode}"]`);
  if (!el) throw new Error(`no ${mode} button`);
  return el;
}

beforeEach(() => {
  renderToggle();
  delete document.documentElement.dataset.theme;
});

describe('applyThemeMode', () => {
  it('sets the html attribute and the button states', () => {
    applyThemeMode(document, 'dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(button('dark').getAttribute('aria-pressed')).toBe('true');
    expect(button('light').getAttribute('aria-pressed')).toBe('false');
  });
});

describe('initThemeMode', () => {
  it('follows the system preference when nothing is stored', () => {
    const { win } = makeWindow({ dark: true });
    initThemeMode(document, win);
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(button('dark').getAttribute('aria-pressed')).toBe('true');
  });

  it('prefers a stored choice over the system', () => {
    const { win } = makeWindow({ stored: 'light', dark: true });
    initThemeMode(document, win);
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('stores and applies the theme when a button is clicked', () => {
    const { win, written } = makeWindow({ dark: false });
    initThemeMode(document, win);
    expect(document.documentElement.dataset.theme).toBe('light');

    button('dark').click();

    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(written).toEqual([[THEME_STORAGE_KEY, 'dark']]);
  });

  it('follows the system flipping to dark while nothing is stored', () => {
    const { win, setSystemDark } = makeWindow({ dark: false });
    initThemeMode(document, win);
    expect(document.documentElement.dataset.theme).toBe('light');

    setSystemDark(true);

    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(button('dark').getAttribute('aria-pressed')).toBe('true');
  });

  it('holds a stored choice when the system flips underneath it', () => {
    const { win, setSystemDark } = makeWindow({ stored: 'light', dark: false });
    initThemeMode(document, win);

    setSystemDark(true);

    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('still applies a theme when storage is blocked', () => {
    const { win } = makeWindow({ dark: true, throws: true });
    expect(() => initThemeMode(document, win)).not.toThrow();
    expect(document.documentElement.dataset.theme).toBe('dark');

    expect(() => button('light').click()).not.toThrow();
    expect(document.documentElement.dataset.theme).toBe('light');
  });
});
