/** On a panel while the image it is showing has not arrived yet. */
export const PANEL_LOADING_CLASS = 'is-loading';

/**
 * Clears the loading skeleton from each panel once its image has loaded -- the case
 * study cards on the work page, and the gallery thumbnails on a case study.
 *
 * The panels arrive from the server already marked loading, so the skeleton can
 * show before this script has even been fetched; on a slow connection that is
 * exactly when it is wanted, and a script-driven indicator would be late. This
 * only ever takes the mark away (or restores it when the viewport toggle
 * reveals a hero that has not loaded).
 *
 * Only the image actually on show counts. A work page panel carries two heroes,
 * desktop and mobile, and CSS displays one of them; the other is display:none,
 * and a lazy image that is display:none never loads at all, so counting it
 * would leave the spinner turning for good.
 */
export function initPanelSkeletons(doc: Document): void {
  const view = doc.defaultView;
  const panels = [...doc.querySelectorAll<HTMLElement>('.panel')].filter((panel) =>
    panel.querySelector('[data-skeleton]'),
  );
  if (!view || panels.length === 0) {
    return;
  }

  const waitingOn = (panel: HTMLElement) =>
    [...panel.querySelectorAll<HTMLImageElement>('img')].some(
      (image) => view.getComputedStyle(image).display !== 'none' && !image.complete,
    );

  const refresh = (panel: HTMLElement) => {
    panel.classList.toggle(PANEL_LOADING_CLASS, waitingOn(panel));
  };

  const refreshAll = () => panels.forEach(refresh);

  /* `load` does not bubble, so it is caught on the way down instead. `error`
     counts too: a file that will not arrive is not worth waiting on. */
  for (const type of ['load', 'error']) {
    doc.addEventListener(
      type,
      (event) => {
        // Checked by shape rather than with `instanceof`: the node can come
        // from another realm, where instanceof quietly says no.
        const target = event.target as Element | null;
        const panel =
          typeof target?.closest === 'function' ? target.closest<HTMLElement>('.panel') : null;
        if (panel) {
          refresh(panel);
        }
      },
      true,
    );
  }

  /* Switching between the desktop and mobile layouts swaps which hero is
     displayed, and the one revealed may not have loaded yet. */
  if (typeof view.MutationObserver === 'function') {
    new view.MutationObserver(refreshAll).observe(doc.documentElement, {
      attributes: true,
      attributeFilter: ['data-viewport'],
    });
  }

  refreshAll();
}
