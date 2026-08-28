import { computeScrubber, scrollLeftForOffset } from '../utils/scrollbar';

interface GalleryElements {
  viewport: HTMLElement;
  track: HTMLElement;
  scrubber: HTMLElement;
}

function findGalleryElements(gallery: HTMLElement): GalleryElements | null {
  const viewport = gallery.querySelector<HTMLElement>('[data-gallery-scroll]');
  const track = gallery.querySelector<HTMLElement>('[data-gallery-track]');
  const scrubber = gallery.querySelector<HTMLElement>('[data-gallery-scrubber]');
  if (!viewport || !track || !scrubber) {
    return null;
  }
  return { viewport, track, scrubber };
}

export function updateScrubber({ viewport, track, scrubber }: GalleryElements): void {
  const { width, offset } = computeScrubber(
    track.clientWidth,
    viewport.clientWidth,
    viewport.scrollWidth,
    viewport.scrollLeft,
  );
  scrubber.style.width = `${width}px`;
  scrubber.style.transform = `translateX(${offset}px)`;
}

function bindGallery(gallery: HTMLElement, win: Window): void {
  const elements = findGalleryElements(gallery);
  if (!elements) {
    return;
  }
  const { viewport, track, scrubber } = elements;
  const update = () => updateScrubber(elements);

  viewport.addEventListener('scroll', update);
  win.addEventListener('resize', update);
  viewport.ownerDocument.addEventListener('casestudyfilterschange', update);
  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(update).observe(viewport);
  }

  let dragPointerId: number | null = null;
  let dragStartX = 0;
  let dragStartScroll = 0;

  scrubber.addEventListener('pointerdown', (event) => {
    dragPointerId = event.pointerId;
    dragStartX = event.clientX;
    dragStartScroll = viewport.scrollLeft;
    scrubber.setPointerCapture(event.pointerId);
    event.preventDefault();
  });

  scrubber.addEventListener('pointermove', (event) => {
    if (dragPointerId !== event.pointerId) {
      return;
    }
    const trackWidth = track.clientWidth;
    const scrubberWidth = scrubber.clientWidth;
    const startOffset =
      computeScrubber(trackWidth, viewport.clientWidth, viewport.scrollWidth, dragStartScroll)
        .offset +
      (event.clientX - dragStartX);
    viewport.scrollLeft = scrollLeftForOffset(
      trackWidth,
      scrubberWidth,
      startOffset,
      viewport.clientWidth,
      viewport.scrollWidth,
    );
  });

  const endDrag = (event: PointerEvent) => {
    if (dragPointerId === event.pointerId) {
      dragPointerId = null;
    }
  };
  scrubber.addEventListener('pointerup', endDrag);
  scrubber.addEventListener('pointercancel', endDrag);

  track.addEventListener('pointerdown', (event) => {
    if (event.target === scrubber || scrubber.contains(event.target as Node)) {
      return;
    }
    const rect = track.getBoundingClientRect();
    const scrubberWidth = scrubber.clientWidth;
    viewport.scrollLeft = scrollLeftForOffset(
      track.clientWidth,
      scrubberWidth,
      event.clientX - rect.left - scrubberWidth / 2,
      viewport.clientWidth,
      viewport.scrollWidth,
    );
  });

  update();
}

/** Syncs every custom horizontal scrollbar on the page with its scroller. */
export function initGalleryScrollbars(doc: Document, win: Window): void {
  for (const gallery of doc.querySelectorAll<HTMLElement>('[data-gallery]')) {
    bindGallery(gallery, win);
  }
}
