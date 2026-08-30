import { pluginCollapsibleSections } from "@expressive-code/plugin-collapsible-sections";
import { pluginLineNumbers } from "@expressive-code/plugin-line-numbers";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeCallouts from "rehype-callouts";
import rehypeExpressiveCode, {
  createRenderer,
  setAlpha,
  type RehypeExpressiveCodeOptions,
} from "rehype-expressive-code";
import rehypeExternalLinks from "rehype-external-links";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import rehypeSlug from "rehype-slug";
import rehypeWrapAll from "rehype-wrap-all";
import remarkDirective from "remark-directive";
import remarkDirectiveSugar, {
  type PropertiesFromTextDirective,
} from "remark-directive-sugar";
import remarkGfm from "remark-gfm";
import remarkImgattr from "remark-imgattr";
import remarkMath from "remark-math";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import remarkSmartypants from "remark-smartypants";
import { unified } from "unified";
import { visit } from "unist-util-visit";

import type {
  AstroMarkdownProperties,
  AstroMarkdownProperty,
  AstroMarkdownTree,
} from "../../lib/parity/astro-markdown-tree";

type Position = {
  start?: { offset?: number };
  end?: { offset?: number };
};

type HastNode = {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
  position?: Position;
};

type RawInterval = readonly [start: number, end: number];

type CompilerFileData = {
  astroRawIntervals?: RawInterval[];
};

type ProcessorFile = {
  data: Record<string, unknown>;
};

const expressiveCodeOptions: RehypeExpressiveCodeOptions = {
  defaultLocale: "en-US",
  defaultProps: {
    wrap: false,
    preserveIndent: true,
    showLineNumbers: false,
    collapseStyle: "collapsible-auto" as const,
  },
  minSyntaxHighlightingColorContrast: 0,
  plugins: [pluginLineNumbers(), pluginCollapsibleSections()],
  themes: ["vitesse-dark", "vitesse-light"],
  themeCssRoot: ":root",
  themeCssSelector: (theme) =>
    theme.name === "vitesse-dark" ? ":root.dark" : ":root:not(.dark)",
  useDarkModeMediaQuery: false,
  useStyleReset: false,
  styleOverrides: {
    borderRadius: "0.4rem",
    borderWidth: "1px",
    borderColor: "var(--c-border-soft)",
    uiFontFamily: "var(--font-mono)",
    uiFontSize: "1em",
    codeBackground: (context) =>
      context.theme.name === "vitesse-dark" ? "#121212" : "#ffffff",
    codeFontFamily: "var(--font-mono)",
    codeFontSize: "0.875rem",
    codeLineHeight: "1.55",
    codePaddingBlock: "0.85rem",
    codePaddingInline: "1rem",
    frames: {
      frameBoxShadowCssValue: "0 1px 2px rgb(15 23 42 / 0.05)",
      inlineButtonBackground: "var(--c-text)",
      inlineButtonBackgroundIdleOpacity: "0",
      inlineButtonBackgroundActiveOpacity: "0.08",
      inlineButtonBackgroundHoverOrFocusOpacity: "0.055",
      inlineButtonForeground: "var(--c-text-muted)",
      terminalTitlebarBackground: ({ theme }) =>
        theme.name === "vitesse-dark" ? "#121212" : "#ffffff",
      terminalTitlebarBorderBottomColor: "var(--c-border-soft)",
      terminalBackground: ({ theme }) =>
        theme.name === "vitesse-dark" ? "#121212" : "#ffffff",
      tooltipSuccessBackground: "var(--c-text)",
      tooltipSuccessForeground: "var(--c-bg)",
    },
    textMarkers: {
      backgroundOpacity: "0.25",
      borderOpacity: "0.5",
    },
    collapsibleSections: {
      closedBackgroundColor: ({ theme }) =>
        setAlpha(theme.colors["editor.foldBackground"], 0.06)
        || "rgb(84 174 255 / 20%)",
    },
  },
};

// Astro extracted these assets once at build time. The exact generated CSS is
// checked in as app/expressive-code-base.css. Only per-block HAST is retained.
const expressiveRenderer = createRenderer(expressiveCodeOptions).then((renderer) => ({
  ...renderer,
  baseStyles: "",
  themeStyles: "",
  jsModules: [],
}));

const unsafeTags = new Set([
  "base",
  "embed",
  "iframe",
  "link",
  "math",
  "meta",
  "object",
  "script",
  "style",
  "svg",
  "template",
]);
const urlProperties = new Set([
  "action",
  "archive",
  "background",
  "cite",
  "classid",
  "codebase",
  "data",
  "formaction",
  "href",
  "icon",
  "itemid",
  "longdesc",
  "manifest",
  "poster",
  "profile",
  "src",
  "usemap",
  "xlinkhref",
]);
const urlListProperties = new Set(["archive", "ping"]);
const sourceSetProperties = new Set(["imagesrcset", "srcset"]);
const allowedSchemes = new Set([
  "ftp",
  "http",
  "https",
  "irc",
  "ircs",
  "mailto",
  "sms",
  "tel",
  "xmpp",
]);
// One reviewed legacy fixture contains the harmless invalid value `zoom: %;`.
// Keep it byte-semantically equivalent while allowing no other declaration.
const safeLegacyRawStyle = /^\s*zoom\s*:\s*(?:\d+(?:\.\d+)?%|%)\s*;?\s*$/i;

function normalizedUrlScheme(value: string) {
  // Browsers ignore ASCII whitespace/control characters around a scheme.
  // Remove them before testing so `java\nscript:` cannot bypass the guard.
  return value.replace(/[\u0000-\u0020\u007f-\u009f]/g, "");
}

function safeUrl(value: string) {
  const normalized = normalizedUrlScheme(value.trim());
  if (!normalized) return false;
  const scheme = /^([a-z][a-z\d+.-]*):/i.exec(normalized)?.[1];
  return !scheme || allowedSchemes.has(scheme.toLowerCase());
}

function safeUrlList(value: string) {
  const values = value.trim().split(/\s+/);
  return values.length > 0 && values.every(safeUrl);
}

function safeSourceSet(value: string) {
  // Data URLs are intentionally outside the protocol allow-list, so commas
  // delimit candidates here. Each candidate starts with one URL token and
  // may have a standard density/width descriptor after whitespace.
  const candidates = value.split(",").map((candidate) => candidate.trim()).filter(Boolean);
  return candidates.length > 0 && candidates.every((candidate) => {
    const [url, ...descriptors] = candidate.split(/\s+/);
    return Boolean(url)
      && safeUrl(url)
      && descriptors.every((descriptor) => /^(?:\d+(?:\.\d+)?x|\d+w)$/.test(descriptor));
  });
}

function safePropertyValue(value: unknown): value is AstroMarkdownProperty {
  return (
    typeof value === "string"
    || typeof value === "number"
    || typeof value === "boolean"
    || (
      Array.isArray(value)
      && value.every((item) => typeof item === "string" || typeof item === "number")
    )
  );
}

function scrubProperties(node: HastNode, { raw }: { raw: boolean }) {
  const properties = node.properties ?? {};
  for (const name of Object.keys(properties)) {
    const normalized = name.toLowerCase();
    const value = properties[name];
    if (
      normalized.startsWith("on")
      || normalized === "srcdoc"
      || normalized === "formaction"
    ) {
      delete properties[name];
      continue;
    }
    if (normalized === "style") {
      // The reviewed Astro corpus only used raw inline styles for Typora's
      // image zoom percentages. Trusted KaTeX/Expressive Code styles are
      // generated after the first boundary and are kept intact.
      if (raw && typeof value === "string" && safeLegacyRawStyle.test(value)) continue;
      if (raw) delete properties[name];
      continue;
    }
    if (
      urlProperties.has(normalized)
      || urlListProperties.has(normalized)
      || sourceSetProperties.has(normalized)
    ) {
      const safe = typeof value === "string" && (
        sourceSetProperties.has(normalized)
          ? safeSourceSet(value)
          : urlListProperties.has(normalized)
            ? safeUrlList(value)
            : safeUrl(value)
      );
      if (!safe) delete properties[name];
      continue;
    }
    if (!safePropertyValue(value)) delete properties[name];
  }
  node.properties = properties;
}

function scrubTree(tree: HastNode, isRaw: (node: HastNode) => boolean) {
  const scrub = (parent: HastNode) => {
    if (!parent.children) return;
    parent.children = parent.children.flatMap((child) => {
      if (child.type !== "element") return child.type === "comment" ? [] : [child];
      const tagName = child.tagName?.toLowerCase() ?? "";
      const raw = isRaw(child);
      if (raw && unsafeTags.has(tagName)) return [];
      scrubProperties(child, { raw });
      scrub(child);
      // Forms are presentation examples in the legacy corpus. Keep their
      // visible children while removing the active submission boundary.
      return tagName === "form" ? child.children ?? [] : [child];
    });
  };
  scrub(tree);
}

/** Scrub Markdown/plugin-produced elements before trusted renderer plugins. */
function rehypeGeneratedArticleBoundary() {
  return (tree: HastNode) => scrubTree(tree, () => true);
}

/** Remember raw HTML source ranges while raw nodes are still opaque to plugins. */
function rehypeRememberRawHtml() {
  return (tree: HastNode, file: ProcessorFile) => {
    const intervals: RawInterval[] = [];
    visit(tree as Parameters<typeof visit>[0], "raw", (rawNode) => {
      const node = rawNode as unknown as HastNode;
      const start = node.position?.start?.offset;
      const end = node.position?.end?.offset;
      if (typeof start === "number" && typeof end === "number") intervals.push([start, end]);
    });
    (file.data as CompilerFileData).astroRawIntervals = intervals;
  };
}

/** Sanitize parsed raw HTML without altering trusted KaTeX/EC inline styles. */
function rehypeRawArticleBoundary() {
  return (tree: HastNode, file: ProcessorFile) => {
    const intervals = (file.data as CompilerFileData).astroRawIntervals ?? [];
    const isRaw = (node: HastNode) => {
      const offset = node.position?.start?.offset;
      return typeof offset === "number"
        && intervals.some(([start, end]) => offset >= start && offset < end);
    };
    scrubTree(tree, isRaw);
  };
}

function rehypeArticleImages() {
  return (tree: HastNode) => {
    visit(tree as Parameters<typeof visit>[0], "element", (rawNode) => {
      const node = rawNode as unknown as HastNode;
      if (node.tagName !== "img") return;
      node.properties ??= {};
      node.properties.loading ??= "lazy";
      node.properties.decoding ??= "async";
    });
  };
}

function remarkRestoreInvalidDirectiveNames() {
  return (tree: HastNode) => {
    visit(
      tree as Parameters<typeof visit>[0],
      (node) => node.type === "textDirective",
      (rawNode, index, rawParent) => {
        const node = rawNode as unknown as HastNode & { name?: string };
        const parent = rawParent as unknown as HastNode | undefined;
        if (
          !node.name
          || /^[A-Za-z][\w-]*$/.test(node.name)
          || index === undefined
          || !parent?.children
        ) return;
        // The historical Astro pipeline serialized invalid directive names as
        // tag-shaped text (for example `:1px` became `<1px></1px>`). React
        // rejects an actual element whose name starts with a digit, so retain
        // the exact browser-visible legacy text as an escaped text node.
        parent.children[index] = {
          type: "text",
          value: `<${node.name}></${node.name}>`,
        };
      },
    );
  };
}

function syntaxTreeText(node: unknown): string {
  if (!node || typeof node !== "object") return "";
  const record = node as { type?: unknown; value?: unknown; children?: unknown };
  if (record.type === "text" && typeof record.value === "string") return record.value;
  return Array.isArray(record.children) ? record.children.map(syntaxTreeText).join("") : "";
}

function syntaxTreeHasImage(node: unknown): boolean {
  if (!node || typeof node !== "object") return false;
  const record = node as { type?: unknown; tagName?: unknown; children?: unknown };
  if (record.type === "element" && record.tagName === "img") return true;
  return Array.isArray(record.children) && record.children.some(syntaxTreeHasImage);
}

const processor = unified()
  .use(remarkParse)
  .use(remarkDirective)
  .use(remarkDirectiveSugar, {
    badge: { presets: { n: { text: "NEW" }, a: { text: "ARTICLE" }, v: { text: "VIDEO" } } },
    link: {
      faviconSourceUrl: "https://www.google.com/s2/favicons?domain={domain}&sz=128",
      imgProps: (node: Parameters<PropertiesFromTextDirective>[0]) => ({
        "aria-hidden": "true",
        ...(node.attributes?.class?.includes("github")
          ? { src: "https://github.githubassets.com/favicons/favicon.svg" }
          : {}),
      }),
    },
    image: { stripParagraph: false },
  })
  .use(remarkRestoreInvalidDirectiveNames)
  .use(remarkImgattr)
  .use(remarkMath)
  .use(remarkGfm)
  .use(remarkSmartypants)
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeGeneratedArticleBoundary)
  .use(rehypeSlug)
  .use(rehypeArticleImages)
  .use(rehypeKatex, { throwOnError: false, strict: false })
  .use(rehypeCallouts, { theme: "vitepress" })
  .use(rehypeExternalLinks, {
    target: "_blank",
    rel: ["noopener", "noreferrer"],
    content: (element: unknown) => (
      syntaxTreeHasImage(element) ? null : { type: "text", value: "" }
    ),
    contentProperties: (element: unknown) => (
      syntaxTreeHasImage(element)
        ? null
        : {
            "u-i-carbon-arrow-up-right": true,
            className: ["new-tab-icon"],
            ariaHidden: "true",
          }
    ),
    properties: {
      ariaLabel: "Open in new tab",
    },
  })
  .use(rehypeAutolinkHeadings, {
    behavior: "append",
    properties: (element: unknown) => {
      const text = syntaxTreeText(element);
      return {
        className: ["header-anchor"],
        "tab-index": 0,
        ariaHidden: "false",
        ariaLabel: text ? `Link to ${text}` : undefined,
        "data-pagefind-ignore": "",
      };
    },
    content: { type: "text", value: "" },
  })
  .use(rehypeWrapAll, { selector: "table", wrapper: "div" })
  // Astro integrations run after configured Markdown rehype plugins.
  .use(rehypeExpressiveCode, {
    ...expressiveCodeOptions,
    customCreateRenderer: () => expressiveRenderer,
  })
  // The historical pipeline intentionally omitted rehype-raw while plugins
  // ran. Parse raw HTML only after those plugins so raw images do not gain
  // lazy attributes and raw anchors/headings are not transformed.
  .use(rehypeRememberRawHtml)
  .use(rehypeRaw)
  .use(rehypeRawArticleBoundary);

function serializeProperties(properties: Record<string, unknown> | undefined) {
  if (!properties) return null;
  const result: AstroMarkdownProperties = {};
  for (const [name, value] of Object.entries(properties)) {
    if (safePropertyValue(value)) result[name] = value;
  }
  return Object.keys(result).length ? result : null;
}

function serializeChildren(children: HastNode[] | undefined): AstroMarkdownTree {
  if (!children) return [];
  const result: Array<AstroMarkdownTree[number]> = [];
  for (const node of children) {
    if (node.type === "text") {
      result.push(node.value ?? "");
    } else if (node.type === "element" && node.tagName) {
      result.push([
        node.tagName,
        serializeProperties(node.properties),
        serializeChildren(node.children),
      ]);
    }
  }
  return result;
}

export async function compileAstroMarkdown(content: string): Promise<AstroMarkdownTree> {
  const tree = processor.parse(content);
  const rendered = await processor.run(tree);
  return serializeChildren((rendered as HastNode).children);
}
