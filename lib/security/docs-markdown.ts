import {
  defaultSchema,
  type Options as SanitizeSchema,
} from "rehype-sanitize";

const deniedGlobalAttributes = new Set([
  "accept",
  "acceptCharset",
  "action",
  "encType",
  "method",
  "multiple",
  "name",
  "prompt",
  "readOnly",
  "selected",
]);

const safeGlobalAttributes = (defaultSchema.attributes?.["*"] ?? []).filter(
  (attribute) => {
    const name = Array.isArray(attribute) ? attribute[0] : attribute;
    return typeof name !== "string" || !deniedGlobalAttributes.has(name);
  },
);

/**
 * Raw Docs Markdown is fetched from external repository snapshots. Start from
 * rehype-sanitize's allow-list rather than trying to enumerate dangerous HTML.
 *
 * Sanitization intentionally runs before rehype-katex. That removes author
 * supplied SVG/style/MathML while still allowing the trusted KaTeX plugin to
 * emit the MathML and tightly-scoped inline geometry its renderer requires.
 */
export const docsMarkdownSanitizeSchema: SanitizeSchema = {
  ...defaultSchema,
  tagNames: [
    ...(defaultSchema.tagNames ?? []),
    "address",
    "article",
    "aside",
    "audio",
    "figcaption",
    "figure",
    "footer",
    "header",
    "main",
    "mark",
    "nav",
    "small",
    "time",
    "track",
    "video",
  ],
  attributes: {
    ...defaultSchema.attributes,
    "*": safeGlobalAttributes,
    code: [
      ...(defaultSchema.attributes?.code ?? []),
      ["className", "math-inline", "math-display"],
    ],
    img: [
      ...(defaultSchema.attributes?.img ?? []),
      "decoding",
      "loading",
    ],
    audio: [
      "controls",
      "loop",
      "muted",
      ["preload", "none", "metadata"],
      "src",
    ],
    source: [
      "media",
      "sizes",
      "src",
      "srcSet",
      "type",
    ],
    track: ["default", "kind", "label", "src", "srcLang"],
    video: [
      "controls",
      "height",
      "loop",
      "muted",
      "playsInline",
      "poster",
      ["preload", "none", "metadata"],
      "src",
      "width",
    ],
  },
  protocols: {
    ...defaultSchema.protocols,
    href: [...(defaultSchema.protocols?.href ?? []), "tel"],
    poster: ["http", "https"],
    src: ["http", "https"],
    srcSet: ["http", "https"],
  },
  strip: [
    ...new Set([
      ...(defaultSchema.strip ?? []),
      "base",
      "button",
      "embed",
      "foreignObject",
      "form",
      "iframe",
      "link",
      "meta",
      "object",
      "option",
      "script",
      "select",
      "style",
      "svg",
      "textarea",
    ]),
  ],
};
