export type ThemeMode = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'theme-mode';

/**
 * Records what the device's own colour scheme was at the moment a theme was
 * chosen. Comparing it against the current one is what lets a later change of
 * device setting retire the choice -- including a change made while the site
 * was closed, which fires no event to listen for.
 */
export const THEME_SYSTEM_STORAGE_KEY = 'theme-mode-system';

export function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'light' || value === 'dark';
}

export function systemThemeMode(prefersDark: boolean): ThemeMode {
  return prefersDark ? 'dark' : 'light';
}

/**
 * Resolves the active theme. A chosen theme wins over the device, but only for
 * as long as the device stays as it was: once the visitor switches their
 * machine to dark (or back), that is treated as the newer instruction and the
 * earlier choice is dropped.
 *
 * A choice stored without a recorded device setting -- from a visit before this
 * behaviour existed -- is treated the same way, so it gives way to the device
 * once rather than outranking it forever.
 */
export function resolveThemeMode(
  stored: unknown,
  prefersDark: boolean,
  systemAtChoice?: unknown,
): ThemeMode {
  const system = systemThemeMode(prefersDark);
  return isThemeMode(stored) && systemAtChoice === system ? stored : system;
}

/** Whether a stored choice has been outlived by a device change, and so should be cleared. */
export function isStoredChoiceStale(
  stored: unknown,
  prefersDark: boolean,
  systemAtChoice?: unknown,
): boolean {
  return isThemeMode(stored) && systemAtChoice !== systemThemeMode(prefersDark);
}
