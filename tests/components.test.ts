// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import SiteHeader from '../src/components/SiteHeader.astro';
import SiteFooter from '../src/components/SiteFooter.astro';
import ViewportToggle from '../src/components/ViewportToggle.astro';
import Icon from '../src/components/Icon.astro';
import LinkUrl from '../src/components/LinkUrl.astro';
import Section from '../src/components/Section.astro';
import CaseStudyPanel from '../src/components/CaseStudyPanel.astro';
import { getCaseStudy } from '../src/data/site';

async function render(component: Parameters<AstroContainer['renderToString']>[0], options = {}) {
  const container = await AstroContainer.create();
  return container.renderToString(component, options);
}

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
    expect(html).toContain('/images/gfm-1-preview.png');
    expect(html).toContain('/images/gfm-hero-mobile.png');
    expect(html).toContain('data-filter-gov-dod="true"');
    expect(html).toContain('data-filter-consumer="false"');
    expect(html).toContain('GFM');
    expect(html).toContain('US Army');
  });
});
