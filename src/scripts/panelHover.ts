/** Marks the panel currently under the pointer. Mirrors `.panel` in global.css. */
export const HOVERED_CLASS = 'is-hovered';

const HOVERABLE_SELECTOR = '.panel.panel-hoverable';

/**
 * Browsers do not recompute `:hover` while a scroll is still in flight, so a
 * panel sliding under a stationary pointer only lights up once the carousel
 * settles. This tracks the pointer and re-resolves what sits under it on every
 * scroll, marking that panel so the stylesheet can light it up right away.
 *
 * The stylesheet only defers to this once `data-panel-hover` is set, which
 * happens on the first real pointer movement -- so a touch-only or scriptless
 * visit keeps the plain `:hover` rule.
 */
export function initPanelHover(doc: Document): void {
  const root = doc.documentElement;
  let pointerX: number | null = null;
  let pointerY: number | null = null;
  let hovered: Element | null = null;

  const mark = (panel: Element | null) => {
    if (panel === hovered) {
      return;
    }
    hovered?.classList.remove(HOVERED_CLASS);
    panel?.classList.add(HOVERED_CLASS);
    hovered = panel;
  };

  const resolve = () => {
    if (pointerX === null || pointerY === null) {
      mark(null);
      return;
    }
    const under = doc.elementFromPoint(pointerX, pointerY);
    mark(under?.closest(HOVERABLE_SELECTOR) ?? null);
  };

  doc.addEventListener(
    'pointermove',
    (event) => {
      if (event.pointerType !== 'mouse') {
        return;
      }
      pointerX = event.clientX;
      pointerY = event.clientY;
      root.dataset.panelHover = '';
      resolve();
    },
    { passive: true },
  );

  root.addEventListener('pointerleave', () => {
    pointerX = null;
    pointerY = null;
    resolve();
  });

  // `scroll` does not bubble, so capture it to catch every scroller on the way
  // down: the case study carousel and the page column alike. Browsers already
  // hold scroll events to one per frame, so this hit-tests once a frame at
  // most and needs no throttling of its own.
  doc.addEventListener('scroll', resolve, { capture: true, passive: true });
}
