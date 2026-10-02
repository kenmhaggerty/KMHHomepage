/**
 * Opens and closes the Case Studies selector on the Work page: the heading is
 * a button, and the list under it is shown while the button is expanded.
 *
 * The list is links, so nothing here is needed to navigate -- this only
 * decides when the list is on screen. It closes the way a menu is expected
 * to: on the trigger again, on Escape (handing focus back to the trigger, so
 * the keyboard is not left on a hidden link), on a press anywhere outside it --
 * a tap, for a finger: starting a scroll leaves it open -- and when the focus
 * tabs out of it.
 *
 * Not loaded as a module: CaseStudySelector.astro writes this function's own
 * source into the page right after the selector, so it works before the
 * site's script bundle arrives. It must therefore stay self-contained --
 * anything it uses has to be declared inside it, since an import or a
 * module-level constant would not exist on the page. A test runs the inlined
 * copy in a bare page to hold it to that.
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

  /* A press outside closes it, but what counts as a press depends on the
     pointer. A mouse closes it on the way down, so the list is gone before
     whatever was pressed gets to act -- a chip or a panel under it should not
     have to be pressed twice. A finger cannot: putting one down is also how a
     scroll begins, so closing then shut the list the instant the page started
     to move, when the visitor only meant to scroll past it. The browser tells
     the two apart: a tap ends in pointerup, while a scroll takes the gesture
     over and ends it in pointercancel, which never reaches here. So touch and
     pen close on pointerup, and anything that does not call itself a mouse is
     treated as touch. */
  const closeIfOutside = (event: Event) => {
    if (isOpen() && !root.contains(event.target as Node)) {
      setOpen(false);
    }
  };

  doc.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse') {
      closeIfOutside(event);
    }
  });

  doc.addEventListener('pointerup', (event) => {
    if (event.pointerType !== 'mouse') {
      closeIfOutside(event);
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
