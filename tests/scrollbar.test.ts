import { describe, expect, it } from 'vitest';
import { MIN_SCRUBBER_WIDTH, computeScrubber, scrollLeftForOffset } from '../src/utils/scrollbar';

describe('computeScrubber', () => {
  it('fills the track when the content fits', () => {
    expect(computeScrubber(1000, 500, 400, 0)).toEqual({ width: 1000, offset: 0 });
    expect(computeScrubber(1000, 500, 500, 0)).toEqual({ width: 1000, offset: 0 });
  });

  it('sizes the scrubber proportionally to the visible fraction', () => {
    const { width, offset } = computeScrubber(1000, 500, 2000, 0);
    expect(width).toBe(250);
    expect(offset).toBe(0);
  });

  it('positions the scrubber proportionally to the scroll position', () => {
    const halfway = computeScrubber(1000, 500, 2000, 750);
    expect(halfway.offset).toBeCloseTo(375);
    const end = computeScrubber(1000, 500, 2000, 1500);
    expect(end.offset).toBeCloseTo(750);
  });

  it('clamps scroll positions beyond the range', () => {
    expect(computeScrubber(1000, 500, 2000, 99999).offset).toBeCloseTo(750);
    expect(computeScrubber(1000, 500, 2000, -50).offset).toBe(0);
  });

  it('enforces a minimum scrubber width', () => {
    const { width } = computeScrubber(1000, 10, 100000, 0);
    expect(width).toBe(MIN_SCRUBBER_WIDTH);
  });

  it('handles degenerate dimensions', () => {
    expect(computeScrubber(0, 500, 2000, 0)).toEqual({ width: 0, offset: 0 });
    expect(computeScrubber(-5, 500, 2000, 0)).toEqual({ width: 0, offset: 0 });
    expect(computeScrubber(1000, 0, 2000, 0)).toEqual({ width: 1000, offset: 0 });
    expect(computeScrubber(1000, 500, 0, 0)).toEqual({ width: 1000, offset: 0 });
  });
});

describe('scrollLeftForOffset', () => {
  it('is the inverse of computeScrubber positioning', () => {
    const geometry = computeScrubber(1000, 500, 2000, 750);
    const scrollLeft = scrollLeftForOffset(1000, geometry.width, geometry.offset, 500, 2000);
    expect(scrollLeft).toBeCloseTo(750);
  });

  it('clamps offsets to the track', () => {
    expect(scrollLeftForOffset(1000, 250, -10, 500, 2000)).toBe(0);
    expect(scrollLeftForOffset(1000, 250, 9999, 500, 2000)).toBeCloseTo(1500);
  });

  it('returns 0 when there is nothing to scroll', () => {
    expect(scrollLeftForOffset(1000, 1000, 100, 500, 400)).toBe(0);
    expect(scrollLeftForOffset(0, 0, 0, 500, 2000)).toBe(0);
  });
});
