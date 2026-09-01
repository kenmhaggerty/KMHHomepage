// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import Index from '../src/pages/index.astro';
import Resume from '../src/pages/resume.astro';
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
    // Images go through Astro's pipeline, so the URL is a processed one whose
    // shape differs between dev and build -- match the file stem, which does
    // not. The link still points at the untouched full-resolution original.
    expect(html).toMatch(/src="[^"]*gfm-1-preview[^"]*"/);
    expect(html).toMatch(/href="[^"]*gfm-1\.png[^"]*"/);
    // Intrinsic dimensions come with it, which is what reserves the space.
    expect(html).toMatch(/width="\d+" height="\d+"/);
    // Sections come straight from the JSON.
    for (const title of ['Overview', 'Role', 'Initial Objectives', 'Solution', 'Impact', 'Links']) {
      expect(html).toContain(title);
    }
    expect(html).toContain('https://decisionpointcorp.com');
  });
});

describe('Résumé page', () => {
  it('embeds the PDF and fills the window rather than hugging it', async () => {
    const html = await render(Resume);
    expect(html).toContain('<title>Résumé · Ken M. Haggerty</title>');
    expect(html).toContain('Ken M Haggerty (Resume).pdf');
    expect(html).toContain('fill-height');
  });

  it('offers the PDF as a download, for phones where the viewer is awkward', async () => {
    const html = await render(Resume);
    expect(html).toMatch(/<a[^>]*class="resume-download"[^>]*download[^>]*>/);
    expect(html).toContain('Download PDF');
  });
});
