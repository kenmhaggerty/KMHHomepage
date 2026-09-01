export type ThemeMode = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'theme-mode';

export function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'light' || value === 'dark';
}

/**
 * Resolves the active theme from the visitor's stored choice, falling back to
 * whatever the operating system asks for. An explicit choice always wins, so
 * picking a theme keeps it even if the system later flips.
 */
export function resolveThemeMode(stored: unknown, prefersDark: boolean): ThemeMode {
  if (isThemeMode(stored)) {
    return stored;
  }
  return prefersDark ? 'dark' : 'light';
}
