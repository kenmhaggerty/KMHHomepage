// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import SiteHeader from '../src/components/SiteHeader.astro';
import SiteFooter from '../src/components/SiteFooter.astro';
import ViewportToggle from '../src/components/ViewportToggle.astro';
import DarkModeToggle from '../src/components/DarkModeToggle.astro';
import Icon from '../src/components/Icon.astro';
import IconLink from '../src/components/IconLink.astro';
import LinkUrl from '../src/components/LinkUrl.astro';
import Section from '../src/components/Section.astro';
import ImageLightbox from '../src/components/ImageLightbox.astro';
import ChangelogModal from '../src/components/ChangelogModal.astro';
import CaseStudyPanel from '../src/components/CaseStudyPanel.astro';
import { getCaseStudy, siteInfo, svgIconSource } from '../src/data/site';
import { inlineSvg } from '../src/utils/svgIcon';

/** The `d` of the first path in some inlined markup, to match against. */
function firstPathData(content: string): string {
  const data = content.match(/d="[^"]+"/)?.[0];
  expect(data, 'inlined markup has no path').toBeTruthy();
  return data ?? '';
}

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

  it('makes the version itself the changelog trigger', async () => {
    const html = await render(SiteFooter);
    // A button, not a clickable <p>: it has to be reachable by keyboard and
    // announced as a control, and its name is the version text it shows.
    expect(html).toMatch(/<button[^>]*class="version-button"[^>]*data-changelog-open/);
    expect(html).toMatch(/data-changelog-open[\s\S]*?v3\.\d+\.\d+/);
    expect(html).toContain('aria-haspopup="dialog"');
  });

  it('carries the changelog modal, so the button has something to open', async () => {
    const html = await render(SiteFooter);
    expect(html).toContain('data-changelog');
  });

  it('renders one external link per entry in site-info.json, in that order', async () => {
    const html = await render(SiteFooter);
    expect(html.match(/class="icon-link"/g)).toHaveLength(siteInfo.footer.links.length);
    const positions = siteInfo.footer.links.map((link) => html.indexOf(`href="${link.url}"`));
    expect(positions).not.toContain(-1);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  it('opens each link in a new tab, named by its tooltip', async () => {
    const html = await render(SiteFooter);
    for (const link of siteInfo.footer.links) {
      const anchor = html.match(new RegExp(`<a[^>]*href="${link.url}"[^>]*>`))?.[0] ?? '';
      expect(anchor, `no anchor for ${link.url}`).not.toBe('');
      expect(anchor).toContain('target="_blank"');
      // Without noopener the opened tab can reach back into this one.
      expect(anchor).toContain('rel="noopener noreferrer"');
      // title is the tooltip; aria-label is the same text, because the icon
      // alone carries the meaning of the link.
      expect(anchor).toContain(`title="${link.tooltip}"`);
      expect(anchor).toContain(`aria-label="${link.tooltip}"`);
    }
  });

  /* The footer also carries the changelog modal, whose close button is an
     Icon -- so the row of links has to be cut out before counting glyphs. */
  async function renderExternalLinks(): Promise<string> {
    const html = await render(SiteFooter);
    const row = html.match(/<p class="site-external-links"[^>]*>[\s\S]*?<\/p>/)?.[0];
    expect(row, 'no external links row in the footer').toBeTruthy();
    return row ?? '';
  }

  it('inlines every icon the data names, so each one takes the link colour', async () => {
    const row = await renderExternalLinks();
    // Slugs and local files land in the same <svg>, and fill="currentColor"
    // is what lets one CSS rule grey them all and darken them on hover.
    expect(row.match(/<svg class="icon"[^>]*fill="currentColor"/g)).toHaveLength(
      siteInfo.footer.links.length,
    );
    // Read from the package and the file rather than pasted in, so swapping
    // an icon out is not a test to rewrite.
    const { siGithub } = await import('simple-icons');
    expect(row).toContain(`d="${siGithub.path}"`);
    const linkedin = inlineSvg(svgIconSource('linkedin.svg'));
    expect(row).toContain(`viewBox="${linkedin.viewBox}"`);
    expect(row).toContain(firstPathData(linkedin.content));
  });

  it('leaves no hard-coded fill on an icon read from a file', async () => {
    const row = await renderExternalLinks();
    // A fill of its own would outrank the <svg>'s currentColor, and the mark
    // would stay black in both themes. linkedin.svg ships with one.
    const svgs = row.match(/<svg class="icon"[\s\S]*?<\/svg>/g) ?? [];
    expect(svgs).toHaveLength(siteInfo.footer.links.length);
    for (const svg of svgs) {
      expect(svg.match(/fill="[^"]*"/g)).toEqual(['fill="currentColor"']);
    }
  });
});

describe('IconLink', () => {
  const url = 'https://example.com/profile';
  const linkedin = inlineSvg(svgIconSource('linkedin.svg'));

  it('renders a Simple Icons slug as one path', async () => {
    const html = await render(IconLink, {
      props: { url, tooltip: 'GitHub', icon: { simpleIcon: 'github' } },
    });
    expect(html).toContain('viewBox="0 0 24 24"');
    expect(html.match(/<path/g)).toHaveLength(1);
  });

  it('fails the build on a slug Simple Icons does not have', async () => {
    await expect(
      render(IconLink, { props: { url, tooltip: 'Nope', icon: { simpleIcon: 'notareal' } } }),
    ).rejects.toThrow(/notareal/);
  });

  it('inlines a local SVG at the scale its own viewBox sets', async () => {
    const html = await render(IconLink, {
      props: { url, tooltip: 'LinkedIn', icon: { svg: 'linkedin.svg' } },
    });
    // The file's own viewBox, whatever it is: its path data is drawn against
    // that, so an assumed 24-square would render the glyph at the wrong size.
    expect(html).toContain(`viewBox="${linkedin.viewBox}"`);
    // The file is drawn at its own size and wrapped in a prolog and a
    // doctype; the page gets the shapes at the size asked for, and nothing
    // else. One <svg>, ours -- the file's root is not nested inside it.
    expect(html).toContain('width="16"');
    expect(html).not.toContain('<?xml');
    expect(html).not.toContain('DOCTYPE');
    expect(html.match(/<svg/g)).toHaveLength(1);
  });

  it('fails the build on an SVG that is not in src/assets/icons', async () => {
    await expect(
      render(IconLink, { props: { url, tooltip: 'Nope', icon: { svg: 'not-a-real-icon.svg' } } }),
    ).rejects.toThrow(/not-a-real-icon\.svg/);
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

describe('ImageLightbox', () => {
  it('renders a labelled dialog with a close button and an empty image', async () => {
    const html = await render(ImageLightbox);
    expect(html).toContain('<dialog');
    expect(html).toContain('data-lightbox');
    expect(html).toContain('aria-label="Image viewer"');
    expect(html).toContain('aria-label="Close image viewer"');
    expect(html).toContain('data-lightbox-image');
    // No src until something is opened -- an empty src attribute makes some
    // browsers re-request the page itself.
    expect(html).not.toMatch(/<img[^>]*\ssrc=/);
  });

  it('starts closed, since a dialog without [open] is hidden by the browser', async () => {
    const html = await render(ImageLightbox);
    expect(html).not.toMatch(/<dialog[^>]*\sopen/);
  });
});

describe('ChangelogModal', () => {
  it('renders the compiled CHANGELOG.md inside a labelled dialog', async () => {
    const html = await render(ChangelogModal);
    expect(html).toContain('<dialog');
    expect(html).toContain('aria-label="Changelog"');
    expect(html).toContain('aria-label="Close changelog"');
    // Compiled from the markdown at build time, so the file stays the single
    // source for what shipped when.
    expect(html).toContain('CHANGELOG');
    expect(html).toContain('<table>');
    expect(html).toContain('Relaunch website');
  });

  it('shares the modal shell with the image viewer', async () => {
    const changelog = await render(ChangelogModal);
    const lightbox = await render(ImageLightbox);
    // One set of scrim, fade and close-button rules serves both -- including
    // the iOS backdrop behaviour, which is not worth having two copies of.
    for (const html of [changelog, lightbox]) {
      expect(html).toMatch(/<dialog[^>]*class="modal /);
      expect(html).toContain('class="modal-close"');
    }
  });

  it('starts closed, since a dialog without [open] is hidden by the browser', async () => {
    const html = await render(ChangelogModal);
    expect(html).not.toMatch(/<dialog[^>]*\sopen/);
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
    // Marked loading from the server, with the ring placed before the images
    // so a painted picture covers it even before the script clears it.
    expect(html).toMatch(/<a[^>]*class="panel panel-hoverable is-loading"/);
    // Behind the image, so a painted picture covers it without waiting for the
    // script; that is what lets it be marked loading from the server.
    expect(html.indexOf('data-skeleton')).toBeLessThan(html.indexOf('hero-desktop'));
    expect(html).toContain('data-filter-gov-dod="true"');
    expect(html).toContain('data-filter-consumer="false"');
    expect(html).toContain('GFM');
    expect(html).toContain('US Army');
  });

  it('offers each hero at several widths, with the size it will be shown at', async () => {
    const gfm = getCaseStudy('gfm');
    const html = await render(CaseStudyPanel, { props: { caseStudy: gfm } });
    // Without these the browser is handed one source at its full resolution --
    // 1440px of desktop artwork for a 480px panel, and a square three times
    // the width of the one a phone draws.
    expect(html).toMatch(/<img[^>]*srcset="[^"]*480w[^"]*1440w[^"]*"[^>]*class="hero-desktop"/);
    expect(html).toMatch(/<img[^>]*srcset="[^"]*190w[^"]*567w[^"]*"[^>]*class="hero-mobile"/);
    // A srcset without sizes leaves the browser guessing at the layout width,
    // and it guesses the full viewport.
    expect(html).toMatch(/<img[^>]*sizes="480px"[^>]*class="hero-desktop"/);
    expect(html).toMatch(
      /<img[^>]*sizes="\(max-width: 767px\) 50vw, 190px"[^>]*class="hero-mobile"/,
    );
  });

  it('hints the priority of both heroes only when asked, since either can be the LCP', async () => {
    const gfm = getCaseStudy('gfm');
    const plain = await render(CaseStudyPanel, { props: { caseStudy: gfm } });
    expect(plain).not.toContain('fetchpriority="high"');

    const prioritised = await render(CaseStudyPanel, {
      props: { caseStudy: gfm, eager: true, priority: true },
    });
    // Which of the two shows is decided by the viewport mode at runtime, so
    // the hint cannot be put on one of them here.
    expect(prioritised.match(/fetchpriority="high"/g)).toHaveLength(2);
  });
});
