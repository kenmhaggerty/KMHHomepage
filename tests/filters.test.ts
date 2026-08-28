import { describe, expect, it } from 'vitest';
import { FILTERS, FILTER_KEYS, isFilterKey, matchesFilters } from '../src/utils/filters';
import type { CaseStudyFilterFlags } from '../src/types';

const flags: CaseStudyFilterFlags = {
  zero_to_one: false,
  consumer: false,
  gov_dod: true,
  mobile: false,
};

describe('FILTERS', () => {
  it('defines the four chips from the design, in order', () => {
    expect(FILTERS.map((f) => f.label)).toEqual(['0 → 1', 'Consumer', 'Gov / DoD', 'Mobile']);
    expect(FILTER_KEYS).toEqual(['zero_to_one', 'consumer', 'gov_dod', 'mobile']);
  });
});

describe('isFilterKey', () => {
  it('accepts known keys', () => {
    for (const key of FILTER_KEYS) {
      expect(isFilterKey(key)).toBe(true);
    }
  });

  it('rejects unknown keys', () => {
    expect(isFilterKey('desktop')).toBe(false);
    expect(isFilterKey('')).toBe(false);
  });
});

describe('matchesFilters', () => {
  it('matches everything when no filters are selected', () => {
    expect(matchesFilters(flags, [])).toBe(true);
  });

  it('matches when every selected flag is set', () => {
    expect(matchesFilters(flags, ['gov_dod'])).toBe(true);
  });

  it('does not match when any selected flag is unset', () => {
    expect(matchesFilters(flags, ['consumer'])).toBe(false);
    expect(matchesFilters(flags, ['gov_dod', 'mobile'])).toBe(false);
  });
});
