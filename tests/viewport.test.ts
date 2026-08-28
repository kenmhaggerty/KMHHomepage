import { describe, expect, it } from 'vitest';
import { MOBILE_BREAKPOINT, isViewportMode, resolveViewportMode } from '../src/utils/viewport';

describe('isViewportMode', () => {
  it('accepts the two valid modes', () => {
    expect(isViewportMode('desktop')).toBe(true);
    expect(isViewportMode('mobile')).toBe(true);
  });

  it('rejects anything else', () => {
    expect(isViewportMode('tablet')).toBe(false);
    expect(isViewportMode(null)).toBe(false);
    expect(isViewportMode(undefined)).toBe(false);
  });
});

describe('resolveViewportMode', () => {
  it('forces mobile below the breakpoint regardless of preference', () => {
    expect(resolveViewportMode(MOBILE_BREAKPOINT - 1, 'desktop')).toBe('mobile');
    expect(resolveViewportMode(320, null)).toBe('mobile');
  });

  it('honors a stored mobile preference on large screens', () => {
    expect(resolveViewportMode(MOBILE_BREAKPOINT, 'mobile')).toBe('mobile');
    expect(resolveViewportMode(1440, 'mobile')).toBe('mobile');
  });

  it('defaults to desktop on large screens', () => {
    expect(resolveViewportMode(MOBILE_BREAKPOINT, null)).toBe('desktop');
    expect(resolveViewportMode(1440, 'desktop')).toBe('desktop');
    expect(resolveViewportMode(1440, 'garbage')).toBe('desktop');
  });
});
