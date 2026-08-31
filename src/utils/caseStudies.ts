import type { CaseStudy } from '../types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

/**
 * Validates the shape of a case-study JSON document. Throws with a
 * descriptive message so a malformed file fails the build loudly instead of
 * rendering a broken page.
 */
export function parseCaseStudy(data: unknown, source = 'case study'): CaseStudy {
  if (!isRecord(data)) {
    throw new Error(`${source}: expected an object`);
  }
  for (const field of ['key', 'title', 'company', 'year'] as const) {
    if (!isNonEmptyString(data[field])) {
      throw new Error(`${source}: missing required string field "${field}"`);
    }
  }
  if (!isRecord(data.filters)) {
    throw new Error(`${source}: missing "filters" object`);
  }
  if (!isRecord(data.hero) || !isNonEmptyString(data.hero.desktop)) {
    throw new Error(`${source}: missing "hero" object with a "desktop" image`);
  }
  if (!Array.isArray(data.gallery)) {
    throw new Error(`${source}: "gallery" must be an array`);
  }
  if (!Array.isArray(data.sections)) {
    throw new Error(`${source}: "sections" must be an array`);
  }
  return data as unknown as CaseStudy;
}

/**
 * Turns the result of `import.meta.glob(..., { eager: true })` over the
 * case-studies directory into a validated, stably-ordered list.
 */
export function loadCaseStudies(modules: Record<string, unknown>): CaseStudy[] {
  return Object.entries(modules)
    .map(([path, data]) => parseCaseStudy(data, path))
    .sort((a, b) => a.index - b.index);
}
