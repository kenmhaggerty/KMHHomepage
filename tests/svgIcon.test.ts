import { describe, expect, it } from 'vitest';
import { inlineSvg } from '../src/utils/svgIcon';
import { svgIconSource } from '../src/data/site';

describe('inlineSvg', () => {
  it('keeps the shapes and drops everything around them', () => {
    const { content } = inlineSvg(
      '<?xml version="1.0"?><!-- a comment -->\n' +
        '<svg width="800px" viewBox="0 0 24 24"><path d="M0 0h24v24H0z"/></svg>',
    );
    expect(content).toBe('<path d="M0 0h24v24H0z"/>');
  });

  it('takes the scale from the file rather than assuming one', () => {
    // Path data is drawn against its own viewBox, so a guess here would
    // render the glyph at the wrong size or outside its box entirely.
    expect(inlineSvg('<svg viewBox="0 0 512 512"><path d="M0 0"/></svg>').viewBox).toBe(
      '0 0 512 512',
    );
  });

  it('strips the colours the file hard-codes, so the glyph can inherit one', () => {
    const { content } = inlineSvg(
      '<svg viewBox="0 0 24 24" fill="none"><path fill="#000000" d="M0 0"/>' +
        '<circle stroke="red" cx="1" cy="1" r="1"/></svg>',
    );
    expect(content).not.toContain('#000000');
    expect(content).not.toContain('red');
    expect(content).toContain('d="M0 0"');
    expect(content).toContain('cx="1"');
  });

  it('keeps a fill or stroke of none, which is a shape and not a colour', () => {
    // Dropping these would flood the middle of an outlined icon.
    const { content } = inlineSvg(
      '<svg viewBox="0 0 24 24"><path fill="none" stroke="none" d="M0 0"/></svg>',
    );
    expect(content).toContain('fill="none"');
    expect(content).toContain('stroke="none"');
  });

  it('rejects a file that is not an SVG, rather than inlining its text', () => {
    expect(() => inlineSvg('not markup at all')).toThrow(/no root <svg>/);
  });

  it('rejects an SVG with no viewBox, which would have no scale', () => {
    expect(() => inlineSvg('<svg width="24" height="24"><path d="M0 0"/></svg>')).toThrow(
      /viewBox/,
    );
  });

  it('strips a colour declared in a style attribute, and keeps the rest', () => {
    // A style attribute outranks even the presentation attribute, so a fill
    // left in one would hold the mark at that colour in both themes.
    const { content } = inlineSvg(
      '<svg viewBox="0 0 24 24"><path style="fill:#000000;fill-rule:nonzero;" d="M0 0"/>' +
        '<path style="fill: red" d="M1 1"/></svg>',
    );
    expect(content).toContain('style="fill-rule:nonzero;"');
    expect(content).not.toContain('#000000');
    expect(content).not.toContain('red');
    // Nothing worth keeping is left behind as an empty attribute.
    expect(content).not.toContain('style=""');
    expect(content).toContain('d="M1 1"');
  });

  it('handles the SVG icons the site actually ships', () => {
    // Exports carry whatever the tool that wrote them left behind, so this
    // runs the real files rather than only hand-written samples.
    const { viewBox, content } = inlineSvg(svgIconSource('linkedin.svg'));
    expect(viewBox).toMatch(/^[\d.\s-]+$/);
    expect(content).toContain('d="');
    expect(content).not.toMatch(/fill="(?!none")/);
    expect(content).not.toMatch(/fill\s*:\s*(?!none)/);
  });
});
