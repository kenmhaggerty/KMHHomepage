import {
  MOBILE_BREAKPOINT,
  VIEWPORT_STORAGE_KEY,
  isViewportMode,
  resolveViewportMode,
  type ViewportMode,
} from '../utils/viewport';

function readStoredMode(win: Window): string | null {
  try {
    return win.localStorage.getItem(VIEWPORT_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStoredMode(win: Window, mode: ViewportMode): void {
  try {
    win.localStorage.setItem(VIEWPORT_STORAGE_KEY, mode);
  } catch {
    /* Private browsing or blocked storage — the mode still applies. */
  }
}

export function applyViewportMode(doc: Document, mode: ViewportMode): void {
  doc.documentElement.dataset.viewport = mode;
  for (const button of doc.querySelectorAll<HTMLButtonElement>('[data-mode-button]')) {
    button.setAttribute('aria-pressed', String(button.dataset.modeButton === mode));
  }
}

/**
 * Wires up the desktop/mobile viewport toggle: applies the stored preference,
 * follows window resizes across the breakpoint, and handles toggle clicks.
 */
export function initViewportMode(doc: Document, win: Window): void {
  const refresh = () => {
    applyViewportMode(doc, resolveViewportMode(win.innerWidth, readStoredMode(win)));
  };

  refresh();
  win.addEventListener('resize', refresh);

  for (const button of doc.querySelectorAll<HTMLButtonElement>('[data-mode-button]')) {
    button.addEventListener('click', () => {
      const mode = button.dataset.modeButton;
      if (!isViewportMode(mode) || win.innerWidth < MOBILE_BREAKPOINT) {
        return;
      }
      writeStoredMode(win, mode);
      applyViewportMode(doc, mode);
    });
  }
}
