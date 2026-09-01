import { describe, expect, it } from 'vitest';
import { isThemeMode, resolveThemeMode } from '../src/utils/theme';

describe('isThemeMode', () => {
  it('accepts only the two themes', () => {
    expect(isThemeMode('light')).toBe(true);
    expect(isThemeMode('dark')).toBe(true);
    expect(isThemeMode('sepia')).toBe(false);
    expect(isThemeMode(null)).toBe(false);
    expect(isThemeMode(undefined)).toBe(false);
  });
});

describe('resolveThemeMode', () => {
  it('follows the system when nothing has been chosen', () => {
    expect(resolveThemeMode(null, true)).toBe('dark');
    expect(resolveThemeMode(null, false)).toBe('light');
  });

  it('lets a stored choice override the system', () => {
    expect(resolveThemeMode('light', true)).toBe('light');
    expect(resolveThemeMode('dark', false)).toBe('dark');
  });

  it('ignores a stored value that is not a theme', () => {
    expect(resolveThemeMode('sepia', true)).toBe('dark');
    expect(resolveThemeMode('', false)).toBe('light');
  });
});
