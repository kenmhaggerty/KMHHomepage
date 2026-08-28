import { describe, expect, it } from 'vitest';
import { about, caseStudies, getCaseStudy, imageUrl, siteInfo } from '../src/data/site';

describe('siteInfo', () => {
  it('exposes the site-info.json contents', () => {
    expect(siteInfo.title).toBe('Ken M. Haggerty');
    expect(siteInfo.footer).toMatch(/Ken M\. Haggerty/);
    expect(siteInfo.favicon).toBe('favicon.png');
  });
});

describe('about', () => {
  it('provides the About Me copy from the design', () => {
    expect(about.title).toBe('About Me');
    expect(about.paragraphs).toHaveLength(2);
    expect(about.paragraphs[0]).toMatch(/intersectional thinking/);
  });
});

describe('caseStudies', () => {
  it('loads every JSON file in case-studies/', () => {
    expect(caseStudies.length).toBeGreaterThanOrEqual(1);
    expect(caseStudies.map((cs) => cs.key)).toContain('gfm');
  });

  it('finds case studies by key', () => {
    expect(getCaseStudy('gfm')?.title).toBe('GFM');
    expect(getCaseStudy('does-not-exist')).toBeUndefined();
  });
});

describe('imageUrl', () => {
  it('maps data filenames to public image URLs', () => {
    expect(imageUrl('gfm-1.png')).toBe('/images/gfm-1.png');
  });
});
