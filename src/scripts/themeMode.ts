import {
  THEME_STORAGE_KEY,
  THEME_SYSTEM_STORAGE_KEY,
  isStoredChoiceStale,
  isThemeMode,
  resolveThemeMode,
  systemThemeMode,
  type ThemeMode,
} from '../utils/theme';

const DARK_QUERY = '(prefers-color-scheme: dark)';

function readStored(win: Window, key: string): string | null {
  try {
    return win.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStoredTheme(win: Window, mode: ThemeMode, system: ThemeMode): void {
  try {
    win.localStorage.setItem(THEME_STORAGE_KEY, mode);
    win.localStorage.setItem(THEME_SYSTEM_STORAGE_KEY, system);
  } catch {
    /* Private browsing or blocked storage — the theme still applies. */
  }
}

function clearStoredTheme(win: Window): void {
  try {
    win.localStorage.removeItem(THEME_STORAGE_KEY);
    win.localStorage.removeItem(THEME_SYSTEM_STORAGE_KEY);
  } catch {
    /* Nothing to clear if storage cannot be reached. */
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
 * Wires up the light/dark toggle: applies the stored choice (or the device's
 * own setting when there is none), retires that choice once the device's
 * setting changes underneath it, and handles toggle clicks.
 */
export function initThemeMode(doc: Document, win: Window): void {
  const refresh = () => {
    const dark = prefersDark(win);
    const stored = readStored(win, THEME_STORAGE_KEY);
    const systemAtChoice = readStored(win, THEME_SYSTEM_STORAGE_KEY);

    // Clearing here rather than just ignoring it keeps storage honest: the next
    // visit reads no choice at all, so there is nothing left to go stale twice.
    if (isStoredChoiceStale(stored, dark, systemAtChoice)) {
      clearStoredTheme(win);
    }

    applyThemeMode(doc, resolveThemeMode(stored, dark, systemAtChoice));
  };

  refresh();

  // Catches a change made while the page is open; the recorded device setting
  // above is what catches one made while the site was closed.
  win.matchMedia?.(DARK_QUERY).addEventListener?.('change', refresh);

  for (const button of doc.querySelectorAll<HTMLButtonElement>('[data-theme-button]')) {
    button.addEventListener('click', () => {
      const mode = button.dataset.themeButton;
      if (!isThemeMode(mode)) {
        return;
      }
      writeStoredTheme(win, mode, systemThemeMode(prefersDark(win)));
      applyThemeMode(doc, mode);
    });
  }
}
