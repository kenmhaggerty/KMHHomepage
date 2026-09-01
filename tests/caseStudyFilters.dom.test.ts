import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flagsFromDataset, initCaseStudyFilters } from '../src/scripts/caseStudyFilters';

function renderWorkPage() {
  document.body.innerHTML = `
    <button class="chip" data-filter-chip="gov_dod" aria-pressed="false">Gov / DoD</button>
    <button class="chip" data-filter-chip="mobile" aria-pressed="false">Mobile</button>
    <button class="chip" data-filter-chip="bogus" aria-pressed="false">Bogus</button>
    <a data-case-study="gfm"
       data-filter-zero-to-one="false" data-filter-consumer="false"
       data-filter-gov-dod="true" data-filter-mobile="false"></a>
    <a data-case-study="app"
       data-filter-zero-to-one="true" data-filter-consumer="true"
       data-filter-gov-dod="false" data-filter-mobile="true"></a>
  `;
}

function chip(key: string): HTMLButtonElement {
  const el = document.querySelector<HTMLButtonElement>(`[data-filter-chip="${key}"]`);
  if (!el) throw new Error(`no ${key} chip`);
  return el;
}

function panel(key: string): HTMLElement {
  const el = document.querySelector<HTMLElement>(`[data-case-study="${key}"]`);
  if (!el) throw new Error(`no ${key} panel`);
  return el;
}

beforeEach(() => {
  renderWorkPage();
});

describe('flagsFromDataset', () => {
  it('reads all four flags from data attributes', () => {
    expect(flagsFromDataset(panel('gfm').dataset)).toEqual({
      zero_to_one: false,
      consumer: false,
      gov_dod: true,
      mobile: false,
    });
  });

  it('treats missing attributes as false', () => {
    expect(flagsFromDataset(document.createElement('div').dataset)).toEqual({
      zero_to_one: false,
      consumer: false,
      gov_dod: false,
      mobile: false,
    });
  });
});

describe('initCaseStudyFilters', () => {
  it('hides panels that do not match a selected filter', () => {
    initCaseStudyFilters(document);
    chip('gov_dod').click();
    expect(chip('gov_dod').getAttribute('aria-pressed')).toBe('true');
    expect(panel('gfm').hidden).toBe(false);
    expect(panel('app').hidden).toBe(true);
  });

  it('shows everything again when the filter is deselected', () => {
    initCaseStudyFilters(document);
    chip('gov_dod').click();
    chip('gov_dod').click();
    expect(chip('gov_dod').getAttribute('aria-pressed')).toBe('false');
    expect(panel('gfm').hidden).toBe(false);
    expect(panel('app').hidden).toBe(false);
  });

  it('selecting a chip replaces the one already selected', () => {
    initCaseStudyFilters(document);
    chip('gov_dod').click();
    chip('mobile').click();
    expect(chip('gov_dod').getAttribute('aria-pressed')).toBe('false');
    expect(chip('mobile').getAttribute('aria-pressed')).toBe('true');
    // Only the mobile filter is left, so the mobile study is back on show.
    expect(panel('gfm').hidden).toBe(true);
    expect(panel('app').hidden).toBe(false);
  });

  it('never leaves more than one chip selected', () => {
    initCaseStudyFilters(document);
    chip('gov_dod').click();
    chip('mobile').click();
    chip('gov_dod').click();
    expect(document.querySelectorAll('[data-filter-chip][aria-pressed="true"]')).toHaveLength(1);
  });

  it('clears the filter when the selected chip is clicked again', () => {
    initCaseStudyFilters(document);
    chip('mobile').click();
    chip('mobile').click();
    expect(document.querySelectorAll('[data-filter-chip][aria-pressed="true"]')).toHaveLength(0);
    expect(panel('gfm').hidden).toBe(false);
    expect(panel('app').hidden).toBe(false);
  });

  it('re-selects a chip that was cleared', () => {
    initCaseStudyFilters(document);
    chip('mobile').click();
    chip('mobile').click();
    chip('mobile').click();
    expect(chip('mobile').getAttribute('aria-pressed')).toBe('true');
    expect(panel('gfm').hidden).toBe(true);
    expect(panel('app').hidden).toBe(false);
  });

  it('notifies listeners when the filter changes', () => {
    initCaseStudyFilters(document);
    const listener = vi.fn();
    document.addEventListener('casestudyfilterschange', listener);
    chip('mobile').click();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('ignores chips with unknown filter keys', () => {
    initCaseStudyFilters(document);
    chip('bogus').click();
    expect(panel('gfm').hidden).toBe(false);
    expect(panel('app').hidden).toBe(false);
  });

  it('does nothing on pages without chips', () => {
    document.body.innerHTML = '<a data-case-study="gfm"></a>';
    expect(() => initCaseStudyFilters(document)).not.toThrow();
  });
});
