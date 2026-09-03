import { MODAL_OPEN_CLASS } from '../utils/modal';

/**
 * Appended to the URL while the changelog is open, so the view can be linked to
 * and survives a reload. It works on any page: the footer carries the modal, and
 * the footer is on all of them.
 */
export const CHANGELOG_HASH = '#changelog';

/**
 * Opens the changelog over the page, from the footer's version button or from
 * the URL.
 *
 * A <dialog> for the same reasons the image viewer uses one: showModal() brings
 * Escape-to-close, a focus trap, and an inert page behind it, and its ::backdrop
 * is the one layer iOS Safari paints behind the status bar and toolbar.
 */
export function initChangelogModal(doc: Document, win: Window): void {
  const dialog = doc.querySelector<HTMLDialogElement>('[data-changelog]');
  const trigger = doc.querySelector<HTMLButtonElement>('[data-changelog-open]');
  if (!dialog || !trigger || typeof dialog.showModal !== 'function') {
    return;
  }

  /*
   * replaceState rather than assigning location.hash. Assigning would add a
   * history entry every time the modal opened, and send the browser looking for
   * an element with that id to scroll to; this only rewrites what the address
   * bar shows.
   *
   * The equality guard is what keeps it from clearing someone else's hash: it
   * writes only to add its own or to remove its own, so navigating to another
   * anchor while the modal is up leaves that anchor alone.
   */
  const writeHash = (present: boolean) => {
    const { pathname, search, hash } = win.location;
    if (present === (hash === CHANGELOG_HASH)) {
      return;
    }
    try {
      win.history.replaceState(null, '', `${pathname}${search}${present ? CHANGELOG_HASH : ''}`);
    } catch {
      /* Blocked in some embedded contexts; the modal itself still works. */
    }
  };

  const open = () => {
    if (!dialog.open) {
      dialog.showModal();
      doc.documentElement.classList.add(MODAL_OPEN_CLASS);
    }
    writeHash(true);
  };

  const close = () => {
    if (dialog.open) {
      dialog.close();
    }
  };

  trigger.addEventListener('click', open);

  dialog.addEventListener('click', (event) => {
    // The dialog covers the window, transparently, so a click that reaches it
    // rather than the panel or the close button is a click on the scrim.
    if (event.target === dialog) {
      close();
    }
  });

  dialog.querySelector('[data-changelog-close]')?.addEventListener('click', close);

  // Fires for the close button, a scrim click, and Escape alike, so the hash is
  // cleared once however the modal was dismissed.
  dialog.addEventListener('close', () => {
    doc.documentElement.classList.remove(MODAL_OPEN_CLASS);
    writeHash(false);
  });

  // Catches the back and forward buttons, and a hash typed into the address bar.
  win.addEventListener('hashchange', () => {
    if (win.location.hash === CHANGELOG_HASH) {
      open();
    } else {
      close();
    }
  });

  // Arriving on a link that already carries it.
  if (win.location.hash === CHANGELOG_HASH) {
    open();
  }
}
