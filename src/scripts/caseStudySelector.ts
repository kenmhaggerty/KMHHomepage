/**
 * Opens and closes the Case Studies selector on the Work page: the heading is
 * a button, and the list under it is shown while the button is expanded.
 *
 * The list is links, so nothing here is needed to navigate -- this only
 * decides when the list is on screen. It closes the way a menu is expected
 * to: on the trigger again, on Escape (handing focus back to the trigger, so
 * the keyboard is not left on a hidden link), on a press anywhere outside it,
 * and when the focus tabs out of it.
 */
export function initCaseStudySelector(doc: Document): void {
  const root = doc.querySelector<HTMLElement>('[data-cs-selector]');
  const trigger = root?.querySelector<HTMLButtonElement>('[data-cs-selector-trigger]');
  const menu = root?.querySelector<HTMLElement>('[data-cs-selector-menu]');
  if (!root || !trigger || !menu) {
    return;
  }

  const isOpen = () => trigger.getAttribute('aria-expanded') === 'true';

  const setOpen = (open: boolean) => {
    trigger.setAttribute('aria-expanded', String(open));
    menu.hidden = !open;
  };

  trigger.addEventListener('click', () => setOpen(!isOpen()));

  root.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && isOpen()) {
      event.preventDefault();
      setOpen(false);
      trigger.focus();
    }
  });

  // pointerdown rather than click, so the list is gone before whatever was
  // pressed instead gets to act -- a chip or a panel under it should not have
  // to be pressed twice.
  doc.addEventListener('pointerdown', (event) => {
    if (isOpen() && !root.contains(event.target as Node)) {
      setOpen(false);
    }
  });

  // relatedTarget is where focus is going. It is null when focus leaves the
  // document, or lands on nothing focusable -- a click on the page, which the
  // pointer handler above already covers -- so only a move to another element
  // outside closes it here.
  root.addEventListener('focusout', (event) => {
    const next = event.relatedTarget as Node | null;
    if (isOpen() && next && !root.contains(next)) {
      setOpen(false);
    }
  });
}
