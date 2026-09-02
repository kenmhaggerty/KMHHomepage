import { beforeEach, describe, expect, it } from 'vitest';

/**
 * The two `is:inline` scripts in SiteLayout are the only code that runs before
 * the first paint, and being inline they are outside the module graph the rest
 * of the suite imports -- so they get exercised here by pulling them out of the
 * layout source and running them against a stubbed window. That is what keeps
 * the theme the visitor sees on load, and the toggle state assistive tech
 * reports, from drifting away from the module code that takes over afterwards.
 */
const layoutSources = import.meta.glob<string>('../src/layouts/SiteLayout.astro', {
  query: '?raw',
  import: 'default',
  eager: true,
});
const layout = Object.values(layoutSources)[0];

const inlineScripts = [...layout.matchAll(/<script is:inline>([\s\S]*?)<\/script>/g)].map(
  (match) => match[1],
);
const [preferencesScript, togglePressedScript] = inlineScripts;

function run(source: string): void {
  new Function(source)();
}

interface WindowStub {
  stored?: string | null;
  chosenAgainst?: string | null;
  viewportStored?: string | null;
  dark?: boolean;
  innerWidth?: number;
  storageThrows?: boolean;
  noMatchMedia?: boolean;
}

function stubWindow({
  stored = null,
  chosenAgainst = null,
  viewportStored = null,
  dark = false,
  innerWidth = 1200,
  storageThrows = false,
  noMatchMedia = false,
}: WindowStub): Map<string, string> {
  const store = new Map<string, string>();
  if (stored !== null) store.set('theme-mode', stored);
  if (chosenAgainst !== null) store.set('theme-mode-system', chosenAgainst);
  if (viewportStored !== null) store.set('viewport-mode', viewportStored);

  Object.defineProperty(window, 'innerWidth', { value: innerWidth, configurable: true });
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => {
        if (storageThrows) throw new Error('storage blocked');
        return store.get(key) ?? null;
      },
      setItem: (key: string, value: string) => {
        if (storageThrows) throw new Error('storage blocked');
        store.set(key, value);
      },
      removeItem: (key: string) => {
        if (storageThrows) throw new Error('storage blocked');
        store.delete(key);
      },
    },
  });
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: noMatchMedia
      ? undefined
      : (query: string) => ({
          matches: query.includes('dark') ? dark : false,
          addEventListener: () => {},
        }),
  });
  return store;
}

function renderToolbar(): void {
  document.body.innerHTML = `
    <div class="toolbar">
      <div class="icon-toggle theme-toggle">
        <button data-theme-button="light" aria-pressed="false"></button>
        <button data-theme-button="dark" aria-pressed="false"></button>
      </div>
      <div class="icon-toggle viewport-toggle">
        <button data-mode-button="desktop" aria-pressed="false"></button>
        <button data-mode-button="mobile" aria-pressed="false"></button>
      </div>
    </div>
  `;
}

function pressed(selector: string): string | null {
  return document.querySelector(selector)!.getAttribute('aria-pressed');
}

beforeEach(() => {
  delete document.documentElement.dataset.theme;
  delete document.documentElement.dataset.viewport;
  renderToolbar();
});

describe('the layout has scripts that run before the first paint', () => {
  it('carries both inline scripts, ahead of the body', () => {
    expect(inlineScripts).toHaveLength(2);
    expect(layout.indexOf('<script is:inline>')).toBeLessThan(layout.indexOf('<body>'));
  });
});

describe('pre-paint theme resolution', () => {
  it('takes dark from the system when the visitor has chosen nothing', () => {
    stubWindow({ dark: true });
    run(preferencesScript);
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('takes light from the system when the visitor has chosen nothing', () => {
    stubWindow({ dark: false });
    run(preferencesScript);
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('holds a choice made against the device setting still in force', () => {
    stubWindow({ stored: 'light', chosenAgainst: 'dark', dark: true });
    run(preferencesScript);
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('retires the choice, before paint, once the device setting has changed', () => {
    const store = stubWindow({ stored: 'light', chosenAgainst: 'light', dark: true });
    run(preferencesScript);

    // The point of doing this here rather than in the module code: the very
    // first paint already shows the device's theme, so there is no flash.
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(store.has('theme-mode')).toBe(false);
    expect(store.has('theme-mode-system')).toBe(false);
  });

  it('lets the device win over a choice stored before the device was recorded', () => {
    const store = stubWindow({ stored: 'light', dark: true });
    run(preferencesScript);
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(store.has('theme-mode')).toBe(false);
  });

  it('ignores a stored value that is not a theme', () => {
    stubWindow({ stored: 'sepia', chosenAgainst: 'dark', dark: true });
    run(preferencesScript);
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('does not throw where the window cannot report a colour preference', () => {
    stubWindow({ noMatchMedia: true });
    expect(() => run(preferencesScript)).not.toThrow();
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('still resolves a theme when storage is blocked', () => {
    stubWindow({ dark: true, storageThrows: true });
    expect(() => run(preferencesScript)).not.toThrow();
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('matches what the module code resolves, so nothing changes after load', async () => {
    const { resolveThemeMode } = await import('../src/utils/theme');
    // Every combination, because a disagreement between the inline copy and the
    // module is exactly the flash this script exists to prevent.
    for (const dark of [true, false]) {
      for (const stored of [null, 'light', 'dark', 'sepia']) {
        for (const chosenAgainst of [null, 'light', 'dark']) {
          stubWindow({ stored, chosenAgainst, dark });
          run(preferencesScript);
          expect(document.documentElement.dataset.theme).toBe(
            resolveThemeMode(stored, dark, chosenAgainst ?? undefined),
          );
        }
      }
    }
  });

  it('forces the mobile layout on a narrow window regardless of the stored mode', () => {
    stubWindow({ viewportStored: 'desktop', innerWidth: 500 });
    run(preferencesScript);
    expect(document.documentElement.dataset.viewport).toBe('mobile');
  });
});

describe('pre-paint toggle state', () => {
  it('marks the active theme button pressed without waiting for the bundle', () => {
    stubWindow({ dark: true });
    run(preferencesScript);
    run(togglePressedScript);

    expect(pressed('[data-theme-button="dark"]')).toBe('true');
    expect(pressed('[data-theme-button="light"]')).toBe('false');
  });

  it('marks the active viewport button pressed too', () => {
    stubWindow({ innerWidth: 500 });
    run(preferencesScript);
    run(togglePressedScript);

    expect(pressed('[data-mode-button="mobile"]')).toBe('true');
    expect(pressed('[data-mode-button="desktop"]')).toBe('false');
  });

  it('agrees with the state the module code applies once it loads', async () => {
    const { applyThemeMode } = await import('../src/scripts/themeMode');
    stubWindow({ dark: true });
    run(preferencesScript);
    run(togglePressedScript);
    const beforeHydration = [
      pressed('[data-theme-button="light"]'),
      pressed('[data-theme-button="dark"]'),
    ];

    applyThemeMode(document, 'dark');

    expect([pressed('[data-theme-button="light"]'), pressed('[data-theme-button="dark"]')]).toEqual(
      beforeHydration,
    );
  });
});
