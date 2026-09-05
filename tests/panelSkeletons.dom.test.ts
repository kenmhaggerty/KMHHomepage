import { describe, expect, it } from 'vitest';
import { PANEL_LOADING_CLASS, initPanelSkeletons } from '../src/scripts/panelSkeletons';

/**
 * A fresh document per test, from an iframe rather than createHTMLDocument, so
 * it has the defaultView the script reads computed styles through.
 */
function renderPage(bodyHtml: string) {
  const frame = document.createElement('iframe');
  document.body.appendChild(frame);
  const doc = frame.contentDocument!;
  doc.body.innerHTML = bodyHtml;
  return { doc, panels: [...doc.querySelectorAll<HTMLElement>('.panel')] };
}

/** jsdom never loads images, so `complete` is set by hand. */
function setComplete(image: HTMLImageElement, complete: boolean): void {
  Object.defineProperty(image, 'complete', { value: complete, configurable: true });
}

function galleryPanel(complete: boolean) {
  const { doc, panels } = renderPage(`
    <a class="panel" data-lightbox-open>
      <img alt="" />
      <span class="spinner skeleton" data-skeleton aria-hidden="true"></span>
    </a>
  `);
  setComplete(doc.querySelector('img')!, complete);
  return { doc, panel: panels[0], image: doc.querySelector('img')! };
}

/** A work page panel: two heroes, one of them hidden by the layout. */
function heroPanel({ desktopComplete = false, mobileComplete = false, viewport = 'desktop' } = {}) {
  const { doc, panels } = renderPage(`
    <a class="panel panel-hoverable">
      <img class="hero-desktop" alt="" ${viewport === 'mobile' ? 'style="display: none"' : ''} />
      <img class="hero-mobile" alt="" ${viewport === 'desktop' ? 'style="display: none"' : ''} />
      <span class="spinner skeleton" data-skeleton aria-hidden="true"></span>
      <span class="panel-overlay"></span>
    </a>
  `);
  doc.documentElement.dataset.viewport = viewport;
  setComplete(doc.querySelector('.hero-desktop')!, desktopComplete);
  setComplete(doc.querySelector('.hero-mobile')!, mobileComplete);
  return { doc, panel: panels[0] };
}

const waiting = (panel: HTMLElement) => panel.classList.contains(PANEL_LOADING_CLASS);

describe('initPanelSkeletons', () => {
  it('clears a panel that arrived marked loading once its image is already in', () => {
    // The HTML marks every panel loading up front so the ring can show before
    // the script is fetched; for a cached picture the script then has to take
    // it straight back off.
    const { doc, panels } = renderPage(`
      <a class="panel is-loading"><span data-skeleton></span><img alt="" /></a>
    `);
    setComplete(doc.querySelector('img')!, true);
    initPanelSkeletons(doc);
    expect(waiting(panels[0])).toBe(false);
  });

  it('leaves a panel that arrived marked loading alone while its image is still coming', () => {
    const { doc, panels } = renderPage(`
      <a class="panel is-loading"><span data-skeleton></span><img alt="" /></a>
    `);
    setComplete(doc.querySelector('img')!, false);
    initPanelSkeletons(doc);
    expect(waiting(panels[0])).toBe(true);
  });

  it('marks a panel as waiting while its image has not arrived', () => {
    const { doc, panel } = galleryPanel(false);
    initPanelSkeletons(doc);
    expect(waiting(panel)).toBe(true);
  });

  it('shows nothing for an image already in cache', () => {
    // `complete` is true straight away for a cached file, so a panel that has
    // nothing to wait for never flashes a spinner.
    const { doc, panel } = galleryPanel(true);
    initPanelSkeletons(doc);
    expect(waiting(panel)).toBe(false);
  });

  it('stops waiting once the image loads', () => {
    const { doc, panel, image } = galleryPanel(false);
    initPanelSkeletons(doc);
    expect(waiting(panel)).toBe(true);

    setComplete(image, true);
    // `load` does not bubble; the script listens on the way down instead.
    image.dispatchEvent(new doc.defaultView!.Event('load'));

    expect(waiting(panel)).toBe(false);
  });

  it('stops waiting on an image that fails', () => {
    const { doc, panel, image } = galleryPanel(false);
    initPanelSkeletons(doc);

    setComplete(image, true);
    image.dispatchEvent(new doc.defaultView!.Event('error'));

    expect(waiting(panel)).toBe(false);
  });

  it('ignores the hero the layout is not showing', () => {
    // The mobile hero is display:none on desktop, and a lazy image that is
    // display:none never loads -- counting it would spin for ever.
    const { doc, panel } = heroPanel({ desktopComplete: true, mobileComplete: false });
    initPanelSkeletons(doc);
    expect(waiting(panel)).toBe(false);
  });

  it('waits on the hero the layout is showing', () => {
    const { doc, panel } = heroPanel({ desktopComplete: false, mobileComplete: true });
    initPanelSkeletons(doc);
    expect(waiting(panel)).toBe(true);
  });

  it('re-checks when the viewport toggle swaps which hero is on show', async () => {
    const { doc, panel } = heroPanel({ desktopComplete: true, mobileComplete: false });
    initPanelSkeletons(doc);
    expect(waiting(panel)).toBe(false);

    // Toggling to the mobile layout reveals a hero that never loaded.
    doc.querySelector<HTMLElement>('.hero-desktop')!.style.display = 'none';
    doc.querySelector<HTMLElement>('.hero-mobile')!.style.display = '';
    doc.documentElement.dataset.viewport = 'mobile';
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(waiting(panel)).toBe(true);
  });

  it('keeps each panel on its own clock', () => {
    const { doc, panels } = renderPage(`
      <a class="panel"><img alt="" /><span data-skeleton></span></a>
      <a class="panel"><img alt="" /><span data-skeleton></span></a>
    `);
    const [first, second] = [...doc.querySelectorAll('img')] as HTMLImageElement[];
    setComplete(first, true);
    setComplete(second, false);
    initPanelSkeletons(doc);

    expect(waiting(panels[0])).toBe(false);
    expect(waiting(panels[1])).toBe(true);
  });

  it('leaves panels without a skeleton alone', () => {
    const { doc, panels } = renderPage(`<a class="panel"><img alt="" /></a>`);
    setComplete(doc.querySelector('img')!, false);
    expect(() => initPanelSkeletons(doc)).not.toThrow();
    expect(waiting(panels[0])).toBe(false);
  });

  it('does nothing on a page with no panels', () => {
    const { doc } = renderPage('<p>No panels here</p>');
    expect(() => initPanelSkeletons(doc)).not.toThrow();
  });

  it('ignores a load event whose target has no closest method, such as the document itself', () => {
    // `load` is caught on the way down at the document, so the target is
    // whatever fired it -- not necessarily an element with `closest`.
    const { doc, panel } = galleryPanel(false);
    initPanelSkeletons(doc);

    expect(() => doc.dispatchEvent(new doc.defaultView!.Event('load'))).not.toThrow();
    expect(waiting(panel)).toBe(true);
  });
});
