import { describe, expect, it } from 'vitest';
import { about, caseStudies, getCaseStudy, imageAsset, siteInfo } from '../src/data/site';

/*
 * Names only -- the glob is lazy, so nothing here decodes an icon. The project
 * has no Node type definitions, so this stands in for reading the directory.
 */
const publicFiles = import.meta.glob('../public/*');
const publicFileNames = new Set(
  Object.keys(publicFiles).map((path) => path.slice(path.lastIndexOf('/') + 1)),
);

describe('siteInfo', () => {
  it('exposes the site-info.json contents', () => {
    expect(siteInfo.title).toBe('Ken M. Haggerty');
    expect(siteInfo.footer).toMatch(/Ken M\. Haggerty/);
  });

  it('names every icon the head links to', () => {
    expect(siteInfo.icons).toEqual({
      ico: 'favicon.ico',
      svg: 'favicon.svg',
      png: 'favicon.png',
      appleTouch: 'apple-touch-icon.png',
    });
  });

  it('points every icon and the share image at files that are in public/', () => {
    // These are served untouched from public/, so nothing at build time
    // notices if one is renamed -- it just quietly stops loading, and for the
    // share image that means a blank card wherever the site is posted.
    for (const file of [...Object.values(siteInfo.icons), siteInfo.openGraph.image]) {
      expect(publicFileNames.has(file), `missing public/${file}`).toBe(true);
    }
  });

  it('carries the share card copy', () => {
    expect(siteInfo.openGraph.title).toBe('Case Studies • Ken M. Haggerty');
    expect(siteInfo.openGraph.description).toMatch(/multi-disciplinary product lead/);
    // Cards get truncated well before this; the limit is a rough guard.
    expect(siteInfo.openGraph.description.length).toBeLessThanOrEqual(300);
  });

  it('gives an absolute production origin for share and canonical URLs', () => {
    expect(siteInfo.url).toMatch(/^https:\/\//);
    expect(siteInfo.url).not.toMatch(/\/$/);
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

describe('imageAsset', () => {
  it('resolves a data filename to the imported asset', () => {
    const image = imageAsset('gfm-1.png');
    expect(image.src).toContain('gfm-1');
    // Intrinsic dimensions are what let <Image> reserve space and resize.
    expect(image.width).toBeGreaterThan(0);
    expect(image.height).toBeGreaterThan(0);
  });

  it('throws on a filename with no matching file, rather than emitting a dead URL', () => {
    expect(() => imageAsset('not-a-real-image.png')).toThrow(/not-a-real-image\.png/);
  });

  it('resolves every image the case study data references', () => {
    for (const caseStudy of caseStudies) {
      expect(() => imageAsset(caseStudy.hero.desktop)).not.toThrow();
      expect(() => imageAsset(caseStudy.hero.mobile)).not.toThrow();
      for (const item of caseStudy.gallery) {
        expect(() => imageAsset(item.preview)).not.toThrow();
        expect(() => imageAsset(item.full_res)).not.toThrow();
      }
    }
  });
});
