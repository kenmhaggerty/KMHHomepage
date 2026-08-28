import type { CaseStudyFilterFlags, FilterKey } from '../types';

export interface FilterDefinition {
  key: FilterKey;
  label: string;
}

/** Filter chips shown on the Work page, in display order. */
export const FILTERS: readonly FilterDefinition[] = [
  { key: 'zero_to_one', label: '0 → 1' },
  { key: 'consumer', label: 'Consumer' },
  { key: 'gov_dod', label: 'Gov / DoD' },
  { key: 'mobile', label: 'Mobile' },
] as const;

export const FILTER_KEYS: readonly FilterKey[] = FILTERS.map(({ key }) => key);

export function isFilterKey(value: string): value is FilterKey {
  return (FILTER_KEYS as readonly string[]).includes(value);
}

/**
 * A case study matches when every selected filter flag is set on it.
 * With no filters selected, everything matches.
 */
export function matchesFilters(
  flags: CaseStudyFilterFlags,
  selected: readonly FilterKey[],
): boolean {
  return selected.every((key) => flags[key]);
}
