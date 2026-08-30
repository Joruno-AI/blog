"use client";

import Link from "next/link";
import {
  cloneElement,
  isValidElement,
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

import { MarkdownImageViewer } from "@/components/site/markdown-image-viewer";

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

function MarkdownImage({ alt = "", node: _node, ...props }: MarkdownImageProps) {
  void _node;
  // Markdown dimensions and ViewerJS rely on the source element rather than
  // Next Image's wrapper and optimizer markup.
  // eslint-disable-next-line @next/next/no-img-element
  return <img {...props} alt={alt} loading="lazy" decoding="async" data-viewer-image="" />;
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
            content: { type: "text", value: "#" },
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
