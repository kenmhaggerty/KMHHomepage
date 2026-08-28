export interface TitleSegment {
  text: string;
  small: boolean;
}

/**
 * Splits a title into faux-small-caps segments, as designed for the site
 * header: the rendered text is uppercased, with segments that were
 * originally lowercase set at a smaller size ("Ken M. Haggerty" renders as
 * "K" + "EN" (small) + " M. H" + "AGGERTY" (small)).
 */
export function segmentTitle(title: string): TitleSegment[] {
  const segments: TitleSegment[] = [];
  for (const char of title) {
    const small = char !== char.toUpperCase();
    const last = segments[segments.length - 1];
    if (last && last.small === small) {
      last.text += char;
    } else {
      segments.push({ text: char, small });
    }
  }
  return segments;
}
