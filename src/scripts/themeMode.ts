import { THEME_STORAGE_KEY, isThemeMode, resolveThemeMode, type ThemeMode } from '../utils/theme';

const DARK_QUERY = '(prefers-color-scheme: dark)';

function readStoredTheme(win: Window): string | null {
  try {
    return win.localStorage.getItem(THEME_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStoredTheme(win: Window, mode: ThemeMode): void {
  try {
    win.localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch {
    /* Private browsing or blocked storage — the theme still applies. */
  }
}

function prefersDark(win: Window): boolean {
  return win.matchMedia?.(DARK_QUERY).matches ?? false;
}

export function applyThemeMode(doc: Document, mode: ThemeMode): void {
  doc.documentElement.dataset.theme = mode;
  for (const button of doc.querySelectorAll<HTMLButtonElement>('[data-theme-button]')) {
    button.setAttribute('aria-pressed', String(button.dataset.themeButton === mode));
  }
}

/**
 * Wires up the light/dark toggle: applies the stored choice (or the system
 * preference when there is none), follows the system while the visitor has not
 * chosen, and handles toggle clicks.
 */
export function initThemeMode(doc: Document, win: Window): void {
  const refresh = () => {
    applyThemeMode(doc, resolveThemeMode(readStoredTheme(win), prefersDark(win)));
  };

  refresh();

  // Only meaningful until a choice is stored, at which point resolve ignores it.
  win.matchMedia?.(DARK_QUERY).addEventListener?.('change', refresh);

  for (const button of doc.querySelectorAll<HTMLButtonElement>('[data-theme-button]')) {
    button.addEventListener('click', () => {
      const mode = button.dataset.themeButton;
      if (!isThemeMode(mode)) {
        return;
      }
      writeStoredTheme(win, mode);
      applyThemeMode(doc, mode);
    });
  }
}
