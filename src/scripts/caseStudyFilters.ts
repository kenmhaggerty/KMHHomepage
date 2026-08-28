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
 * Wires up the Work-page filter chips: clicking a chip toggles it, and case
 * study panels that don't match every selected filter are hidden.
 */
export function initCaseStudyFilters(doc: Document): void {
  const chips = [...doc.querySelectorAll<HTMLButtonElement>('[data-filter-chip]')];
  const panels = [...doc.querySelectorAll<HTMLElement>('[data-case-study]')];
  if (chips.length === 0) {
    return;
  }

  const selected = new Set<FilterKey>();

  const apply = () => {
    const keys = [...selected];
    for (const panel of panels) {
      panel.hidden = !matchesFilters(flagsFromDataset(panel.dataset), keys);
    }
    doc.dispatchEvent(new CustomEvent('casestudyfilterschange'));
  };

  for (const chip of chips) {
    const key = chip.dataset.filterChip;
    if (!key || !isFilterKey(key)) {
      continue;
    }
    chip.addEventListener('click', () => {
      if (selected.has(key)) {
        selected.delete(key);
      } else {
        selected.add(key);
      }
      chip.setAttribute('aria-pressed', String(selected.has(key)));
      apply();
    });
  }
}
