/** A local SVG file taken apart so its glyph can be inlined into the page. */
export interface InlineSvg {
  /** The source file's own viewBox, which sets the scale of its path data. */
  viewBox: string;
  /** The markup inside the root <svg>, ready to drop into another one. */
  content: string;
}

const SVG_OPEN_TAG = /<svg\b[^>]*>/i;
const VIEW_BOX = /viewBox="([^"]+)"/i;
/*
 * A hard-coded colour on the glyph, which has to go so the mark inherits
 * `currentColor` from the link around it. `none` is spared: that is not a
 * colour but a shape saying it has no fill (or no stroke), and dropping it
 * would paint over the middle of an outlined icon.
 */
const HARD_CODED_PAINT = /\s(?:fill|stroke)="(?!none")[^"]*"/gi;
/*
 * The same colour, declared in a style attribute instead, where it would
 * outrank even the presentation attribute. `fill-rule` and `stroke-linejoin`
 * are left alone: the colon has to come straight after the property name, so
 * only the paint itself matches.
 */
const STYLE_ATTRIBUTE = /\sstyle="([^"]*)"/gi;
const HARD_CODED_PAINT_DECLARATION = /(?:fill|stroke)\s*:\s*(?!none)[^;]*;?/gi;

/**
 * Prepares a local SVG file for inlining, so its glyph takes the link's
 * colour the way the Simple Icons marks do -- which an <img> could not.
 *
 * Icon files come from all over (exported, downloaded, hand-drawn) and carry
 * whatever the tool that wrote them left behind: an XML prolog, a comment, a
 * pixel width, a black fill. Everything outside the root <svg> is dropped and
 * the fills inside it are stripped, so only the shapes survive.
 */
export function inlineSvg(source: string): InlineSvg {
  const openTag = source.match(SVG_OPEN_TAG);
  if (!openTag) {
    throw new Error('Not an SVG: no root <svg> element');
  }

  /* The file's own viewBox, not an assumed one: it is what the path data is
     drawn against, so guessing it would quietly render the glyph at the
     wrong scale, or off the edge of its box entirely. */
  const viewBox = openTag[0].match(VIEW_BOX)?.[1];
  if (!viewBox) {
    throw new Error('The root <svg> has no viewBox, so the glyph has no scale');
  }

  const start = (openTag.index ?? 0) + openTag[0].length;
  const end = source.lastIndexOf('</svg>');
  const inner = end === -1 ? source.slice(start) : source.slice(start, end);

  const content = inner
    .replace(HARD_CODED_PAINT, '')
    .replace(STYLE_ATTRIBUTE, (_whole, declarations: string) => {
      const kept = declarations.replace(HARD_CODED_PAINT_DECLARATION, '').trim();
      return kept ? ` style="${kept}"` : '';
    });

  return { viewBox: viewBox.trim(), content: content.trim() };
}
