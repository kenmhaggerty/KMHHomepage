// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import SiteHeader from '../src/components/SiteHeader.astro';
import SiteFooter from '../src/components/SiteFooter.astro';
import ViewportToggle from '../src/components/ViewportToggle.astro';
import DarkModeToggle from '../src/components/DarkModeToggle.astro';
import Icon from '../src/components/Icon.astro';
import LinkUrl from '../src/components/LinkUrl.astro';
import Section from '../src/components/Section.astro';
import CaseStudyPanel from '../src/components/CaseStudyPanel.astro';
import { getCaseStudy } from '../src/data/site';

async function render(component: Parameters<AstroContainer['renderToString']>[0], options = {}) {
  const container = await AstroContainer.create();
  return container.renderToString(component, options);
}

describe('DarkModeToggle', () => {
  it('renders a sun button then a moon button', async () => {
    const html = await render(DarkModeToggle);
    expect(html).toContain('data-theme-button="light"');
    expect(html).toContain('data-theme-button="dark"');
    // The sun sits to the left of the moon.
    expect(html.indexOf('data-theme-button="light"')).toBeLessThan(
      html.indexOf('data-theme-button="dark"'),
    );
  });

  it('shares the toggle styling with the viewport toggle', async () => {
    const html = await render(DarkModeToggle);
    const viewport = await render(ViewportToggle);
    expect(html).toContain('class="icon-toggle theme-toggle"');
    expect(viewport).toContain('class="icon-toggle viewport-toggle"');
  });
});

describe('SiteHeader', () => {
  it('renders the faux-small-caps site title', async () => {
    const html = await render(SiteHeader);
    expect(html).toContain('class="site-title"');
    expect(html).toMatch(/<span class="small-caps"[^>]*>en<\/span>/);
    expect(html).toMatch(/<span class="small-caps"[^>]*>aggerty<\/span>/);
  });

  it('renders the three navigation links separated by bullets', async () => {
    const html = await render(SiteHeader);
    expect(html).toMatch(/>\s*Work\s*<\/a>/);
    expect(html).toMatch(/>\s*Résumé\s*<\/a>/);
    expect(html).toMatch(/>\s*Blog\s*<\/a>/);
    expect(html.match(/class="bullet"/g)).toHaveLength(2);
  });
});

describe('SiteFooter', () => {
  it('renders the footer text from site-info.json', async () => {
    const html = await render(SiteFooter);
    expect(html).toContain('Ken M. Haggerty © 2026');
  });
});

describe('ViewportToggle', () => {
  it('renders both mode buttons', async () => {
    const html = await render(ViewportToggle);
    expect(html).toContain('data-mode-button="mobile"');
    expect(html).toContain('data-mode-button="desktop"');
  });
});

describe('Icon', () => {
  it('renders an inline SVG for each icon name', async () => {
    for (const name of ['chevron-back', 'link', 'iphone', 'macbook'] as const) {
      const html = await render(Icon, { props: { name } });
      expect(html).toContain('<svg');
      expect(html).toContain('aria-hidden="true"');
    }
  });
});

describe('LinkUrl', () => {
  it('renders an external link with icon and title', async () => {
    const html = await render(LinkUrl, {
      props: { link: { title: 'DecisionPoint Corporation', url: 'https://decisionpointcorp.com' } },
    });
    expect(html).toContain('href="https://decisionpointcorp.com"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('DecisionPoint Corporation');
  });
});

describe('Section', () => {
  it('renders html_content sections', async () => {
    const html = await render(Section, {
      props: { section: { title: 'Overview', html_content: '<p>Global Freight Management</p>' } },
    });
    expect(html).toContain('Overview');
    expect(html).toContain('<p>Global Freight Management</p>');
  });

  it('renders footnotes from the section data, styled as one bordered block', async () => {
    const html = await render(Section, {
      props: {
        section: {
          title: 'Impact',
          html_content: '<p>Supports over 300,000 residents.<sup>1</sup></p>',
          footnotes: [{ id: 1, html_content: 'As of Sep 2026' }],
        },
      },
    });
    // One paragraph carries the rule and spacing; each note is a line in it.
    expect(html.match(/class="section-footnotes"/g)).toHaveLength(1);
    // Matched loosely: the container adds data-astro-source-* attributes in
    // dev that the built output does not carry.
    expect(html).toMatch(/<span class="footnote"[^>]*><sup>1<\/sup>As of Sep 2026<\/span>/);
    // The notes sit inside .section-body, which is where their styling is
    // resolved against -- the prose font size, spacing, and link colour.
    expect(html.indexOf('class="section-body"')).toBeLessThan(
      html.indexOf('class="section-footnotes"'),
    );
    expect(html.indexOf('300,000 residents')).toBeLessThan(html.indexOf('As of Sep 2026'));
  });

  it('leaves no gap between the marker and the note', async () => {
    // The <sup> carries a 4px right margin; a whitespace text node between the
    // two would widen that, so the marker and note are emitted as one string.
    const html = await render(Section, {
      props: { section: { title: 'Impact', footnotes: [{ id: 2, html_content: 'Note' }] } },
    });
    expect(html).toContain('<sup>2</sup>Note');
  });

  it('keeps markup inside a footnote, so notes can cite a source', async () => {
    const html = await render(Section, {
      props: {
        section: {
          title: 'Impact',
          footnotes: [{ id: 1, html_content: "Via <a href='https://example.com'>a source</a>" }],
        },
      },
    });
    expect(html).toContain("<a href='https://example.com'>a source</a>");
  });

  it('stacks several footnotes as lines under a single rule', async () => {
    const html = await render(Section, {
      props: {
        section: {
          title: 'Impact',
          footnotes: [
            { id: 1, html_content: 'First' },
            { id: 2, html_content: 'Second' },
          ],
        },
      },
    });
    expect(html.match(/class="section-footnotes"/g)).toHaveLength(1);
    expect(html.match(/class="footnote"/g)).toHaveLength(2);
    expect(html.indexOf('<sup>1</sup>')).toBeLessThan(html.indexOf('<sup>2</sup>'));
  });

  it('renders footnotes for a section that has no prose of its own', async () => {
    const html = await render(Section, {
      props: { section: { title: 'Impact', footnotes: [{ id: 1, html_content: 'Standalone' }] } },
    });
    expect(html).toContain('class="section-body"');
    expect(html).toContain('Standalone');
  });

  it('adds nothing when a section has no footnotes', async () => {
    const withoutKey = await render(Section, {
      props: { section: { title: 'Overview', html_content: '<p>Prose</p>' } },
    });
    const withEmptyArray = await render(Section, {
      props: { section: { title: 'Overview', html_content: '<p>Prose</p>', footnotes: [] } },
    });
    expect(withoutKey).not.toContain('section-footnotes');
    expect(withEmptyArray).not.toContain('section-footnotes');
  });

  it('renders link sections as LinkUrl rows', async () => {
    const html = await render(Section, {
      props: {
        section: {
          title: 'Links',
          links: [
            { title: 'A', url: 'https://a.example' },
            { title: 'B', url: 'https://b.example' },
          ],
        },
      },
    });
    expect(html.match(/class="link-url"/g)).toHaveLength(2);
  });
});

describe('CaseStudyPanel', () => {
  it('renders the GFM panel with hero images, overlay, and filter data', async () => {
    const gfm = getCaseStudy('gfm');
    expect(gfm).toBeDefined();
    const html = await render(CaseStudyPanel, { props: { caseStudy: gfm } });
    expect(html).toContain('href="/work/gfm/"');
    // <Image> emits processed assets, so match the stem rather than the path.
    expect(html).toMatch(/src="[^"]*gfm-1-preview[^"]*"/);
    expect(html).toMatch(/src="[^"]*gfm-hero-mobile[^"]*"/);
    // Intrinsic dimensions come along, which is what stops the layout shifting.
    expect(html).toMatch(/width="\d+"/);
    expect(html).toMatch(/height="\d+"/);
    expect(html).toContain('data-filter-gov-dod="true"');
    expect(html).toContain('data-filter-consumer="false"');
    expect(html).toContain('GFM');
    expect(html).toContain('US Army');
  });
});
