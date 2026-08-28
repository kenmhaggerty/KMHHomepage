import type { CaseStudy, SiteInfo } from '../types';
import { loadCaseStudies } from '../utils/caseStudies';
import siteInfoJson from '../../site-info.json';
import aboutJson from './about.json';
import type { AboutInfo } from '../types';

export const siteInfo: SiteInfo = siteInfoJson;

export const about: AboutInfo = aboutJson;

const caseStudyModules = import.meta.glob('../../case-studies/*.json', {
  eager: true,
  import: 'default',
});

export const caseStudies: CaseStudy[] = loadCaseStudies(caseStudyModules);

export function getCaseStudy(key: string): CaseStudy | undefined {
  return caseStudies.find((caseStudy) => caseStudy.key === key);
}

/** Resolves an image filename from the JSON data to its public URL. */
export function imageUrl(filename: string): string {
  return `/images/${filename}`;
}
