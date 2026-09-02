import { describe, expect, it } from 'vitest';
import {
  isStoredChoiceStale,
  isThemeMode,
  resolveThemeMode,
  systemThemeMode,
} from '../src/utils/theme';

describe('isThemeMode', () => {
  it('accepts only the two themes', () => {
    expect(isThemeMode('light')).toBe(true);
    expect(isThemeMode('dark')).toBe(true);
    expect(isThemeMode('sepia')).toBe(false);
    expect(isThemeMode(null)).toBe(false);
    expect(isThemeMode(undefined)).toBe(false);
  });
});

describe('systemThemeMode', () => {
  it('names the device setting', () => {
    expect(systemThemeMode(true)).toBe('dark');
    expect(systemThemeMode(false)).toBe('light');
  });
});

describe('resolveThemeMode', () => {
  it('follows the device when nothing has been chosen', () => {
    expect(resolveThemeMode(null, true)).toBe('dark');
    expect(resolveThemeMode(null, false)).toBe('light');
  });

  it('holds a choice made against the device setting still in force', () => {
    // Chose light while the device was dark, and the device is still dark.
    expect(resolveThemeMode('light', true, 'dark')).toBe('light');
    expect(resolveThemeMode('dark', false, 'light')).toBe('dark');
  });

  it('retires a choice once the device setting changes underneath it', () => {
    // Chose light while the device was dark; the device is now light.
    expect(resolveThemeMode('light', false, 'dark')).toBe('light');
    // Chose light while the device was light; the device has flipped to dark,
    // and that newer instruction wins.
    expect(resolveThemeMode('light', true, 'light')).toBe('dark');
    expect(resolveThemeMode('dark', false, 'dark')).toBe('light');
  });

  it('lets the device win over a choice stored before this behaviour existed', () => {
    expect(resolveThemeMode('light', true)).toBe('dark');
    expect(resolveThemeMode('dark', false)).toBe('light');
  });

  it('ignores a stored value that is not a theme', () => {
    expect(resolveThemeMode('sepia', true, 'dark')).toBe('dark');
    expect(resolveThemeMode('', false, 'light')).toBe('light');
  });
});

describe('isStoredChoiceStale', () => {
  it('is true only when a real choice has been outlived by a device change', () => {
    expect(isStoredChoiceStale('light', true, 'light')).toBe(true);
    expect(isStoredChoiceStale('light', true, 'dark')).toBe(false);
    // Nothing chosen, so nothing to retire.
    expect(isStoredChoiceStale(null, true, 'light')).toBe(false);
    expect(isStoredChoiceStale('sepia', true, 'light')).toBe(false);
  });

  it('treats a choice with no recorded device setting as stale', () => {
    expect(isStoredChoiceStale('light', false)).toBe(true);
  });
});
