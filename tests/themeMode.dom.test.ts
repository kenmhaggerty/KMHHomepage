import { beforeEach, describe, expect, it } from 'vitest';
import { applyThemeMode, initThemeMode } from '../src/scripts/themeMode';
import { THEME_STORAGE_KEY, THEME_SYSTEM_STORAGE_KEY } from '../src/utils/theme';

interface FakeWin {
  win: Window;
  store: Map<string, string>;
  setSystemDark: (dark: boolean) => void;
}

/**
 * The theme functions take the window, so storage and the media query are
 * stubbed rather than relying on the test environment's own. Storage is a real
 * map here, not a write log, because the retirement behaviour is about what is
 * left in storage afterwards as much as what gets written.
 */
function makeWindow({
  stored = null as string | null,
  chosenAgainst = null as string | null,
  dark = false,
  throws = false,
}): FakeWin {
  const store = new Map<string, string>();
  if (stored !== null) store.set(THEME_STORAGE_KEY, stored);
  if (chosenAgainst !== null) store.set(THEME_SYSTEM_STORAGE_KEY, chosenAgainst);

  const changeListeners: Array<() => void> = [];
  let systemDark = dark;
  const win = {
    localStorage: {
      getItem: (key: string) => {
        if (throws) throw new Error('storage blocked');
        return store.get(key) ?? null;
      },
      setItem: (key: string, value: string) => {
        if (throws) throw new Error('storage blocked');
        store.set(key, value);
      },
      removeItem: (key: string) => {
        if (throws) throw new Error('storage blocked');
        store.delete(key);
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
    store,
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
  it('follows the device preference when nothing is stored', () => {
    const { win } = makeWindow({ dark: true });
    initThemeMode(document, win);
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(button('dark').getAttribute('aria-pressed')).toBe('true');
  });

  it('prefers a choice made against the device setting still in force', () => {
    const { win } = makeWindow({ stored: 'light', chosenAgainst: 'dark', dark: true });
    initThemeMode(document, win);
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('records the device setting alongside a click, so the choice can expire', () => {
    const { win, store } = makeWindow({ dark: false });
    initThemeMode(document, win);

    button('dark').click();

    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(store.get(THEME_STORAGE_KEY)).toBe('dark');
    expect(store.get(THEME_SYSTEM_STORAGE_KEY)).toBe('light');
  });

  it('drops the choice and follows the device when it changes while the page is open', () => {
    const { win, store, setSystemDark } = makeWindow({ dark: false });
    initThemeMode(document, win);
    button('dark').click();
    expect(store.get(THEME_STORAGE_KEY)).toBe('dark');

    // The visitor switches the device itself to dark. Their earlier click said
    // the same thing, but the device is now the newer instruction either way.
    setSystemDark(true);

    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(store.has(THEME_STORAGE_KEY)).toBe(false);
    expect(store.has(THEME_SYSTEM_STORAGE_KEY)).toBe(false);

    // With nothing stored, the site now tracks the device both ways.
    setSystemDark(false);
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('drops a choice made against a device setting that changed while the site was closed', () => {
    // Chose light back when the device was light; the device is dark now, and
    // no change event ever fired for it.
    const { win, store } = makeWindow({ stored: 'light', chosenAgainst: 'light', dark: true });
    initThemeMode(document, win);

    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(store.has(THEME_STORAGE_KEY)).toBe(false);
  });

  it('lets the device win over a choice stored before the device was recorded', () => {
    const { win, store } = makeWindow({ stored: 'light', dark: true });
    initThemeMode(document, win);

    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(store.has(THEME_STORAGE_KEY)).toBe(false);
  });

  it('keeps honouring a fresh choice made after the device changed', () => {
    const { win, setSystemDark } = makeWindow({ dark: false });
    initThemeMode(document, win);

    setSystemDark(true);
    expect(document.documentElement.dataset.theme).toBe('dark');

    // Choosing light now is a choice against a dark device, so it holds.
    button('light').click();
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('settles on light where the window cannot report a colour preference', () => {
    // matchMedia is absent in some embedded webviews; the optional calls in
    // themeMode are what keep this from throwing.
    const win = {
      localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    } as unknown as Window;

    expect(() => initThemeMode(document, win)).not.toThrow();
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('ignores a toggle button whose value is not a theme', () => {
    const { win, store } = makeWindow({ dark: false });
    document.body.insertAdjacentHTML(
      'beforeend',
      '<button data-theme-button="sepia" aria-pressed="false"></button>',
    );
    initThemeMode(document, win);
    expect(document.documentElement.dataset.theme).toBe('light');

    document.querySelector<HTMLButtonElement>('[data-theme-button="sepia"]')!.click();

    expect(document.documentElement.dataset.theme).toBe('light');
    expect(store.size).toBe(0);
  });

  it('still applies a theme when storage is blocked', () => {
    const { win } = makeWindow({ dark: true, throws: true });
    expect(() => initThemeMode(document, win)).not.toThrow();
    expect(document.documentElement.dataset.theme).toBe('dark');

    expect(() => button('light').click()).not.toThrow();
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('still applies the device theme when clearing a stale choice fails', () => {
    // Reads have to succeed so the choice is actually recognised as stale --
    // makeWindow's `throws` option fails every call, including the reads that
    // decide staleness, which would never reach the clear at all.
    const store = new Map([
      [THEME_STORAGE_KEY, 'light'],
      [THEME_SYSTEM_STORAGE_KEY, 'light'],
    ]);
    const win = {
      localStorage: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => store.set(key, value),
        removeItem: () => {
          throw new Error('storage blocked');
        },
      },
      matchMedia: () => ({ matches: true, addEventListener: () => {} }),
    } as unknown as Window;

    expect(() => initThemeMode(document, win)).not.toThrow();
    // The stored choice was made against a light device, which is now dark --
    // stale, so the device wins even though the clear itself failed.
    expect(document.documentElement.dataset.theme).toBe('dark');
  });
});
