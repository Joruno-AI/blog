"use client";

/* eslint-disable @next/next/no-img-element -- repository image URLs are resolved at runtime. */

import { Check, Copy, FileCode2 } from "lucide-react";
import {
  isValidElement,
  useEffect,
  useMemo,
  useState,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react";
import ReactMarkdown, { defaultUrlTransform } from "react-markdown";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import rehypeSlug from "rehype-slug";
import remarkDirective from "remark-directive";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import type { BundledLanguage } from "shiki/bundle/full";

import { ArchifyEmbed } from "@/components/site/archify-embed";
import { ArchifyRuntimeMermaid } from "@/components/site/archify-runtime-mermaid";
import { sha256Hex } from "@/lib/archify/artifact-address.mjs";

import {
  agentRepositoryImageCandidates,
  normalizeAgentMarkdown,
  normalizeAgentMermaidSource,
  parseAgentInlineFileReference,
  resolveAgentRepositoryPath,
} from "@/lib/agent/markdown";
import type { AgentWikiStructureItem } from "@/lib/agent/zread";

type HastNode = { tagName?: string; properties?: Record<string, unknown>; children?: HastNode[] };
const BLOCKED_RAW_TAGS = new Set(["script", "iframe", "object", "embed", "form", "input", "button", "textarea", "select", "option", "base", "meta", "link", "style", "svg", "math"]);
const LANGUAGE_ALIASES: Record<string, string> = {
  bash: "shellscript", sh: "shellscript", shell: "shellscript", zsh: "shellscript",
  js: "javascript", mjs: "javascript", cjs: "javascript", jsx: "jsx",
  ts: "typescript", tsx: "tsx", py: "python", rb: "ruby", rs: "rust",
  md: "markdown", mdx: "mdx", yml: "yaml", gql: "graphql",
  docker: "dockerfile", text: "text", plaintext: "text",
};


// DOMPurify-equivalent boundary used before raw Markdown enters React. The
// original reader accepted basic HTML but removed active nodes, event handlers,
// inline styles and unsafe URL-bearing attributes.
export function rehypeAgentDOMPurify() {
  return (tree: unknown) => {
    const scrub = (node: HastNode) => {
      if (node.properties) {
        for (const key of Object.keys(node.properties)) {
          if (/^on/i.test(key) || /^(?:style|srcDoc|formAction)$/i.test(key)) delete node.properties[key];
        }
        for (const key of ["href", "src", "xLinkHref"]) {
          const value = node.properties[key];
          if (typeof value !== "string") continue;
          if (/^\s*(?:javascript|vbscript|file):/i.test(value)) delete node.properties[key];
          if (/^\s*data:/i.test(value) && !(node.tagName === "img" && key === "src" && /^\s*data:image\/(?:avif|gif|jpe?g|png|svg\+xml|webp);/i.test(value))) delete node.properties[key];
        }
      }
      if (node.children) {
        node.children = node.children.filter((child) => !child.tagName || !BLOCKED_RAW_TAGS.has(child.tagName.toLowerCase()));
        node.children.forEach(scrub);
      }
    };
    scrub(tree as HastNode);
  };
}

function nodeText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(nodeText).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) return nodeText(node.props.children);
  return "";
}

function AgentCodeBlock({ children }: { children?: ReactNode }) {
  const [html, setHtml] = useState("");
  const [copied, setCopied] = useState(false);
  const code = Array.isArray(children) ? children.find(isValidElement) : children;
  const className = isValidElement<{ className?: string }>(code) ? code.props.className || "" : "";
  const rawValue = nodeText(code).replace(/\n+$/, "");
  const token = className.match(/language-([^\s,{]+)/)?.[1]?.toLowerCase() || "text";
  const language = LANGUAGE_ALIASES[token] || token;
  const value = language === "text" && /[├└│]/.test(rawValue)
    ? rawValue.split("\n").map((line) => line.replace(/[ \t]{3,}(?=(?:#|←|→|\/\/))/, "  ").replace(/[ \t]+$/, "")).join("\n")
    : rawValue;

  useEffect(() => {
    let active = true;
    void import("shiki/bundle/full").then(async ({ codeToHtml }) => {
      for (const candidate of [language, "text"]) {
        try {
          const next = await codeToHtml(value, {
            lang: candidate as BundledLanguage,
            themes: { light: "vitesse-light", dark: "vitesse-dark" },
            defaultColor: false,
          });
          const template = document.createElement("template");
          template.innerHTML = next;
          const pre = template.content.querySelector("pre");
          if (!pre) continue;
          pre.classList.add("agent-shiki-code");
          pre.querySelectorAll<HTMLElement>(".line").forEach((line, index) => { line.dataset.line = String(index + 1); });
          if (active) setHtml(template.innerHTML);
          return;
        } catch {
          // Unknown grammars retry with the plain text tokenizer.
        }
      }
      if (active) setHtml("");
    }).catch(() => { if (active) setHtml(""); });
    return () => { active = false; };
  }, [language, value]);

  return <figure className="agent-highlighted-block" data-language={language}>
    <figcaption><span>{language}</span><button type="button" onClick={() => {
      void navigator.clipboard.writeText(value).then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1200);
      });
    }}>{copied ? <Check /> : <Copy />}{copied ? "已复制" : "复制"}</button></figcaption>
    {html ? <div dangerouslySetInnerHTML={{ __html: html }} /> : <pre className="agent-code-fallback"><code>{value}</code></pre>}
  </figure>;
}

type ZReadArchifyManifest = {
  artifacts: Record<string, Record<string, string>>;
  metadata: Record<string, Record<string, { title?: string }>>;
  unsupported: Record<string, Record<string, { reason: string; detail?: string }>>;
};

const ARCHIFY_MANIFEST_URL = "/agent/zread-cache/archify-manifest.json";
let archifyManifestLoader: Promise<ZReadArchifyManifest> | null = null;

function loadArchifyManifest() {
  archifyManifestLoader ??= fetch(ARCHIFY_MANIFEST_URL, {
    cache: "force-cache",
    credentials: "same-origin",
  }).then(async (response) => {
    if (!response.ok) throw new Error(`Archify manifest HTTP ${response.status}`);
    const value = await response.json() as Partial<ZReadArchifyManifest>;
    if (!value.artifacts || !value.metadata || !value.unsupported) throw new Error("Invalid Archify manifest");
    return value as ZReadArchifyManifest;
  }).catch((error) => {
    archifyManifestLoader = null;
    throw error;
  });
  return archifyManifestLoader;
}

function repositoryManifestRecords<T>(records: Record<string, T>, repository: string) {
  return records[repository]
    ?? Object.entries(records).find(([key]) => key.toLowerCase() === repository.toLowerCase())?.[1];
}

function AgentMermaid({ source, repo }: { source: string; repo: string }) {
  const normalized = useMemo(() => normalizeAgentMermaidSource(source), [source]);
  const [sourceHash, setSourceHash] = useState("");
  const [hashFailed, setHashFailed] = useState(false);
  const [manifest, setManifest] = useState<ZReadArchifyManifest | null>(null);
  const [manifestStatus, setManifestStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let active = true;
    setSourceHash("");
    setHashFailed(false);
    void sha256Hex(normalized).then((hash) => {
      if (active) setSourceHash(hash);
    }).catch(() => {
      if (active) setHashFailed(true);
    });
    return () => { active = false; };
  }, [normalized]);

  useEffect(() => {
    let active = true;
    setManifestStatus("loading");
    void loadArchifyManifest().then((value) => {
      if (active) {
        setManifest(value);
        setManifestStatus("ready");
      }
    }).catch(() => {
      if (active) {
        setManifest(null);
        setManifestStatus("error");
      }
    });
    return () => { active = false; };
  }, []);

  const artifacts = manifest ? repositoryManifestRecords(manifest.artifacts, repo) : undefined;
  const metadata = manifest ? repositoryManifestRecords(manifest.metadata, repo) : undefined;
  const artifact = sourceHash ? artifacts?.[sourceHash] : undefined;
  const title = sourceHash ? metadata?.[sourceHash]?.title : undefined;
  if (artifact) {
    return <ArchifyEmbed src={artifact} title={title || `${repo} architecture`} />;
  }

  if (manifestStatus === "loading" || (!sourceHash && !hashFailed)) {
    return <figure className="archify-embed archify-runtime-embed" data-archify-status="loading">
      <figcaption className="archify-embed-header">
        <strong>{`${repo} architecture`}</strong>
        <span>Archify</span>
      </figcaption>
      <div className="archify-embed-status" role="status">正在匹配 Archify 图表…</div>
    </figure>;
  }

  return <ArchifyRuntimeMermaid
    key={sourceHash || normalized}
    source={normalized}
    repository={repo}
    title={title || `${repo} architecture`}
  />;
}

function AgentPre({ children, repo }: { children?: ReactNode; repo: string }) {
  const code = Array.isArray(children) ? children.find(isValidElement) : children;
  const className = isValidElement<{ className?: string }>(code) ? code.props.className || "" : "";
  const source = nodeText(code).replace(/\n+$/, "");
  return /(?:^|\s)language-mermaid(?:\s|$)/.test(className)
    ? <AgentMermaid source={source} repo={repo} />
    : <AgentCodeBlock>{children}</AgentCodeBlock>;
}

function AgentImage({ src = "", alt = "", repo, refName, sourcePath, ...props }: ComponentPropsWithoutRef<"img"> & { repo: string; refName: string; sourcePath: string }) {
  const sources = useMemo(() => agentRepositoryImageCandidates(String(src), repo, refName, sourcePath), [refName, repo, sourcePath, src]);
  const [index, setIndex] = useState(0);
  useEffect(() => setIndex(0), [sources]);
  if (!sources[index]) return <span className="agent-image-unavailable" role="img" aria-label={alt || "图片暂时无法加载"}><span aria-hidden="true">◌</span><span>{alt || "图片暂时无法加载"}</span></span>;
  return <img {...props} className="agent-markdown-image" src={sources[index]} alt={alt} loading="lazy" decoding="async" referrerPolicy="no-referrer" data-viewer-image="" onError={() => setIndex((value) => value + 1)} />;
}

function wikiTitleFor(raw: string, label: string, items: AgentWikiStructureItem[]) {
  const decoded = (() => { try { return decodeURIComponent(raw); } catch { return raw; } })().split("/").filter(Boolean).at(-1) || "";
  const slug = (value: string) => value.trim().toLowerCase().normalize("NFKD").replace(/^\d+(?:\.\d+)*-/, "").replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "");
  const candidates = [label, decoded, decoded.replace(/^\d+(?:\.\d+)*-/, "").replace(/-/g, " ")];
  return items.find((item) => candidates.some((candidate) => item.title.toLowerCase() === candidate.trim().toLowerCase() || slug(item.title) === slug(candidate) || item.slug?.toLowerCase() === decoded.toLowerCase()))?.title || "";
}

export function AgentMarkdown({ content, repo, refName, sourcePath = "", className = "agent-wiki-article prose astro-markdown", wikiItems = [], onOpenWiki, onOpenFile }: {
  content: string;
  repo: string;
  refName: string;
  sourcePath?: string;
  className?: string;
  wikiItems?: AgentWikiStructureItem[];
  onOpenWiki?: (title: string) => void;
  onOpenFile?: (path: string) => void;
}) {
  const LinkComponent = ({ href = "", children, node, className: anchorClassName, ...props }: ComponentPropsWithoutRef<"a"> & { node?: unknown }) => {
    void node;
    if (/^\s*(?:javascript|data|vbscript|file):/i.test(href)) return <span>{children}</span>;
    if (href.startsWith("#")) {
      const wiki = wikiItems.find((item) => item.id === href.slice(1));
      if (wiki && onOpenWiki) return <a {...props} href="#" className={[anchorClassName, "agent-wiki-link"].filter(Boolean).join(" ")} onClick={(event) => { event.preventDefault(); onOpenWiki(wiki.title); }}>{children}</a>;
      return <a {...props} className={anchorClassName} href={href}>{children}</a>;
    }
    const wikiTitle = wikiTitleFor(href, nodeText(children), wikiItems);
    const explicitWiki = href.startsWith("/wiki/") || /zread\.ai\/[^/]+\/[^/]+\/(?:wiki\/)?/i.test(href) || wikiItems.some((item) => item.slug === href.replace(/^\.\//, ""));
    if (explicitWiki && wikiTitle && onOpenWiki) return <a {...props} href={`?doc=${encodeURIComponent(wikiTitle)}`} className={[anchorClassName, "agent-wiki-link"].filter(Boolean).join(" ")} onClick={(event) => { event.preventDefault(); onOpenWiki(wikiTitle); }}>{children}</a>;
    if (!/^[a-z][a-z\d+.-]*:/i.test(href) && !href.startsWith("//")) {
      const path = resolveAgentRepositoryPath(href, sourcePath);
      if (path && onOpenFile) return <a {...props} href={`/agent/${repo}?file=${encodeURIComponent(path)}&ref=${encodeURIComponent(refName)}`} className={[anchorClassName, "agent-file-reference"].filter(Boolean).join(" ")} title={props.title || path} onClick={(event) => { event.preventDefault(); onOpenFile(path); }}><FileCode2 className="agent-file-reference-icon" aria-hidden="true" /><span className="agent-file-reference-label">{children}</span></a>;
    }
    if (/^https?:\/\//i.test(href)) return <a {...props} href={href} className={[anchorClassName, "agent-external-link"].filter(Boolean).join(" ")} target="_blank" rel="noopener nofollow">{children}<span className="agent-external-link-icon" aria-hidden="true">↗</span></a>;
    if (/^(?:mailto|tel):/i.test(href)) return <a {...props} className={anchorClassName} href={href}>{children}</a>;
    return <span>{children}</span>;
  };

  const CodeComponent = ({ children, className: codeClassName, node, ...props }: ComponentPropsWithoutRef<"code"> & { node?: unknown }) => {
    void node;
    const value = nodeText(children);
    if (codeClassName || value.includes("\n")) return <code className={codeClassName} {...props}>{children}</code>;
    const reference = parseAgentInlineFileReference(value, sourcePath);
    if (!reference || !onOpenFile) return <code {...props}>{children}</code>;
    const hash = reference.line ? `#L${reference.line}${reference.column ? `C${reference.column}` : ""}` : "";
    return <a href={`/agent/${repo}?file=${encodeURIComponent(reference.path)}&ref=${encodeURIComponent(refName)}${hash}`} className="agent-file-reference" title={reference.path} onClick={(event) => { event.preventDefault(); onOpenFile(reference.path); }}><FileCode2 className="agent-file-reference-icon" aria-hidden="true" /><span className="agent-file-reference-label"><code {...props}>{children}</code></span></a>;
  };

  return <div className={className}>
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath, remarkDirective]}
      rehypePlugins={[rehypeRaw, rehypeAgentDOMPurify, rehypeSlug, rehypeKatex]}
      urlTransform={(url, key) => key === "src" && /^data:image\/(?:avif|gif|jpe?g|png|svg\+xml|webp);/i.test(url) ? url : defaultUrlTransform(url)}
      components={{
        pre: ({ children }) => <AgentPre repo={repo}>{children}</AgentPre>,
        code: CodeComponent,
        a: LinkComponent,
        img: ({ node, ...props }) => { void node; return <AgentImage {...props} repo={repo} refName={refName} sourcePath={sourcePath} />; },
        details: ({ className: detailsClassName, node, ...props }) => { void node; return <details {...props} className={["agent-source-files", detailsClassName].filter(Boolean).join(" ")} />; },
        summary: ({ children, node, ...props }) => { void node; return <summary {...props}>{nodeText(children).trim().toLowerCase() === "relevant source files" ? "相关源文件" : children}</summary>; },
        strong: ({ children, node, ...props }) => { void node; return <strong {...props}>{nodeText(children).trim().toLowerCase() === "sources:" ? "来源：" : children}</strong>; },
      }}
    >{normalizeAgentMarkdown(content)}</ReactMarkdown>
  </div>;
}
