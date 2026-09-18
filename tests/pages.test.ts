// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import Index from '../src/pages/index.astro';
import Resume from '../src/pages/resume.astro';
import NotFound from '../src/pages/404.astro';
import ProjectPage, { getStaticPaths } from '../src/pages/work/[slug].astro';
import WorkRedirect from '../src/pages/work/index.astro';
import { getCaseStudy, siteInfo } from '../src/data/site';
import htaccess from '../public/.htaccess?raw';

async function render(component: Parameters<AstroContainer['renderToString']>[0], options = {}) {
  const container = await AstroContainer.create();
  return container.renderToString(component, options);
}

/* The schemas are serialised into the page, so reading them back the way a
   crawler would is the only check that they survive the trip intact. */
function structuredData(html: string): Record<string, unknown>[] {
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  return blocks.map((block) => JSON.parse(block[1]) as Record<string, unknown>);
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

  it('prioritises exactly one panel, the one that paints largest first', async () => {
    const html = await render(Index);
    /* Both heroes of the first panel carry the hint and nothing else does.
       More than one high-priority image is the same as none: the point is to
       put this fetch in front of the fonts and the rest of the gallery. */
    expect(html.match(/fetchpriority="high"/g)).toHaveLength(2);
    const first = html.indexOf('data-case-study="gfm"');
    const second = html.indexOf('data-case-study=', first + 1);
    expect(html.indexOf('fetchpriority="high"')).toBeGreaterThan(first);
    expect(html.indexOf('fetchpriority="high"')).toBeLessThan(second);
  });

  it('renders the site chrome (toggle, header, footer)', async () => {
    const html = await render(Index);
    expect(html).toContain('data-mode-button="desktop"');
    expect(html).toContain('class="site-title"');
    expect(html).toContain('Ken M. Haggerty © 2026');
    expect(html).toContain(`<title>${siteInfo.google.title}</title>`);
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

describe('Case study image viewer', () => {
  it('marks each gallery image as opening in the overlay, still linking the full file', async () => {
    const caseStudy = getCaseStudy('gfm')!;
    const html = await render(ProjectPage, { props: { caseStudy } });

    expect(html).toContain('data-lightbox-open');
    // Each thumbnail arrives marked loading, ring before image; see the
    // CaseStudyPanel test for why.
    expect(html.match(/class="panel is-loading"/g)).toHaveLength(caseStudy.gallery.length);
    expect(html).toMatch(/data-skeleton[^>]*><\/span>\s*<img/);
    // Taken from the data rather than written out, so the alt text the overlay
    // announces is the same one the thumbnail carries.
    for (const item of caseStudy.gallery) {
      expect(html).toContain(`data-lightbox-alt="${item.alt_text}"`);
    }
    // The href stays a real link to the full-resolution file, so the image
    // still opens if the script never runs.
    expect(html).toMatch(/href="[^"]*gfm-1\.png[^"]*"[^>]*data-lightbox-open/);
  });

  it('renders one overlay for the whole page, not one per image', async () => {
    const caseStudy = getCaseStudy('gfm')!;
    const html = await render(ProjectPage, { props: { caseStudy } });
    expect(html.match(/data-lightbox(?![-\w])/g)).toHaveLength(1);
    expect(html.match(/data-lightbox-open/g)!.length).toBe(caseStudy.gallery.length);
  });

  it('leaves the work page alone, whose panels navigate rather than open images', async () => {
    const html = await render(Index);
    expect(html).not.toContain('data-lightbox');
  });
});

describe('Case study footnotes on the page', () => {
  it('renders the Alfred footnote once, generated from the JSON', async () => {
    const alfred = getCaseStudy('alfred');
    const html = await render(ProjectPage, { props: { caseStudy: alfred } });

    // Exactly one: the hand-written copy that used to live in html_content is
    // gone, so the note comes only from the footnotes array.
    expect(html.match(/class="section-footnotes"/g)).toHaveLength(1);
    expect(html.match(/As of Sep 2026/g)).toHaveLength(1);
    expect(html).toContain('linkedin.com/company/hello-alfred');
    // The marker in the prose still points at it.
    expect(html).toContain('300,000 residents.<sup>1</sup>');
  });

  it('leaves case studies without footnotes untouched', async () => {
    const html = await render(ProjectPage, { props: { caseStudy: getCaseStudy('gfm') } });
    expect(html).not.toContain('section-footnotes');
  });
});

describe('Structured data', () => {
  it('emits the WebSite and Person schemas as parseable JSON-LD', async () => {
    const schemas = structuredData(await render(Index));
    // Parsing is the assertion: a value carrying a quote or a </script> would
    // break the block silently, and a crawler drops the whole thing.
    expect(schemas.map((schema) => schema['@type'])).toEqual(['WebSite', 'WebPage', 'Person']);
    for (const schema of schemas) {
      expect(schema['@context']).toBe('https://schema.org');
    }
  });

  it('names the site after its owner, on the same origin as the canonical link', async () => {
    const [website] = structuredData(await render(Index));
    expect(website.name).toBe(siteInfo.owner.name);
    // The trailing slash matters: this is the origin, not a page on it.
    expect(website.url).toBe('https://www.kenmhaggerty.com/');
  });

  it('points the WebPage schema at the same URL as the site, with a primary image', async () => {
    const [, webPage] = structuredData(await render(Index));
    expect(webPage.url).toBe('https://www.kenmhaggerty.com/');
    // The 1x1 crop is the only one of the owner's images with the square
    // aspect ratio primaryImageOfPage expects.
    expect(webPage.primaryImageOfPage).toEqual({
      '@type': 'ImageObject',
      url: siteInfo.owner.images[0],
      width: 1200,
      height: 1200,
    });
  });

  it('describes the owner with their title, headshots and profile links', async () => {
    const [, , person] = structuredData(await render(Index));
    expect(person.name).toBe(siteInfo.owner.name);
    expect(person.url).toBe('https://www.kenmhaggerty.com/');
    expect(person.jobTitle).toBe(siteInfo.owner.jobTitle);
    // image goes out as the whole list: Google chooses among the aspect
    // ratios, so handing it one would be the crawler's only option.
    expect(person.image).toEqual(siteInfo.owner.images);
    // sameAs goes out whole and in order -- Google reads the list, not a
    // sample of it, so a dropped profile is a lost link between accounts.
    expect(person.sameAs).toEqual(siteInfo.owner.links);
  });

  it('repeats the same schemas on every page, so no page describes the site differently', async () => {
    expect(structuredData(await render(Resume))).toEqual(structuredData(await render(Index)));
  });

  it('names the owner in og:site_name rather than the record describing them', async () => {
    // owner became an object; anything still passing it whole to a meta tag
    // renders "[object Object]" for every scraper that reads the card.
    const html = await render(Index);
    expect(html).toContain(`property="og:site_name" content="${siteInfo.owner.name}"`);
    expect(html).not.toContain('[object Object]');
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

describe('404 page', () => {
  it('titles the page and fills the window, so the well reaches the footer', async () => {
    const html = await render(NotFound);
    expect(html).toContain('<title>404 Not Found · Ken M. Haggerty</title>');
    expect(html).toContain('fill-height');
    expect(html).toContain('class="page-not-found"');
  });

  it('sets the heading in the same faux small caps as the site title', async () => {
    const html = await render(NotFound);
    // Digits count as capitals, so "404 N" stays full size and only the
    // lowercase runs step down.
    expect(html).toMatch(
      /<h2 class="not-found-title"[^>]*>\s*404 N<span class="small-caps"[^>]*>ot<\/span> F<span class="small-caps"[^>]*>ound<\/span>/,
    );
  });

  it('explains itself and offers the way home', async () => {
    const html = await render(NotFound);
    expect(html).toContain('The given URL could not be found.');
    expect(html).toMatch(
      /<a class="back-button" href="\/"[^>]*>[\s\S]*?Back to Home Page[\s\S]*?<\/a>/,
    );
    // The mark is decoration; a screen reader gets the heading instead.
    expect(html).toMatch(/<p class="not-found-glyph" aria-hidden="true"[^>]*>\?<\/p>/);
  });

  it('keeps the site chrome, so the visitor is still on the site', async () => {
    const html = await render(NotFound);
    expect(html).toContain('class="site-title"');
    expect(html).toContain('data-mode-button="desktop"');
    expect(html).toContain('Ken M. Haggerty © 2026');
  });
});

describe('Apache 404 configuration', () => {
  /* Hostinger serves the built files with Apache, which shows its own
     plain-text error page unless pointed at ours. public/ is copied into
     dist/ untouched, so the .htaccess lands at the document root where
     Apache reads it. Nothing at build time checks the two agree. */
  const directives = htaccess
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'));

  const errorDocument = directives.find((line) => line.startsWith('ErrorDocument 404'));

  it('points Apache at the 404 page, in an active directive', () => {
    // Found among the uncommented lines: a directive behind a '#' is inert,
    // and reads exactly like a working one.
    expect(errorDocument).toBe('ErrorDocument 404 /404.html');
  });

  it('names a page the build actually emits', () => {
    /* Astro writes most routes as directories (/work/gfm/index.html) but
       special-cases this one to 404.html at the root. That is why the
       directive names a file rather than a path, and this is what notices
       if the page is renamed or removed and the directive is left behind. */
    const pages = import.meta.glob('../src/pages/**/*.astro');
    const [, , path] = (errorDocument ?? '').split(' ');
    expect(path).toBe('/404.html');
    expect(Object.keys(pages)).toContain('../src/pages/404.astro');
  });

  it('names it absolutely, so it resolves the same from every directory', () => {
    // Relative, Apache would resolve it against the requested directory, so
    // a bad URL under /work/ would look for a 404.html that is not there.
    const [, , path] = (errorDocument ?? '').split(' ');
    expect(path.startsWith('/')).toBe(true);
  });

  it('keeps the fingerprinted build output for a year, and the pages for none of it', () => {
    /* Astro puts a content hash in every filename it emits, so those URLs can
       never go stale and immutable spares the browser even the revalidation.
       The HTML is what names them, so it has to be rechecked every visit or a
       return visitor keeps loading the previous build. */
    const assets = directives.find((line) => line.includes('max-age=31536000, immutable'));
    expect(assets).toBe('Header set Cache-Control "public, max-age=31536000, immutable"');
    expect(directives).toContain('<FilesMatch "\\.html$">');
    expect(directives).toContain('Header set Cache-Control "public, no-cache, must-revalidate"');
  });

  it('sets the security headers the site can actually wear', () => {
    const header = (name: string) =>
      directives.find((line) => line.startsWith(`Header always set ${name} `));
    expect(header('X-Content-Type-Options')).toContain('nosniff');
    expect(header('X-Frame-Options')).toContain('SAMEORIGIN');
    expect(header('Referrer-Policy')).toContain('strict-origin-when-cross-origin');
    expect(header('Cross-Origin-Opener-Policy')).toContain('same-origin');
    expect(header('Strict-Transport-Security')).toContain('max-age=31536000');
  });

  it("leaves object-src at 'self', because the résumé page is an <embed>", () => {
    /* object-src governs <embed>, so the 'none' an audit asks for would blank
       /resume. Anything looser than 'self' would be pointless, and dropping
       the directive would fall back to allowing any origin. */
    const csp = directives.find((line) =>
      line.startsWith('Header always set Content-Security-Policy'),
    );
    expect(csp).toContain("object-src 'self'");
    expect(csp).not.toContain("object-src 'none'");
    // 'unsafe-inline' would be needed for the pre-paint scripts and would make
    // a script-src that protects nothing; better to leave it off and say why.
    expect(csp).not.toContain('unsafe-inline');
  });
});

describe('/work redirect', () => {
  /* /work only exists as /work/<slug>: there is no index for the bare path,
     so Apache found the directory, had nothing to list, and returned 403
     rather than the site's own 404 (that page is wired up above, but only
     for a missing file -- an empty listing never reaches it). A page at
     /work resolves both: the request now finds a file, and it lands on the
     page that lists the same case studies /work/<slug> opens. */
  it('bounces to the page that links every case study', async () => {
    const html = await render(WorkRedirect);
    // The script is what runs; replace() leaves no history entry, so Back
    // from the home page does not land here and bounce forward again.
    expect(html).toContain('location.replace("/")');
    // The meta is the fallback with no script, and what a crawler reads.
    expect(html).toContain('<meta http-equiv="refresh" content="0;url=/">');
  });

  it('leaves before painting, on the connection where that is possible', async () => {
    /* Whichever fires first has to come before the work: the fonts, the
       schemas and the theme script are all wasted on a page being left, and
       on a fast connection none of it should ever reach the screen. */
    const html = await render(WorkRedirect);
    const bounce = html.indexOf('location.replace');
    expect(bounce).toBeGreaterThan(-1);
    for (const later of ['rel="preload"', 'application/ld+json', 'localStorage']) {
      expect(html.indexOf(later), `${later} comes before the bounce`).toBeGreaterThan(bounce);
    }
  });

  it('keeps itself out of the index, and points at the destination instead', async () => {
    /* A bouncing page is not a page to rank. Left indexable it would compete
       with the home page on the home page's own content, and the canonical
       has to name where the visitor ends up, not where they knocked. */
    const html = await render(WorkRedirect);
    expect(html).toContain('<meta name="robots" content="noindex">');
    expect(html).toContain('rel="canonical" href="https://www.kenmhaggerty.com/"');
  });

  it('wears the site chrome, for the slow connection where it is seen', async () => {
    // The whole point of a page here rather than a `redirects` entry: what
    // Astro emits for that is unstyled, and the bounce can be slow enough
    // to read. Header, footer and the stylesheet all come with the layout.
    const html = await render(WorkRedirect);
    expect(html).toContain('class="site-title"');
    expect(html).toContain('class="site-external-links"');
    expect(html).toContain('Ken M. Haggerty © 2026');
    expect(html).toContain('class="page-redirect"');
  });

  it('offers a link out, since the bounce is what might not happen', async () => {
    const html = await render(WorkRedirect);
    expect(html).toMatch(/<a class="back-button" href="\/"/);
  });

  it('turns a ring while it waits, under a name global.css has not claimed', async () => {
    /* The ring is the one thing on the page that says it is working. It was
       called `spinner` to begin with and never painted: global.css owns that
       class for the image viewer's indicator, which ships `display: none`
       until the lightbox turns it on, and a scoped rule outranks the global
       one only on the properties it declares -- `display` not among them.
       So the class has to stay off that name, and this is what says so. */
    const html = await render(WorkRedirect);
    expect(html).toContain('spinner-ring');
    expect(html, 'the ring is back on the lightbox-only class').not.toMatch(/class="spinner[" ]/);
    // Decorative: the text beside it is what announces the wait.
    expect(html).toMatch(/<div class="spinner-ring"[^>]*aria-hidden="true"/);
  });

  it('does not shadow a real case study route', () => {
    // getStaticPaths never emits an empty slug, so nothing there can collide
    // with the /work/index.html this page builds.
    const paths = getStaticPaths();
    expect(paths.every(({ params }) => params.slug.length > 0)).toBe(true);
  });

  it('is a page, not a config redirect, so the two cannot both claim /work', async () => {
    /* Astro would have to choose between them, and the config would win
       silently -- putting the unstyled markup back without touching this
       page. Read as source rather than imported: astro.config.mjs pulls in
       the whole of 'astro/config' to run. */
    const { default: source } = await import('../astro.config.mjs?raw');
    expect(source).not.toMatch(/redirects:/);
    const pages = import.meta.glob('../src/pages/**/*.astro');
    expect(Object.keys(pages)).toContain('../src/pages/work/index.astro');
  });
});

describe('Share card metadata', () => {
  it('gives the work page the card copy from site-info', async () => {
    const html = await render(Index);
    /* The openGraph copy fields are optional overrides that site-info.json
       leaves unset, so the work page's card falls back to the site's own
       title and description. */
    const cardTitle = siteInfo.openGraph.title ?? siteInfo.title;
    const cardDescription = siteInfo.openGraph.description ?? siteInfo.description;
    expect(html).toContain(`property="og:title" content="${cardTitle}"`);
    expect(html).toContain(`property="og:description" content="${cardDescription}"`);
    // Twitter reads its own tags, so the same copy has to reach both.
    expect(html).toContain(`name="twitter:title" content="${cardTitle}"`);
  });

  it('makes the card image and canonical URL absolute', async () => {
    const html = await render(Index);
    // A scraper reads the built HTML from anywhere, so a relative path here
    // would resolve against the wrong origin, or not at all.
    expect(html).toContain(
      'property="og:image" content="https://www.kenmhaggerty.com/og-image.png"',
    );
    expect(html).toContain('rel="canonical" href="https://www.kenmhaggerty.com/"');
    expect(html).toContain('property="og:url" content="https://www.kenmhaggerty.com/"');
  });

  it('declares the image size and asks for a large-image card', async () => {
    const html = await render(Index);
    expect(html).toContain('property="og:image:width" content="1200"');
    expect(html).toContain('property="og:image:height" content="630"');
    expect(html).toContain('name="twitter:card" content="summary_large_image"');
    expect(html).toContain(
      'name="twitter:image" content="https://www.kenmhaggerty.com/og-image.png"',
    );
  });

  it('falls back to the page title on pages with no card copy of their own', async () => {
    const html = await render(Resume);
    expect(html).toContain('property="og:title" content="Résumé · Ken M. Haggerty"');
    expect(html).toContain(`property="og:description" content="${siteInfo.description}"`);
    // The per-page canonical path is not asserted here: the container renders
    // every page at "/" rather than at its route, so only the build shows it.
  });
});
