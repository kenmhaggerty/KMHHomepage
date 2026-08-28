export interface ScrubberGeometry {
  /** Scrubber width in px. */
  width: number;
  /** Scrubber offset from the start of the track in px. */
  offset: number;
}

export const MIN_SCRUBBER_WIDTH = 24;

/**
 * Computes the size and position of a custom horizontal scrollbar scrubber
 * for a scroll container.
 */
export function computeScrubber(
  trackWidth: number,
  viewportWidth: number,
  contentWidth: number,
  scrollLeft: number,
): ScrubberGeometry {
  if (trackWidth <= 0 || contentWidth <= 0 || viewportWidth <= 0) {
    return { width: Math.max(trackWidth, 0), offset: 0 };
  }
  if (contentWidth <= viewportWidth) {
    return { width: trackWidth, offset: 0 };
  }
  const width = Math.min(
    trackWidth,
    Math.max(MIN_SCRUBBER_WIDTH, (viewportWidth / contentWidth) * trackWidth),
  );
  const maxScroll = contentWidth - viewportWidth;
  const progress = Math.min(1, Math.max(0, scrollLeft / maxScroll));
  return { width, offset: (trackWidth - width) * progress };
}

/**
 * Inverse of {@link computeScrubber}: converts a scrubber offset back into a
 * scrollLeft value for the scroll container.
 */
export function scrollLeftForOffset(
  trackWidth: number,
  scrubberWidth: number,
  offset: number,
  viewportWidth: number,
  contentWidth: number,
): number {
  const range = trackWidth - scrubberWidth;
  const maxScroll = contentWidth - viewportWidth;
  if (range <= 0 || maxScroll <= 0) {
    return 0;
  }
  const progress = Math.min(1, Math.max(0, offset / range));
  return progress * maxScroll;
}
