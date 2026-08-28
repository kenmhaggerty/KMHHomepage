import { describe, expect, it } from 'vitest';
import { segmentTitle } from '../src/utils/title';

describe('segmentTitle', () => {
  it('splits the site title into caps and small-caps segments', () => {
    expect(segmentTitle('Ken M. Haggerty')).toEqual([
      { text: 'K', small: false },
      { text: 'en', small: true },
      { text: ' M. H', small: false },
      { text: 'aggerty', small: true },
    ]);
  });

  it('returns a single segment for all-caps text', () => {
    expect(segmentTitle('GFM')).toEqual([{ text: 'GFM', small: false }]);
  });

  it('returns a single small segment for all-lowercase text', () => {
    expect(segmentTitle('abc')).toEqual([{ text: 'abc', small: true }]);
  });

  it('treats punctuation and spaces as caps segments', () => {
    expect(segmentTitle('. -')).toEqual([{ text: '. -', small: false }]);
  });

  it('handles the empty string', () => {
    expect(segmentTitle('')).toEqual([]);
  });

  it('handles accented characters', () => {
    expect(segmentTitle('Résumé')).toEqual([
      { text: 'R', small: false },
      { text: 'ésumé', small: true },
    ]);
  });
});
