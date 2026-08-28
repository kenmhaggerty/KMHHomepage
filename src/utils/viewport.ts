export type ViewportMode = 'desktop' | 'mobile';

/** Below this window width the mobile layout is always used. */
export const MOBILE_BREAKPOINT = 768;

export const VIEWPORT_STORAGE_KEY = 'viewport-mode';

export function isViewportMode(value: unknown): value is ViewportMode {
  return value === 'desktop' || value === 'mobile';
}

/**
 * Resolves the active viewport mode from the window width and the visitor's
 * stored preference. Small screens are always "mobile"; large screens honor
 * the stored preference and default to "desktop".
 */
export function resolveViewportMode(windowWidth: number, stored: unknown): ViewportMode {
  if (windowWidth < MOBILE_BREAKPOINT) {
    return 'mobile';
  }
  return stored === 'mobile' ? 'mobile' : 'desktop';
}
