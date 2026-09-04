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
    expect(siteInfo.description).toMatch(/building software/);
    expect(siteInfo.owner).toBe('Ken M. Haggerty');
    expect(siteInfo.footer).toMatch(/Ken M\. Haggerty/);
  });

  it('names every icon the head links to', () => {
    expect(siteInfo.icons).toEqual({
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
    /* openGraph.title and .description are optional overrides, for a card
       that should read differently from the page. site-info.json sets
       neither, so the copy the card actually gets is the site's own. */
    const cardTitle = siteInfo.openGraph.title ?? siteInfo.title;
    const cardDescription = siteInfo.openGraph.description ?? siteInfo.description;
    expect(cardTitle).toMatch(/Ken M\. Haggerty/);
    expect(cardDescription).toBe(siteInfo.description);
    // Cards get truncated well before this; the limit is a rough guard.
    expect(cardDescription.length).toBeLessThanOrEqual(300);
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

describe('case study footnotes', () => {
  const sections = caseStudies.flatMap((caseStudy) =>
    caseStudy.sections.map((section) => ({ caseStudy: caseStudy.key, section })),
  );

  it('has at least one section carrying footnotes, so the rendering is exercised', () => {
    expect(sections.some(({ section }) => section.footnotes?.length)).toBe(true);
  });

  it('gives every footnote a distinct marker and some content', () => {
    for (const { caseStudy, section } of sections) {
      const footnotes = section.footnotes ?? [];
      const ids = footnotes.map((footnote) => footnote.id);
      expect(new Set(ids).size, `duplicate marker in ${caseStudy}/${section.title}`).toBe(
        ids.length,
      );
      for (const footnote of footnotes) {
        expect(footnote.html_content.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('leaves the footnote block to the component rather than hand-writing it in prose', () => {
    // Both at once would render the notes twice, and only the generated copy
    // stays in step with the footnotes data.
    for (const { caseStudy, section } of sections) {
      expect(
        section.html_content ?? '',
        `${caseStudy}/${section.title} still writes its own footnote block`,
      ).not.toContain('section-footnotes');
    }
  });

  it('backs every <sup> marker in prose with a footnote of the same number', () => {
    for (const { caseStudy, section } of sections) {
      const markers = [...(section.html_content ?? '').matchAll(/<sup>(\d+)<\/sup>/g)].map(
        (match) => Number(match[1]),
      );
      const ids = new Set((section.footnotes ?? []).map((footnote) => footnote.id));
      for (const marker of markers) {
        expect(ids.has(marker), `${caseStudy}/${section.title} cites ${marker} with no note`).toBe(
          true,
        );
      }
    }
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
