import type { ImageMetadata } from 'astro';
import type { CaseStudy, SiteInfo } from '../types';
import { loadCaseStudies } from '../utils/caseStudies';
import siteInfoJson from '../../site-info.json';
import packageJson from '../../package.json';
import aboutJson from './about.json';
import type { AboutInfo } from '../types';

export const siteInfo: SiteInfo = siteInfoJson;

/*
 * The footer's version is the package version, so releasing is one bump in
 * one file. Frontmatter runs at build time, so package.json is read there and
 * only the resulting string is ever served.
 */
export const version: string = packageJson.version;

export const about: AboutInfo = aboutJson;

const caseStudyModules = import.meta.glob('../../case-studies/*.json', {
  eager: true,
  import: 'default',
});

export const caseStudies: CaseStudy[] = loadCaseStudies(caseStudyModules);

export function getCaseStudy(key: string): CaseStudy | undefined {
  return caseStudies.find((caseStudy) => caseStudy.key === key);
}

/*
 * The case study JSON names its images as bare filenames, so they cannot be
 * written as import statements. Globbing src/assets/images gives the same
 * imported assets an `import` would, which is what <Image> needs to optimise
 * them -- an image left in public/ is copied untouched and cannot be resized
 * or re-encoded.
 */
const imageModules = import.meta.glob<ImageMetadata>(
  '../assets/images/*.{png,jpg,jpeg,webp,avif,gif}',
  { eager: true, import: 'default' },
);

const imagesByFilename = new Map(
  Object.entries(imageModules).map(([path, image]) => [
    path.slice(path.lastIndexOf('/') + 1),
    image,
  ]),
);

/** Resolves an image filename from the JSON data to its imported asset. */
export function imageAsset(filename: string): ImageMetadata {
  const image = imagesByFilename.get(filename);
  if (!image) {
    throw new Error(`No image named "${filename}" in src/assets/images`);
  }
  return image;
}
