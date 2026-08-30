export type AstroMarkdownProperty = string | number | boolean | Array<string | number>;

export type AstroMarkdownProperties = Record<string, AstroMarkdownProperty>;

/**
 * Compact, JSON-safe HAST projection generated before `next build`.
 *
 * Text nodes stay as strings. Element tuples contain their HTML tag, HAST
 * properties and children. Positions and compiler-only metadata are omitted,
 * keeping the ignored build snapshot substantially smaller than full HAST.
 */
export type AstroMarkdownElement = readonly [
  tagName: string,
  properties: AstroMarkdownProperties | null,
  children: readonly AstroMarkdownNode[],
];

export type AstroMarkdownNode = string | AstroMarkdownElement;

export type AstroMarkdownTree = readonly AstroMarkdownNode[];
