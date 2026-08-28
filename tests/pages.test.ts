// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import Index from '../src/pages/index.astro';
import Resume from '../src/pages/resume.astro';
import Blog from '../src/pages/blog.astro';
import ProjectPage, { getStaticPaths } from '../src/pages/work/[slug].astro';
import { getCaseStudy } from '../src/data/site';

async function render(component: Parameters<AstroContainer['renderToString']>[0], options = {}) {
  const container = await AstroContainer.create();
  return container.renderToString(component, options);
}

describe('Work page (index)', () => {
  it('renders the About Me section and case study panels', async () => {
    const html = await render(Index);
    expect(html).toContain('About Me');
    expect(html).toContain('intersectional thinking');
    expect(html).toContain('Case Studies');
    expect(html).toContain('data-case-study="gfm"');
  });

  it('renders all four filter chips', async () => {
    const html = await render(Index);
    for (const key of ['zero_to_one', 'consumer', 'gov_dod', 'mobile']) {
      expect(html).toContain(`data-filter-chip="${key}"`);
    }
  });

  it('renders the site chrome (toggle, header, footer)', async () => {
    const html = await render(Index);
    expect(html).toContain('data-mode-button="desktop"');
    expect(html).toContain('class="site-title"');
    expect(html).toContain('Ken M. Haggerty © 2026');
    expect(html).toContain('<title>Ken M. Haggerty</title>');
  });
});

describe('Project page', () => {
  it('exposes a static path for each case study', () => {
    const paths = getStaticPaths();
    expect(paths.map((p) => p.params.slug)).toContain('gfm');
  });

  it('renders the GFM case study from its JSON data', async () => {
    const caseStudy = getCaseStudy('gfm');
    const html = await render(ProjectPage, { props: { caseStudy } });
    expect(html).toContain('<title>GFM · Ken M. Haggerty</title>');
    expect(html).toContain('Back');
    expect(html).toContain('US Army');
    expect(html).toContain('2026');
    // Gallery: preview images link to the full-resolution versions.
    expect(html).toContain('/images/gfm-1-preview.png');
    expect(html).toContain('href="/images/gfm-1.png"');
    // Sections come straight from the JSON.
    for (const title of ['Overview', 'Role', 'Initial Objectives', 'Solution', 'Impact', 'Links']) {
      expect(html).toContain(title);
    }
    expect(html).toContain('https://decisionpointcorp.com');
  });
});

describe('Placeholder pages', () => {
  it('renders the résumé page', async () => {
    const html = await render(Resume);
    expect(html).toContain('<title>Résumé · Ken M. Haggerty</title>');
    expect(html).toContain('Coming soon.');
  });

  it('renders the blog page', async () => {
    const html = await render(Blog);
    expect(html).toContain('<title>Blog · Ken M. Haggerty</title>');
    expect(html).toContain('Coming soon.');
  });
});
