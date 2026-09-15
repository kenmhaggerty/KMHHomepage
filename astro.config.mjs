// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  integrations: [react()],
  build: {
    /*
     * Astro's default only inlines a stylesheet under 4kB and links the rest.
     * This site's whole stylesheet is one ~23kB file (~5kB over the wire), and
     * linking it put a render-blocking round trip in front of the first paint:
     * the browser cannot draw anything until it has asked for the file, waited
     * and parsed it, which measured as the single largest delay to first
     * contentful paint.
     *
     * Inlining trades a cache entry for that round trip. It is the right way
     * round here because the page it is inlined into is revalidated on every
     * visit anyway (see the Cache-Control rules in public/.htaccess), so the
     * separate file was rarely being reused across a session in the first
     * place, and 5kB of gzipped CSS is less than the images on the page.
     */
    inlineStylesheets: 'always',
  },
});
