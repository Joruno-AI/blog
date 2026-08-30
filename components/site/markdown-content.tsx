"use client";

/* eslint-disable @next/next/no-img-element -- Markdown assets can use arbitrary persisted URLs. */

import Link from "next/link";
import {
  cloneElement,
  isValidElement,
  useEffect,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react";
import ReactMarkdown from "react-markdown";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeExternalLinks from "rehype-external-links";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema, type Options as SanitizeSchema } from "rehype-sanitize";
import rehypeSlug from "rehype-slug";
import remarkDirective from "remark-directive";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkSmartypants from "remark-smartypants";
import { visit } from "unist-util-visit";

import { ArchifyEmbed } from "@/components/site/archify-embed";
import { ArchifyRuntimeMermaid } from "@/components/site/archify-runtime-mermaid";
import { MarkdownImageViewer } from "@/components/site/markdown-image-viewer";
import { archifyArtifactHashInBrowser } from "@/lib/archify/artifact-address.mjs";

const ARCHIFY_FENCE_TYPES = new Set(["architecture", "workflow", "sequence", "dataflow", "lifecycle"]);

type ArchifyFenceSpec = {
  type: string;
  title: string;
  src?: string;
  ir?: Record<string, unknown>;
};

type BlogArchifyManifest = {
  artifacts: Array<{ type: string; sha256: string; publicPath: string }>;
};

const BLOG_ARCHIFY_MANIFEST_URL = "/diagrams/archify/manifest.json";
let blogArchifyManifestLoader: Promise<BlogArchifyManifest> | null = null;

function loadBlogArchifyManifest() {
  blogArchifyManifestLoader ??= fetch(BLOG_ARCHIFY_MANIFEST_URL, {
    cache: "no-store",
    credentials: "same-origin",
  }).then(async (response) => {
    if (!response.ok) throw new Error(`Archify manifest HTTP ${response.status}`);
    const value = await response.json() as Partial<BlogArchifyManifest>;
    if (!Array.isArray(value.artifacts)) throw new Error("Invalid Archify manifest");
    return value as BlogArchifyManifest;
  }).catch((error) => {
    blogArchifyManifestLoader = null;
    throw error;
  });
  return blogArchifyManifestLoader;
}

type MarkdownTreeNode = {
  type: string;
  value?: string;
  children?: MarkdownTreeNode[];
};

function rehypeMergeAdjacentTextNodes() {
  return (tree: MarkdownTreeNode) => {
    const merge = (node: MarkdownTreeNode) => {
      if (!node.children) return;
      node.children.forEach(merge);
      const children: MarkdownTreeNode[] = [];
      for (const child of node.children) {
        const previous = children.at(-1);
        if (child.type === "text" && previous?.type === "text") {
          previous.value = `${previous.value ?? ""}${child.value ?? ""}`;
        } else {
          children.push(child);
        }
      }
      node.children = children;
    };
    merge(tree);
  };
}

const markdownSanitizeSchema: SanitizeSchema = {
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
    "*": [
      ...(defaultSchema.attributes?.["*"] ?? []),
      "ariaControls",
      "ariaExpanded",
      "ariaHidden",
      "ariaLabel",
      "className",
      "data*",
      "role",
    ],
    audio: ["autoPlay", "controls", "loop", "muted", "preload", "src"],
    source: [...(defaultSchema.attributes?.source ?? []), "media", "src", "type"],
    track: ["default", "kind", "label", "src", "srcLang"],
    video: ["autoPlay", "controls", "height", "loop", "muted", "playsInline", "poster", "preload", "src", "width"],
  },
  protocols: {
    ...defaultSchema.protocols,
    href: [...(defaultSchema.protocols?.href ?? []), "tel"],
  },
};

function nodeText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(nodeText).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) return nodeText(node.props.children);
  return "";
}

function nodeContainsImage(node: ReactNode): boolean {
  if (Array.isArray(node)) return node.some(nodeContainsImage);
  if (!isValidElement<{ children?: ReactNode }>(node)) return false;
  if (node.type === "img") return true;
  return nodeContainsImage(node.props.children);
}

function syntaxTreeText(node: unknown): string {
  if (!node || typeof node !== "object") return "";
  const record = node as { type?: unknown; value?: unknown; children?: unknown };
  if (record.type === "text" && typeof record.value === "string") return record.value;
  return Array.isArray(record.children) ? record.children.map(syntaxTreeText).join("") : "";
}

function sliceNodeText(node: ReactNode, start: number, end: number, cursor = { value: 0 }): ReactNode {
  if (typeof node === "string" || typeof node === "number") {
    const value = String(node);
    const from = Math.max(0, start - cursor.value);
    const to = Math.min(value.length, end - cursor.value);
    cursor.value += value.length;
    return to > from ? value.slice(from, to) : null;
  }
  if (Array.isArray(node)) {
    return node.map((child) => sliceNodeText(child, start, end, cursor));
  }
  if (isValidElement<{ children?: ReactNode }>(node)) {
    const children = sliceNodeText(node.props.children, start, end, cursor);
    return cloneElement(node, undefined, children);
  }
  return node;
}

function remarkCalloutDirectives() {
  return (tree: unknown) => {
    visit(tree as Parameters<typeof visit>[0], (node) => {
      if (!["containerDirective", "leafDirective", "textDirective"].includes(node.type)) return;
      const directive = node as unknown as Record<string, unknown>;
      const name = typeof directive.name === "string" ? directive.name.toLowerCase() : "note";
      const data = (directive.data ??= {}) as Record<string, unknown>;
      const attributes = (directive.attributes ?? {}) as Record<string, string>;
      data.hName = directive.type === "textDirective" ? "span" : "div";
      data.hProperties = {
        ...attributes,
        className: ["callout", `callout-${name}`],
        "data-callout": name,
      };
    });
  };
}

function remarkCodeMetadata() {
  return (tree: unknown) => {
    visit(tree as Parameters<typeof visit>[0], (node) => {
      if (node.type !== "code") return;
      const code = node as unknown as {
        meta?: unknown;
        data?: { hProperties?: Record<string, unknown> };
      };
      if (typeof code.meta !== "string" || !code.meta.trim()) return;
      code.data ??= {};
      code.data.hProperties = { ...code.data.hProperties, "data-meta": code.meta };
    });
  };
}

type MarkdownLinkProps = ComponentPropsWithoutRef<"a"> & { node?: unknown };
type MarkdownImageProps = ComponentPropsWithoutRef<"img"> & { node?: unknown };

function MarkdownLink({ href = "", children, node: _node, ...props }: MarkdownLinkProps) {
  void _node;
  const internal = href.startsWith("/") || href.startsWith("#");
  if (internal) return <Link href={href} {...props}>{children}</Link>;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" aria-label="Open in new tab" {...props}>
      {children}
      {!nodeContainsImage(children) ? <span className="new-tab-icon markdown-new-tab-icon" aria-hidden="true" /> : null}
    </a>
  );
}

function MarkdownImage({ alt = "", src = "", node: _node, ...props }: MarkdownImageProps) {
  void _node;
  // Markdown dimensions and ViewerJS rely on the source element rather than
  // Next Image's wrapper and optimizer markup.
  return src
    ? <img {...props} src={src} alt={alt} loading="lazy" decoding="async" data-viewer-image="" />
    : <span className="markdown-image-unavailable" role="img" aria-label={alt || "图片暂时无法加载"}>{alt || "图片暂时无法加载"}</span>;
}

async function copyText(text: string) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.append(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  if (copied) return;

  await navigator.clipboard.writeText(text);
}

function parseArchifyFence(language: string, raw: string, title: string): ArchifyFenceSpec | null {
  const type = language.match(/^archify-(architecture|workflow|sequence|dataflow|lifecycle)$/i)?.[1]?.toLowerCase();
  if (!type || !ARCHIFY_FENCE_TYPES.has(type)) return null;
  const value = raw.trim();
  if (/^\/diagrams\/archify\/[a-f0-9]{64}\.html(?:\?embed=1)?$/i.test(value)) {
    return { type, title: title || "Archify diagram", src: value };
  }
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    const artifact = typeof parsed.artifact === "string" ? parsed.artifact
      : typeof parsed.src === "string" ? parsed.src
        : "";
    const parsedTitle = typeof parsed.title === "string" ? parsed.title : title;
    if (artifact) return { type, title: parsedTitle || "Archify diagram", src: artifact };
    if (parsed.diagram_type === type) return { type, title: parsedTitle || String(parsed.meta && typeof parsed.meta === "object" && "title" in parsed.meta ? (parsed.meta as { title?: unknown }).title || "" : "") || "Archify diagram", ir: parsed };
  } catch {
    // Invalid Archify JSON remains a normal source code frame.
  }
  return null;
}

function ArchifyFence({ spec, source }: { spec: ArchifyFenceSpec; source: string }) {
  const [src, setSrc] = useState(spec.src || "");
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (spec.src || !spec.ir) {
      setSrc(spec.src || "");
      setFailed(false);
      return;
    }
    let active = true;
    setSrc("");
    setFailed(false);
    void Promise.all([
      archifyArtifactHashInBrowser(spec.type, spec.ir),
      loadBlogArchifyManifest(),
    ]).then(([hash, manifest]) => {
      const artifact = manifest.artifacts.find((item) => item.type === spec.type && item.sha256 === hash);
      if (!artifact) throw new Error("Archify artifact is absent from the public manifest");
      if (active) setSrc(artifact.publicPath);
    }).catch(() => {
      if (active) setFailed(true);
    });
    return () => { active = false; };
  }, [spec]);

  if (!src) {
    return <figure className="archify-embed archify-embed-pending"><figcaption>{spec.title}</figcaption><pre><code>{failed ? source : "Archify 产物匹配中…"}</code></pre></figure>;
  }
  return <ArchifyEmbed src={src} title={spec.title} fallback={<pre><code>{source}</code></pre>} />;
}

function CodeFrame({ children }: { children?: ReactNode }) {
  const [copied, setCopied] = useState(false);
  const code = isValidElement<{
    children?: ReactNode;
    className?: string;
    "data-meta"?: string;
  }>(children) ? children : null;
  const language = code?.props.className?.match(/(?:^|\s)language-([^\s]+)/)?.[1] ?? "text";
  const meta = code?.props["data-meta"] ?? "";
  const title = meta.match(/(?:^|\s)title=(?:"([^"]+)"|'([^']+)'|([^\s]+))/)?.slice(1).find(Boolean)
    ?? meta.match(/(?:^|\s)"([^"]+)"/)?.[1]
    ?? "";
  const terminal = /^(?:bash|sh|shell|zsh|fish|powershell|pwsh|cmd|console)$/i.test(language);
  const rawCodeChildren = code?.props.children ?? children;
  const rawCodeText = nodeText(rawCodeChildren);
  const inferredTitleMatch = !title && !terminal
    ? rawCodeText.match(/^\s*(?:\/\/|#)\s*([\w@./\\-]+\.[\w-]+)\s*\n/)
    : null;
  const frameTitle = title || inferredTitleMatch?.[1] || "";
  const start = inferredTitleMatch?.[0].length ?? 0;
  const end = rawCodeText.endsWith("\n") ? rawCodeText.length - 1 : rawCodeText.length;
  const codeChildren = sliceNodeText(rawCodeChildren, start, end);
  const text = rawCodeText.slice(start, end);
  if (language.toLowerCase() === "mermaid") {
    return <ArchifyRuntimeMermaid source={text} repository="Joruno-AI/blog" title={frameTitle || "内容关系图"} />;
  }
  const archifySpec = parseArchifyFence(language, text, frameTitle);
  if (archifySpec) return <ArchifyFence spec={archifySpec} source={text} />;
  return (
    <div className="expressive-code">
      <figure className={`frame${terminal ? " is-terminal" : ""}${frameTitle ? " has-title" : ""}`}>
        <figcaption className="header">
          {terminal ? <><span className="title" /><span className="sr-only">Terminal window</span></> : frameTitle ? <span className="title">{frameTitle}</span> : null}
        </figcaption>
        <pre data-language={language}>
          <code className={code?.props.className}>
            <div className="ec-line"><div className="code">{codeChildren}</div></div>
          </code>
        </pre>
        <div className="copy">
          <div className={`feedback${copied ? " show" : ""}`} role="status" aria-live="polite">{copied ? "Copied!" : ""}</div>
          <button
            type="button"
            title="Copy to clipboard"
            aria-label="Copy to clipboard"
            data-copied="Copied!"
            data-code={text.replaceAll("\n", "\u007f")}
            onClick={async () => {
              try {
                await copyText(text);
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1200);
              } catch {
                setCopied(false);
              }
            }}
          >
            <div aria-hidden="true" />
          </button>
        </div>
      </figure>
    </div>
  );
}

export function MarkdownContent({ content, className = "platform-prose" }: { content: string; className?: string }) {
  const rootRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={rootRef} className={className}>
      <MarkdownImageViewer content={content} rootRef={rootRef} />
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkSmartypants, remarkMath, remarkDirective, remarkCalloutDirectives, remarkCodeMetadata]}
        rehypePlugins={[
          rehypeRaw,
          [rehypeSanitize, markdownSanitizeSchema],
          rehypeSlug,
          [rehypeAutolinkHeadings, {
            behavior: "append",
            properties: (element: unknown) => {
              const headingText = syntaxTreeText(element);
              return {
                className: ["header-anchor"],
                "tab-index": 0,
                ariaHidden: "false",
                ariaLabel: headingText ? `Link to ${headingText}` : undefined,
                "data-pagefind-ignore": "",
              };
            },
            content: { type: "text", value: "" },
          }],
          [rehypeExternalLinks, { target: "_blank", rel: ["noopener", "noreferrer"] }],
          rehypeKatex,
          rehypeHighlight,
          rehypeMergeAdjacentTextNodes,
        ]}
        components={{
          a: MarkdownLink,
          img: MarkdownImage,
          pre: CodeFrame,
          table: ({ children, node: _node, ...props }) => {
            void _node;
            return <div className="markdown-table-wrap"><table {...props}>{children}</table></div>;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
