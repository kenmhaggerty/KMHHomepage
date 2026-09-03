import { describe, expect, it } from 'vitest';
import { LIGHTBOX_OPEN_CLASS, initImageLightbox } from '../src/scripts/imageLightbox';

const FULL_RES = '/_astro/mockup-';

/**
 * jsdom implements neither showModal nor close, so the dialog gets a stand-in
 * that mirrors what a browser does: flip the open state, and fire `close` on
 * the way out. The real behaviour -- Escape, the focus trap, focus returning to
 * the link afterwards -- was checked against Chrome instead, since none of it
 * can exist here.
 */
function stubDialog(dialog: HTMLDialogElement): void {
  dialog.showModal = () => dialog.setAttribute('open', '');
  dialog.close = () => {
    dialog.removeAttribute('open');
    dialog.dispatchEvent(new Event('close'));
  };
}

/*
 * A fresh document per test rather than the shared global one: initImageLightbox
 * delegates from the document, and handlers left behind by earlier tests would
 * otherwise still be listening and swallowing clicks. It comes from an iframe
 * rather than createHTMLDocument because that gives it a defaultView.
 */
function renderPage({ withDialog = true, dialogSupported = true, images = 1 } = {}) {
  const frame = document.createElement('iframe');
  document.body.appendChild(frame);
  const doc = frame.contentDocument!;
  const thumbnails = Array.from(
    { length: images },
    (_, i) => `
      <a
        class="panel"
        href="${FULL_RES}${i + 1}.png"
        data-lightbox-open
        data-lightbox-alt="Mockup #${i + 1}"
        target="_blank"
        rel="noopener noreferrer"
      ><img src="/_astro/preview-${i + 1}.png" alt="Mockup #${i + 1}" /></a>`,
  ).join('');
  doc.body.innerHTML = `
    <div data-gallery>${thumbnails}</div>
    <a class="elsewhere" href="/work/gfm/">A link that is not a gallery image</a>
    ${
      withDialog
        ? `<dialog class="lightbox" data-lightbox aria-label="Image viewer">
             <button type="button" data-lightbox-close aria-label="Close image viewer"></button>
             <img class="lightbox-image" data-lightbox-image alt="" />
           </dialog>`
        : ''
    }
  `;
  const dialog = doc.querySelector<HTMLDialogElement>('[data-lightbox]');
  if (dialog && dialogSupported) {
    stubDialog(dialog);
  }
  return {
    doc,
    triggers: [...doc.querySelectorAll<HTMLAnchorElement>('a[data-lightbox-open]')],
    trigger: doc.querySelector<HTMLAnchorElement>('a[data-lightbox-open]')!,
    other: doc.querySelector<HTMLAnchorElement>('a.elsewhere')!,
    dialog,
    image: doc.querySelector<HTMLImageElement>('[data-lightbox-image]'),
    closeButton: doc.querySelector<HTMLButtonElement>('[data-lightbox-close]'),
  };
}

/*
 * Events are built from the target's own window. Constructing them here instead
 * would make them instances of this realm's MouseEvent, which the fixture's
 * document would not recognise as its own.
 */
function viewOf(target: Element): Window & typeof globalThis {
  const view = target.ownerDocument.defaultView;
  if (!view) throw new Error('the fixture document has no window');
  return view as Window & typeof globalThis;
}

/** Returns false when a handler called preventDefault, as dispatchEvent does. */
function click(target: Element, init: MouseEventInit = {}): boolean {
  const view = viewOf(target);
  return target.dispatchEvent(
    new view.MouseEvent('click', { bubbles: true, cancelable: true, ...init }),
  );
}

/** Same convention: false means a handler took the key. */
function press(target: Element, key: string): boolean {
  const view = viewOf(target);
  return target.dispatchEvent(
    new view.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
  );
}

describe('initImageLightbox', () => {
  it('opens the full-resolution image in the overlay instead of navigating', () => {
    const { doc, trigger, dialog, image } = renderPage();
    initImageLightbox(doc);

    const notPrevented = click(trigger.querySelector('img')!);

    // The click is swallowed, so the browser never follows the link.
    expect(notPrevented).toBe(false);
    expect(dialog!.open).toBe(true);
    // Set as a property, so it reads back resolved -- compared against the
    // trigger's own resolved href rather than the raw attribute.
    expect(image!.src).toBe(trigger.href);
    expect(image!.src.endsWith(`${FULL_RES}1.png`)).toBe(true);
    expect(image!.alt).toBe('Mockup #1');
  });

  it('stops the page behind scrolling while the overlay is up', () => {
    const { doc, trigger, dialog } = renderPage();
    initImageLightbox(doc);

    click(trigger);
    expect(doc.documentElement.classList.contains(LIGHTBOX_OPEN_CLASS)).toBe(true);

    click(dialog!);
    expect(doc.documentElement.classList.contains(LIGHTBOX_OPEN_CLASS)).toBe(false);
  });

  it('closes on a click that lands on the backdrop', () => {
    const { doc, trigger, dialog } = renderPage();
    initImageLightbox(doc);
    click(trigger);

    // The dialog covers the window transparently, so a click reaching the
    // element rather than one of its children is a click on the darkened area.
    click(dialog!);

    expect(dialog!.open).toBe(false);
  });

  it('stays open when the image itself is clicked', () => {
    const { doc, trigger, dialog, image } = renderPage();
    initImageLightbox(doc);
    click(trigger);

    click(image!);

    expect(dialog!.open).toBe(true);
  });

  it('closes on the close button', () => {
    const { doc, trigger, dialog, closeButton } = renderPage();
    initImageLightbox(doc);
    click(trigger);

    click(closeButton!);

    expect(dialog!.open).toBe(false);
  });

  it('releases the image once closed', () => {
    const { doc, trigger, dialog, image } = renderPage();
    initImageLightbox(doc);
    click(trigger);
    expect(image!.hasAttribute('src')).toBe(true);

    click(dialog!);

    // A full-resolution image is large; holding the decoded copy of the last
    // one opened costs memory for nothing.
    expect(image!.hasAttribute('src')).toBe(false);
  });

  it('reopens with the next image clicked', () => {
    const { doc, trigger, dialog, image } = renderPage();
    initImageLightbox(doc);
    click(trigger);
    click(dialog!);

    click(trigger);

    expect(dialog!.open).toBe(true);
    expect(image!.src).toBe(trigger.href);
  });

  for (const [name, init] of [
    ['a command-click', { metaKey: true }],
    ['a control-click', { ctrlKey: true }],
    ['a shift-click', { shiftKey: true }],
    ['an alt-click', { altKey: true }],
    ['a middle-click', { button: 1 }],
  ] as const) {
    it(`leaves ${name} to the browser, so the link still opens a new tab`, () => {
      const { doc, trigger, dialog } = renderPage();
      initImageLightbox(doc);

      const notPrevented = click(trigger, init);

      expect(notPrevented).toBe(true);
      expect(dialog!.open).toBe(false);
    });
  }

  it('steps to the next and previous image with the arrow keys', () => {
    const { doc, triggers, dialog, image } = renderPage({ images: 3 });
    initImageLightbox(doc);
    click(triggers[0]);

    press(dialog!, 'ArrowRight');
    expect(image!.src).toBe(triggers[1].href);
    expect(image!.alt).toBe('Mockup #2');

    press(dialog!, 'ArrowLeft');
    expect(image!.src).toBe(triggers[0].href);
    expect(image!.alt).toBe('Mockup #1');
  });

  it('starts from whichever image was clicked, not the first', () => {
    const { doc, triggers, dialog, image } = renderPage({ images: 3 });
    initImageLightbox(doc);
    click(triggers[1]);
    expect(image!.src).toBe(triggers[1].href);

    press(dialog!, 'ArrowRight');
    expect(image!.src).toBe(triggers[2].href);
  });

  it('wraps around at both ends, so the arrows never dead-end', () => {
    const { doc, triggers, dialog, image } = renderPage({ images: 3 });
    initImageLightbox(doc);
    click(triggers[0]);

    press(dialog!, 'ArrowLeft');
    expect(image!.src).toBe(triggers[2].href);

    press(dialog!, 'ArrowRight');
    expect(image!.src).toBe(triggers[0].href);
  });

  it('ignores the arrows when the case study has a single image', () => {
    const { doc, triggers, dialog, image } = renderPage({ images: 1 });
    initImageLightbox(doc);
    click(triggers[0]);
    const shown = image!.src;

    const rightHandled = !press(dialog!, 'ArrowRight');
    press(dialog!, 'ArrowLeft');

    expect(image!.src).toBe(shown);
    expect(dialog!.open).toBe(true);
    // Nothing to move to, so the key is left for the browser to deal with.
    expect(rightHandled).toBe(false);
  });

  it('leaves other keys alone, Escape above all', () => {
    const { doc, triggers, dialog } = renderPage({ images: 3 });
    initImageLightbox(doc);
    click(triggers[0]);

    // Closing on Escape is the browser's own behaviour for a modal dialog;
    // swallowing the key here would take it away.
    expect(press(dialog!, 'Escape')).toBe(true);
    expect(press(dialog!, 'ArrowUp')).toBe(true);
  });

  it('picks up the gallery the clicked image belongs to', () => {
    const { doc, dialog, image } = renderPage({ images: 2 });
    // A second gallery on the page, as an individual case study could have.
    doc.body.insertAdjacentHTML(
      'beforeend',
      `<div data-gallery><a href="/_astro/other-1.png" data-lightbox-open data-lightbox-alt="Other"><img alt="Other" /></a></div>`,
    );
    initImageLightbox(doc);

    const other = doc.querySelector<HTMLAnchorElement>('[data-gallery]:last-of-type a')!;
    click(other);
    press(dialog!, 'ArrowRight');

    // The lone image in its own gallery, so the arrow stays put rather than
    // wandering into the other gallery's images.
    expect(image!.src).toBe(other.href);
  });

  it('ignores links that are not gallery images', () => {
    const { doc, other, dialog } = renderPage();
    initImageLightbox(doc);

    const notPrevented = click(other);

    expect(notPrevented).toBe(true);
    expect(dialog!.open).toBe(false);
  });

  it('leaves the link alone where the browser has no modal dialog', () => {
    // Without showModal there is nothing to show, so the click must keep doing
    // what it did before: open the full-resolution image directly.
    const { doc, trigger } = renderPage({ dialogSupported: false });
    initImageLightbox(doc);

    expect(click(trigger)).toBe(true);
  });

  it('does nothing on a page with no overlay', () => {
    const { doc, trigger } = renderPage({ withDialog: false });

    expect(() => initImageLightbox(doc)).not.toThrow();
    expect(click(trigger)).toBe(true);
  });
});
