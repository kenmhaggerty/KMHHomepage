import { beforeEach, describe, expect, it } from 'vitest';
import { HOVERED_CLASS, initPanelHover } from '../src/scripts/panelHover';

/** jsdom has no layout, so what sits under the pointer is stated outright. */
let under: Element | null = null;

function renderCarousel() {
  document.body.innerHTML = `
    <div class="hscroll-viewport" data-gallery-scroll>
      <a class="panel panel-hoverable" data-case-study="a"><span class="panel-overlay"></span></a>
      <a class="panel panel-hoverable" data-case-study="b"><span class="panel-overlay"></span></a>
      <a class="panel" data-case-study="plain"></a>
    </div>
  `;
  document.elementFromPoint = () => under;
}

function panel(key: string): HTMLElement {
  const el = document.querySelector<HTMLElement>(`[data-case-study="${key}"]`);
  if (!el) throw new Error(`no ${key} panel`);
  return el;
}

function pointerMove(x: number, y: number, pointerType = 'mouse') {
  const event = new Event('pointermove', { bubbles: true });
  Object.assign(event, { clientX: x, clientY: y, pointerType });
  document.dispatchEvent(event);
}

function scroll() {
  const viewport = document.querySelector('.hscroll-viewport')!;
  viewport.dispatchEvent(new Event('scroll'));
}

beforeEach(() => {
  under = null;
  delete document.documentElement.dataset.panelHover;
  renderCarousel();
});

describe('initPanelHover', () => {
  it('hands hover over to the script once a mouse is in play', () => {
    initPanelHover(document);
    expect(document.documentElement.dataset.panelHover).toBeUndefined();

    under = panel('a');
    pointerMove(10, 10);

    expect(document.documentElement.dataset.panelHover).toBe('');
  });

  it('marks the panel under the pointer', () => {
    initPanelHover(document);
    under = panel('a');
    pointerMove(10, 10);

    expect(panel('a').classList.contains(HOVERED_CLASS)).toBe(true);
    expect(panel('b').classList.contains(HOVERED_CLASS)).toBe(false);
  });

  it('re-resolves on scroll, so a panel moving under a still pointer lights up', () => {
    initPanelHover(document);
    under = panel('a');
    pointerMove(10, 10);
    expect(panel('a').classList.contains(HOVERED_CLASS)).toBe(true);

    // The pointer has not moved; the carousel scrolled panel B under it.
    under = panel('b');
    scroll();

    expect(panel('a').classList.contains(HOVERED_CLASS)).toBe(false);
    expect(panel('b').classList.contains(HOVERED_CLASS)).toBe(true);
  });

  it('resolves from whatever is under the pointer up to the panel', () => {
    initPanelHover(document);
    under = panel('b').querySelector('.panel-overlay');
    pointerMove(10, 10);

    expect(panel('b').classList.contains(HOVERED_CLASS)).toBe(true);
  });

  it('leaves panels that are not hoverable alone', () => {
    initPanelHover(document);
    under = panel('plain');
    pointerMove(10, 10);

    expect(panel('plain').classList.contains(HOVERED_CLASS)).toBe(false);
  });

  it('clears the mark when the carousel scrolls every panel away', () => {
    initPanelHover(document);
    under = panel('a');
    pointerMove(10, 10);

    under = document.body;
    scroll();

    expect(document.querySelectorAll(`.${HOVERED_CLASS}`)).toHaveLength(0);
  });

  it('ignores touch, which has no hover to speak of', () => {
    initPanelHover(document);
    under = panel('a');
    pointerMove(10, 10, 'touch');

    expect(document.documentElement.dataset.panelHover).toBeUndefined();
    expect(panel('a').classList.contains(HOVERED_CLASS)).toBe(false);
  });

  it('clears the mark when the pointer leaves the window', () => {
    initPanelHover(document);
    under = panel('a');
    pointerMove(10, 10);
    expect(panel('a').classList.contains(HOVERED_CLASS)).toBe(true);

    document.documentElement.dispatchEvent(new Event('pointerleave'));

    expect(document.querySelectorAll(`.${HOVERED_CLASS}`)).toHaveLength(0);
  });
});
