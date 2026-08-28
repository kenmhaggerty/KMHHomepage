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
  it('orders case studies by module path', () => {
    const result = loadCaseStudies({
      'b.json': { ...valid, key: 'b' },
      'a.json': { ...valid, key: 'a' },
    });
    expect(result.map((cs) => cs.key)).toEqual(['a', 'b']);
  });

  it('propagates validation errors with the file path', () => {
    expect(() => loadCaseStudies({ 'broken.json': {} })).toThrow(/broken\.json/);
  });
});
