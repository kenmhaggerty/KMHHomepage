import { MODAL_OPEN_CLASS } from '../utils/modal';

function isPlainLeftClick(event: MouseEvent): boolean {
  // A modified click is the visitor asking for a new tab, a window, or a save;
  // intercepting those would take away something they already had.
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

/**
 * Opens gallery images in an overlay instead of a new tab.
 *
 * The trigger stays a real link to the full-resolution file, so if this never
 * runs -- no JavaScript, or a browser without <dialog> -- the click still opens
 * the image the way it always did.
 */
export function initImageLightbox(doc: Document): void {
  const dialog = doc.querySelector<HTMLDialogElement>('[data-lightbox]');
  const image = dialog?.querySelector<HTMLImageElement>('[data-lightbox-image]');
  if (!dialog || !image || typeof dialog.showModal !== 'function') {
    return;
  }

  const close = () => {
    if (dialog.open) {
      dialog.close();
    }
  };

  /* The gallery the open image came from, so the arrow keys have something to
     step through. Rebuilt on each open rather than up front, since a page can
     hold more than one gallery. */
  let gallery: HTMLAnchorElement[] = [];
  let index = 0;

  const show = (position: number) => {
    // Wraps, so the arrows never dead-end on the first or last image.
    index = (position + gallery.length) % gallery.length;
    const link = gallery[index];
    image.src = link.href;
    image.alt = link.dataset.lightboxAlt ?? '';
  };

  doc.addEventListener('click', (event) => {
    // Checked by shape rather than with `instanceof Element`: the target can be
    // the document or a text node, and instanceof would also quietly assume the
    // node came from this realm.
    const target = event.target as Element | null;
    const trigger =
      typeof target?.closest === 'function'
        ? target.closest<HTMLAnchorElement>('a[data-lightbox-open]')
        : null;
    if (!trigger || !isPlainLeftClick(event)) {
      return;
    }

    event.preventDefault();
    const container = trigger.closest('[data-gallery]') ?? doc;
    gallery = [...container.querySelectorAll<HTMLAnchorElement>('a[data-lightbox-open]')];
    const position = gallery.indexOf(trigger);
    if (position < 0) {
      gallery = [trigger];
    }
    show(Math.max(position, 0));
    dialog.showModal();
    doc.documentElement.classList.add(MODAL_OPEN_CLASS);
  });

  dialog.addEventListener('keydown', (event) => {
    // Escape is the browser's to handle; only the arrows are ours, and only
    // where there is somewhere to move to.
    if (gallery.length < 2) {
      return;
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      show(index + 1);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      show(index - 1);
    }
  });

  dialog.addEventListener('click', (event) => {
    // The dialog covers the window, transparently, so a click that reaches it
    // rather than one of its children is a click on the darkened area. The
    // image and the close button are those children.
    if (event.target === dialog) {
      close();
    }
  });

  dialog.querySelector('[data-lightbox-close]')?.addEventListener('click', close);

  // Fires for the close button, a backdrop click, and Escape alike, so the
  // cleanup only needs writing once.
  dialog.addEventListener('close', () => {
    doc.documentElement.classList.remove(MODAL_OPEN_CLASS);
    // Dropping the source releases what can be a very large decoded image.
    image.removeAttribute('src');
  });
}
