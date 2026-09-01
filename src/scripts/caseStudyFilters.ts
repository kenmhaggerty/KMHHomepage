import { isFilterKey, matchesFilters } from '../utils/filters';
import type { CaseStudyFilterFlags, FilterKey } from '../types';

export function flagsFromDataset(dataset: DOMStringMap): CaseStudyFilterFlags {
  return {
    zero_to_one: dataset.filterZeroToOne === 'true',
    consumer: dataset.filterConsumer === 'true',
    gov_dod: dataset.filterGovDod === 'true',
    mobile: dataset.filterMobile === 'true',
  };
}

/**
 * Wires up the Work-page filter chips. One filter applies at a time: picking a
 * chip replaces whatever was selected, and picking the selected chip again
 * clears it. Case study panels that don't match the selected filter are hidden.
 */
export function initCaseStudyFilters(doc: Document): void {
  const chips = [...doc.querySelectorAll<HTMLButtonElement>('[data-filter-chip]')];
  const panels = [...doc.querySelectorAll<HTMLElement>('[data-case-study]')];
  if (chips.length === 0) {
    return;
  }

  const filterChips = chips.flatMap((chip) => {
    const key = chip.dataset.filterChip;
    return key && isFilterKey(key) ? [{ chip, key }] : [];
  });

  let selected: FilterKey | null = null;

  const apply = () => {
    const keys = selected ? [selected] : [];
    for (const panel of panels) {
      panel.hidden = !matchesFilters(flagsFromDataset(panel.dataset), keys);
    }
    for (const { chip, key } of filterChips) {
      chip.setAttribute('aria-pressed', String(key === selected));
    }
    doc.dispatchEvent(new CustomEvent('casestudyfilterschange'));
  };

  for (const { chip, key } of filterChips) {
    chip.addEventListener('click', () => {
      selected = selected === key ? null : key;
      apply();
    });
  }
}
