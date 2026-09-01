import { describe, expect, it } from 'vitest';
import { loadCaseStudies, parseCaseStudy } from '../src/utils/caseStudies';
import gfm from '../case-studies/gfm.json';

const valid = {
  key: 'x',
  title: 'X',
  company: 'Acme',
  year: '2026',
  filters: { zero_to_one: true, consumer: false, gov_dod: false, mobile: false },
  hero: { desktop: 'x.png', mobile: 'x-m.png', alt_text: 'X' },
  gallery: [],
  sections: [],
};

describe('parseCaseStudy', () => {
  it('accepts the real gfm.json content', () => {
    const parsed = parseCaseStudy(gfm, 'gfm.json');
    expect(parsed.key).toBe('gfm');
    expect(parsed.title).toBe('GFM');
    expect(parsed.company).toBe('US Army');
    expect(parsed.gallery).toHaveLength(3);
    expect(parsed.sections.map((s) => s.title)).toContain('Links');
  });

  it('accepts a minimal valid case study', () => {
    expect(parseCaseStudy(valid).key).toBe('x');
  });

  it('rejects non-objects', () => {
    expect(() => parseCaseStudy(null)).toThrow(/expected an object/);
    expect(() => parseCaseStudy([])).toThrow(/expected an object/);
    expect(() => parseCaseStudy('gfm')).toThrow(/expected an object/);
  });

  it('rejects missing required strings', () => {
    for (const field of ['key', 'title', 'company', 'year']) {
      expect(() => parseCaseStudy({ ...valid, [field]: '' }, 'bad.json')).toThrow(
        new RegExp(`bad\\.json.*"${field}"`),
      );
    }
  });

  it('rejects missing filters, hero, gallery, and sections', () => {
    expect(() => parseCaseStudy({ ...valid, filters: undefined })).toThrow(/filters/);
    expect(() => parseCaseStudy({ ...valid, hero: {} })).toThrow(/hero/);
    expect(() => parseCaseStudy({ ...valid, gallery: 'nope' })).toThrow(/gallery/);
    expect(() => parseCaseStudy({ ...valid, sections: {} })).toThrow(/sections/);
  });
});

describe('loadCaseStudies', () => {
  it('orders case studies by their index, not by file name', () => {
    const result = loadCaseStudies({
      'a.json': { ...valid, key: 'a', index: 2 },
      'b.json': { ...valid, key: 'b', index: 0 },
      'c.json': { ...valid, key: 'c', index: 1 },
    });
    expect(result.map((cs) => cs.key)).toEqual(['b', 'c', 'a']);
  });

  it('keeps the glob order when indexes tie', () => {
    const result = loadCaseStudies({
      'b.json': { ...valid, key: 'b', index: 0 },
      'a.json': { ...valid, key: 'a', index: 0 },
    });
    expect(result.map((cs) => cs.key)).toEqual(['b', 'a']);
  });

  it('validates every entry, not just the first', () => {
    expect(() =>
      loadCaseStudies({ 'ok.json': { ...valid, index: 0 }, 'bad.json': { ...valid, key: '' } }),
    ).toThrow(/bad\.json/);
  });

  it('returns an empty list for an empty glob', () => {
    expect(loadCaseStudies({})).toEqual([]);
  });

  it('propagates validation errors with the file path', () => {
    expect(() => loadCaseStudies({ 'broken.json': {} })).toThrow(/broken\.json/);
  });
});
