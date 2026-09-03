import { describe, expect, it } from 'vitest';
import { CHANGELOG_HASH, initChangelogModal } from '../src/scripts/changelogModal';
import { MODAL_OPEN_CLASS } from '../src/utils/modal';

/** jsdom implements neither showModal nor close; see imageLightbox.dom.test.ts. */
function stubDialog(dialog: HTMLDialogElement): void {
  dialog.showModal = () => dialog.setAttribute('open', '');
  dialog.close = () => {
    dialog.removeAttribute('open');
    dialog.dispatchEvent(new Event('close'));
  };
}

/** A fresh document per test, for the reasons given in imageLightbox.dom.test.ts. */
function renderPage({ withDialog = true, withTrigger = true, dialogSupported = true } = {}) {
  const frame = document.createElement('iframe');
  document.body.appendChild(frame);
  const doc = frame.contentDocument!;
  doc.body.innerHTML = `
    <footer>
      <p class="site-version">
        ${withTrigger ? '<button type="button" class="version-button" data-changelog-open aria-haspopup="dialog">v3.0.1</button>' : ''}
      </p>
      ${
        withDialog
          ? `<dialog class="modal changelog" data-changelog aria-label="Changelog">
               <button type="button" class="modal-close" data-changelog-close aria-label="Close changelog"></button>
               <div class="changelog-panel"><h1>CHANGELOG</h1></div>
             </dialog>`
          : ''
      }
    </footer>
  `;
  const dialog = doc.querySelector<HTMLDialogElement>('[data-changelog]');
  if (dialog && dialogSupported) {
    stubDialog(dialog);
  }
  return {
    doc,
    trigger: doc.querySelector<HTMLButtonElement>('[data-changelog-open]'),
    dialog,
    closeButton: doc.querySelector<HTMLButtonElement>('[data-changelog-close]'),
    panel: doc.querySelector<HTMLElement>('.changelog-panel'),
  };
}

interface FakeWin {
  win: Window;
  urls: string[];
  goTo: (hash: string) => void;
}

/**
 * The script reads location and writes history, neither of which an about:blank
 * iframe models usefully, so those come from a stub -- as in themeMode's tests.
 */
function makeWindow({ hash = '', search = '', throws = false } = {}): FakeWin {
  const urls: string[] = [];
  const listeners: Array<() => void> = [];
  const location = { pathname: '/work/gfm/', search, hash };
  const win = {
    location,
    history: {
      replaceState: (_state: unknown, _title: string, url: string) => {
        if (throws) throw new Error('history blocked');
        urls.push(url);
        location.hash = url.includes('#') ? url.slice(url.indexOf('#')) : '';
      },
    },
    addEventListener: (type: string, cb: () => void) => {
      if (type === 'hashchange') listeners.push(cb);
    },
  } as unknown as Window;
  return {
    win,
    urls,
    goTo: (next: string) => {
      location.hash = next;
      listeners.forEach((cb) => cb());
    },
  };
}

/** Events come from the target's own realm; see imageLightbox.dom.test.ts. */
function click(target: Element): boolean {
  const view = target.ownerDocument.defaultView as Window & typeof globalThis;
  return target.dispatchEvent(new view.MouseEvent('click', { bubbles: true, cancelable: true }));
}

describe('initChangelogModal', () => {
  it('opens the changelog from the footer button', () => {
    const { doc, trigger, dialog } = renderPage();
    initChangelogModal(doc, makeWindow().win);

    click(trigger!);

    expect(dialog!.open).toBe(true);
  });

  it('stops the page behind scrolling while it is up', () => {
    const { doc, trigger, dialog } = renderPage();
    initChangelogModal(doc, makeWindow().win);

    click(trigger!);
    expect(doc.documentElement.classList.contains(MODAL_OPEN_CLASS)).toBe(true);

    dialog!.close();
    expect(doc.documentElement.classList.contains(MODAL_OPEN_CLASS)).toBe(false);
  });

  it('closes on a click that lands on the scrim', () => {
    const { doc, trigger, dialog } = renderPage();
    initChangelogModal(doc, makeWindow().win);
    click(trigger!);

    // The dialog covers the window transparently, so a click reaching the
    // element rather than one of its children is a click on the darkened area.
    click(dialog!);

    expect(dialog!.open).toBe(false);
  });

  it('stays open when the notes themselves are clicked', () => {
    const { doc, trigger, dialog, panel } = renderPage();
    initChangelogModal(doc, makeWindow().win);
    click(trigger!);

    click(panel!);

    expect(dialog!.open).toBe(true);
  });

  it('closes on the close button', () => {
    const { doc, trigger, dialog, closeButton } = renderPage();
    initChangelogModal(doc, makeWindow().win);
    click(trigger!);

    click(closeButton!);

    expect(dialog!.open).toBe(false);
  });

  it('reopens after being closed', () => {
    const { doc, trigger, dialog } = renderPage();
    initChangelogModal(doc, makeWindow().win);
    click(trigger!);
    click(dialog!);

    click(trigger!);

    expect(dialog!.open).toBe(true);
  });

  it('shares the scroll lock with the image viewer, rather than a second one', async () => {
    // Both modals use the same shell, so a stale class from one would leave the
    // page unscrollable after the other closed.
    const lightbox = await import('../src/scripts/imageLightbox');
    expect(typeof lightbox.initImageLightbox).toBe('function');
    const { doc, trigger, dialog } = renderPage();
    initChangelogModal(doc, makeWindow().win);
    click(trigger!);
    dialog!.close();
    expect(doc.documentElement.className).not.toContain('lightbox');
  });

  it('appends the hash when opened, so the view can be linked to', () => {
    const { doc, trigger, dialog } = renderPage();
    const { win, urls } = makeWindow({ search: '?ref=x' });
    initChangelogModal(doc, win);

    click(trigger!);

    expect(dialog!.open).toBe(true);
    // The path and query are kept; only the hash is added.
    expect(urls).toEqual([`/work/gfm/?ref=x${CHANGELOG_HASH}`]);
  });

  it('removes the hash again when closed, however it was dismissed', () => {
    for (const dismiss of ['scrim', 'button', 'close()'] as const) {
      const { doc, trigger, dialog, closeButton } = renderPage();
      const { win, urls } = makeWindow();
      initChangelogModal(doc, win);
      click(trigger!);

      if (dismiss === 'scrim') click(dialog!);
      else if (dismiss === 'button') click(closeButton!);
      else dialog!.close();

      expect(urls, dismiss).toEqual([`/work/gfm/${CHANGELOG_HASH}`, '/work/gfm/']);
      expect(win.location.hash).toBe('');
    }
  });

  it('opens on load when the page is reached at the hash', () => {
    const { doc, dialog } = renderPage();
    const { win, urls } = makeWindow({ hash: CHANGELOG_HASH });

    initChangelogModal(doc, win);

    expect(dialog!.open).toBe(true);
    // Already correct, so nothing is rewritten.
    expect(urls).toEqual([]);
  });

  it('leaves an ordinary page alone', () => {
    const { doc, dialog } = renderPage();
    const { win } = makeWindow({ hash: '' });
    initChangelogModal(doc, win);
    expect(dialog!.open).toBe(false);
  });

  it('follows the hash changing under it, in both directions', () => {
    const { doc, dialog } = renderPage();
    const { win, goTo } = makeWindow();
    initChangelogModal(doc, win);

    // Back, forward, or a hash typed into the address bar.
    goTo(CHANGELOG_HASH);
    expect(dialog!.open).toBe(true);

    goTo('');
    expect(dialog!.open).toBe(false);
  });

  it('does not clear a hash that belongs to something else', () => {
    // Navigating to another anchor while the modal is up closes it, but the
    // anchor the visitor asked for has to survive.
    const { doc, trigger, dialog } = renderPage();
    const { win, urls, goTo } = makeWindow();
    initChangelogModal(doc, win);
    click(trigger!);

    goTo('#some-other-anchor');

    expect(dialog!.open).toBe(false);
    expect(urls).toEqual([`/work/gfm/${CHANGELOG_HASH}`]);
    expect(win.location.hash).toBe('#some-other-anchor');
  });

  it('still opens where history cannot be written', () => {
    // Blocked in some embedded contexts; the modal must not depend on it.
    const { doc, trigger, dialog } = renderPage();
    const { win } = makeWindow({ throws: true });
    initChangelogModal(doc, win);

    expect(() => click(trigger!)).not.toThrow();
    expect(dialog!.open).toBe(true);
    expect(() => dialog!.close()).not.toThrow();
  });

  it('does nothing where the browser has no modal dialog', () => {
    const { doc, trigger, dialog } = renderPage({ dialogSupported: false });

    expect(() => initChangelogModal(doc, makeWindow().win)).not.toThrow();
    click(trigger!);
    expect(dialog!.open).toBe(false);
  });

  it('does nothing on a page with no changelog modal', () => {
    const { doc } = renderPage({ withDialog: false });
    expect(() => initChangelogModal(doc, makeWindow().win)).not.toThrow();
  });

  it('does nothing without the footer button', () => {
    const { doc, dialog } = renderPage({ withTrigger: false });
    expect(() => initChangelogModal(doc, makeWindow().win)).not.toThrow();
    expect(dialog!.open).toBe(false);
  });
});
