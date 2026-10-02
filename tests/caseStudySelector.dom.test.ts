import { beforeEach, describe, expect, it } from 'vitest';
import { initCaseStudySelector } from '../src/scripts/caseStudySelector';

/* The selector as the Work page renders it, with a chip beside it and a panel
   after it: something focusable outside the control, and something to press
   outside it. */
function renderWorkPage() {
  document.body.innerHTML = `
    <button type="button" class="chip" data-filter-chip="mobile">Mobile</button>
    <div class="cs-selector" data-cs-selector>
      <h2 class="section-title">
        <button type="button" data-cs-selector-trigger aria-expanded="false"
                aria-controls="case-study-selector-menu">Case Studies</button>
      </h2>
      <ul id="case-study-selector-menu" data-cs-selector-menu hidden>
        <li><a href="/work/gfm">GFM</a></li>
        <li><a href="/work/camps">CAMPS</a></li>
      </ul>
    </div>
    <a class="panel" href="/work/gfm">GFM</a>
  `;
}

function trigger(): HTMLButtonElement {
  return document.querySelector<HTMLButtonElement>('[data-cs-selector-trigger]')!;
}

function menu(): HTMLElement {
  return document.querySelector<HTMLElement>('[data-cs-selector-menu]')!;
}

function rows(): HTMLAnchorElement[] {
  return [...menu().querySelectorAll<HTMLAnchorElement>('a')];
}

function isOpen(): boolean {
  return trigger().getAttribute('aria-expanded') === 'true' && !menu().hidden;
}

function press(target: Element, key: string): boolean {
  return target.dispatchEvent(
    new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
  );
}

/**
 * A pointer event of the given kind from the given sort of pointer. jsdom has no
 * PointerEvent, so it is a plain event carrying the one field the script reads;
 * left out, as an old browser might, the pointer is not a mouse.
 */
function pointer(
  type: 'pointerdown' | 'pointerup' | 'pointercancel',
  target: Element,
  pointerType?: 'mouse' | 'touch' | 'pen',
): void {
  const event = new Event(type, { bubbles: true });
  if (pointerType !== undefined) {
    Object.defineProperty(event, 'pointerType', { value: pointerType });
  }
  target.dispatchEvent(event);
}

function focusLeaves(from: Element, to: Element | null): void {
  from.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: to }));
}

beforeEach(() => {
  renderWorkPage();
  initCaseStudySelector(document);
});

describe('initCaseStudySelector', () => {
  it('starts closed, with the trigger saying so', () => {
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
    expect(menu().hidden).toBe(true);
  });

  it('opens on the trigger, and closes on it again', () => {
    trigger().click();
    expect(isOpen()).toBe(true);
    trigger().click();
    expect(isOpen()).toBe(false);
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
  });

  it('closes on Escape and hands focus back to the trigger', () => {
    trigger().click();
    rows()[1].focus();
    // Otherwise the keyboard is left on a link that is no longer on screen.
    expect(press(rows()[1], 'Escape')).toBe(false);
    expect(isOpen()).toBe(false);
    expect(document.activeElement).toBe(trigger());
  });

  it('leaves Escape alone while closed', () => {
    trigger().focus();
    expect(press(trigger(), 'Escape')).toBe(true);
    expect(document.activeElement).toBe(trigger());
  });

  it('closes on a mouse press anywhere outside it, as soon as the button goes down', () => {
    trigger().click();
    pointer('pointerdown', document.querySelector('.panel')!, 'mouse');
    // Before release, so whatever was pressed does not need pressing twice.
    expect(isOpen()).toBe(false);
  });

  it('stays open on a mouse press inside it, on a row', () => {
    trigger().click();
    pointer('pointerdown', rows()[0], 'mouse');
    expect(isOpen()).toBe(true);
  });

  describe('with a finger, where putting one down is also how a scroll starts', () => {
    it('stays open when a touch lands outside it', () => {
      trigger().click();
      pointer('pointerdown', document.querySelector('.panel')!, 'touch');
      expect(isOpen()).toBe(true);
    });

    it('stays open through a scroll, which ends in pointercancel rather than pointerup', () => {
      /* The browser takes the gesture over once the page starts to move and
         cancels the pointer: the visitor scrolled past the list and meant to
         leave it open. Closing on the touch itself shut it as the page moved. */
      trigger().click();
      const page = document.querySelector('.panel')!;
      pointer('pointerdown', page, 'touch');
      pointer('pointercancel', page, 'touch');
      expect(isOpen()).toBe(true);
    });

    it('closes on a tap outside it, which ends in pointerup', () => {
      trigger().click();
      const page = document.querySelector('.panel')!;
      pointer('pointerdown', page, 'touch');
      pointer('pointerup', page, 'touch');
      expect(isOpen()).toBe(false);
    });

    it('closes on a pen tap the same way', () => {
      trigger().click();
      const page = document.querySelector('.panel')!;
      pointer('pointerdown', page, 'pen');
      expect(isOpen()).toBe(true);
      pointer('pointerup', page, 'pen');
      expect(isOpen()).toBe(false);
    });

    it('treats a pointer that does not say what it is as a finger', () => {
      trigger().click();
      const page = document.querySelector('.panel')!;
      pointer('pointerdown', page);
      expect(isOpen()).toBe(true);
      pointer('pointerup', page);
      expect(isOpen()).toBe(false);
    });

    it('stays open on a tap inside it, on a row', () => {
      trigger().click();
      pointer('pointerdown', rows()[0], 'touch');
      pointer('pointerup', rows()[0], 'touch');
      expect(isOpen()).toBe(true);
    });
  });

  it('does not close on a mouse release outside it, only on the press', () => {
    // The mouse closes on the way down; a release has nothing more to do.
    trigger().click();
    pointer('pointerup', document.querySelector('.panel')!, 'mouse');
    expect(isOpen()).toBe(true);
  });

  it('closes when focus moves to something outside it', () => {
    trigger().click();
    rows()[0].focus();
    focusLeaves(rows()[0], document.querySelector('.chip'));
    expect(isOpen()).toBe(false);
  });

  it('stays open while focus moves between its own rows', () => {
    trigger().click();
    rows()[0].focus();
    focusLeaves(rows()[0], rows()[1]);
    expect(isOpen()).toBe(true);
  });

  it('stays open when focus goes nowhere in particular', () => {
    /* relatedTarget is null when focus leaves for the document itself, or for
       the window. A click on a blank part of the page does that, and the
       pointer handler closes for it; closing here as well would also close
       for a window losing focus, which has nothing to do with the menu. */
    trigger().click();
    rows()[0].focus();
    focusLeaves(rows()[0], null);
    expect(isOpen()).toBe(true);
  });

  it('does nothing on a page without the selector', () => {
    document.body.innerHTML = '<main></main>';
    expect(() => initCaseStudySelector(document)).not.toThrow();
  });
});

describe('the copy inlined into the page', () => {
  /* CaseStudySelector.astro writes this function's source into the page --
     `(${initCaseStudySelector.toString()})(document);` -- so the selector works
     before the site's script bundle arrives. That copy is only correct while
     the function is self-contained: a name it borrowed from its module would
     not exist on the page. So the same string is run here inside a fresh
     iframe, whose global scope has nothing from the module in it. */
  it('works on its own, with nothing from its module around it', () => {
    const frame = document.createElement('iframe');
    document.body.appendChild(frame);
    const view = frame.contentWindow as Window & typeof globalThis;
    const doc = frame.contentDocument!;
    doc.body.innerHTML = `
      <div data-cs-selector>
        <h2><button type="button" data-cs-selector-trigger aria-expanded="false">Case Studies</button></h2>
        <ul data-cs-selector-menu hidden><li><a href="/work/gfm">GFM</a></li></ul>
      </div>`;

    view.eval(`(${initCaseStudySelector.toString()})(document);`);

    const button = doc.querySelector<HTMLButtonElement>('[data-cs-selector-trigger]')!;
    const list = doc.querySelector<HTMLElement>('[data-cs-selector-menu]')!;
    button.click();
    expect(list.hidden).toBe(false);
    expect(button.getAttribute('aria-expanded')).toBe('true');
    button.click();
    expect(list.hidden).toBe(true);
  });
});
