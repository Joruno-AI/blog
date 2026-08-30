"use client";

/* eslint-disable @next/next/no-img-element -- repository image URLs are resolved at runtime. */

import { Check, Copy, FileCode2, Maximize2, Minus, Plus, RotateCcw } from "lucide-react";
import {
  isValidElement,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type CSSProperties,
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

import {
  agentRepositoryImageCandidates,
  normalizeAgentMarkdown,
  normalizeAgentMermaidSource,
  parseAgentInlineFileReference,
  resolveAgentRepositoryPath,
} from "@/lib/agent/markdown";
import type { AgentWikiStructureItem } from "@/lib/agent/zread";

type HastNode = { tagName?: string; properties?: Record<string, unknown>; children?: HastNode[] };
type MermaidApi = {
  initialize(options: Record<string, unknown>): void;
  render(id: string, source: string): Promise<{ svg: string; bindFunctions?: (element: Element) => void }>;
};

const BLOCKED_RAW_TAGS = new Set(["script", "iframe", "object", "embed", "form", "input", "button", "textarea", "select", "option", "base", "meta", "link", "style", "svg", "math"]);
const BLOCKED_SVG_TAGS = new Set(["script", "foreignobject", "iframe", "object", "embed", "audio", "video"]);
const MERMAID_CDN = "https://cdn.jsdelivr.net/npm/mermaid@11.17.2/dist/mermaid.esm.min.mjs";
const LANGUAGE_ALIASES: Record<string, string> = {
  bash: "shellscript", sh: "shellscript", shell: "shellscript", zsh: "shellscript",
  js: "javascript", mjs: "javascript", cjs: "javascript", jsx: "jsx",
  ts: "typescript", tsx: "tsx", py: "python", rb: "ruby", rs: "rust",
  md: "markdown", mdx: "mdx", yml: "yaml", gql: "graphql",
  docker: "dockerfile", text: "text", plaintext: "text",
};

let mermaidLoader: Promise<MermaidApi> | null = null;
let mermaidRenderQueue: Promise<void> = Promise.resolve();
let mermaidSequence = 0;

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

function fallbackMermaid(source: string) {
  const labels = new Map<string, string>();
  const edges: Array<[string, string]> = [];
  const nodePattern = /([A-Za-z0-9_.:-]+)(?:\[([^\]]+)\]|\(([^)]+)\)|\{([^}]+)\})?/g;
  for (const line of source.split(/\r?\n/)) {
    if (/^\s*(?:graph|flowchart|sequenceDiagram|classDiagram|stateDiagram)/i.test(line)) continue;
    const arrow = line.match(/(.+?)\s*(?:-->|---|-.->|==>)\s*(?:\|[^|]*\|\s*)?(.+)/);
    if (!arrow) continue;
    const read = (raw: string) => {
      const match = [...raw.matchAll(nodePattern)].at(-1);
      const id = match?.[1] || raw.trim();
      labels.set(id, (match?.[2] || match?.[3] || match?.[4] || id).replace(/^['"]|['"]$/g, ""));
      return id;
    };
    edges.push([read(arrow[1]), read(arrow[2])]);
  }
  const ids = [...new Set([...labels.keys(), ...edges.flat()])].slice(0, 24);
  return { ids, labels, edges: edges.filter(([from, to]) => ids.includes(from) && ids.includes(to)) };
}

function MermaidFallback({ source }: { source: string }) {
  const graph = useMemo(() => fallbackMermaid(source), [source]);
  if (!graph.ids.length) return <pre className="agent-code-fallback"><code>{source}</code></pre>;
  const cols = Math.min(4, Math.max(1, Math.ceil(Math.sqrt(graph.ids.length))));
  const positions = new Map(graph.ids.map((id, index) => [id, { x: 110 + index % cols * 200, y: 70 + Math.floor(index / cols) * 120 }]));
  return <svg className="agent-mermaid-fallback" viewBox={`0 0 820 ${Math.max(220, Math.ceil(graph.ids.length / cols) * 120 + 40)}`} role="img" aria-label="Mermaid 关系图">
    <defs><marker id="agent-mermaid-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0L8 4L0 8Z" /></marker></defs>
    {graph.edges.map(([from, to], index) => { const a = positions.get(from)!; const b = positions.get(to)!; return <line x1={a.x} y1={a.y + 26} x2={b.x} y2={b.y - 26} markerEnd="url(#agent-mermaid-arrow)" key={`${from}-${to}-${index}`} />; })}
    {graph.ids.map((id) => { const point = positions.get(id)!; return <g transform={`translate(${point.x - 76} ${point.y - 26})`} key={id}><rect width="152" height="52" rx="8" /><text x="76" y="31" textAnchor="middle">{graph.labels.get(id) || id}</text></g>; })}
  </svg>;
}

function loadMermaid() {
  mermaidLoader ??= (new Function("url", "return import(url)") as (url: string) => Promise<{ default: MermaidApi }>)(MERMAID_CDN)
    .then((module) => module.default)
    .catch((reason) => { mermaidLoader = null; throw reason; });
  return mermaidLoader;
}

function mermaidConfig(element: HTMLElement | null) {
  const styles = element ? window.getComputedStyle(element) : null;
  const read = (name: string, fallback: string) => styles?.getPropertyValue(name).trim() || fallback;
  const paper = read("--diagram-paper", "#fff");
  const ink = read("--diagram-ink", "#202020");
  const muted = read("--diagram-muted", "#707070");
  const rule = read("--diagram-rule", "#d6d6d6");
  const solid = read("--diagram-rule-solid", "#8e8e8e");
  return {
    startOnLoad: false,
    securityLevel: "strict",
    suppressErrorRendering: true,
    theme: "base",
    htmlLabels: false,
    fontFamily: read("--diagram-font-node", "Inter, ui-sans-serif, system-ui, sans-serif"),
    flowchart: { htmlLabels: false, useMaxWidth: true, curve: "linear", nodeSpacing: 26, rankSpacing: 30, padding: 8 },
    themeVariables: {
      background: paper, primaryColor: paper, primaryBorderColor: solid, primaryTextColor: ink,
      secondaryColor: read("--diagram-paper-2", paper), secondaryBorderColor: solid, secondaryTextColor: ink,
      tertiaryColor: paper, tertiaryBorderColor: rule, tertiaryTextColor: ink, mainBkg: paper,
      nodeBorder: solid, textColor: ink, lineColor: muted, clusterBkg: read("--diagram-paper-2", paper),
      clusterBorder: rule, edgeLabelBackground: paper, labelTextColor: muted, fontSize: "12px",
    },
  };
}

function sanitizeMermaidSvg(markup: string, diagramId: string) {
  const parsed = new DOMParser().parseFromString(markup, "image/svg+xml");
  if (parsed.querySelector("parsererror")) throw new Error("Mermaid output was not valid SVG");
  const svg = parsed.documentElement as unknown as SVGSVGElement;
  if (svg.tagName.toLowerCase() !== "svg") throw new Error("Mermaid output did not contain an SVG");
  [...svg.querySelectorAll("*")].forEach((element) => {
    if (BLOCKED_SVG_TAGS.has(element.tagName.toLowerCase())) { element.remove(); return; }
    if (element.tagName.toLowerCase() === "style" && /@import|url\s*\(\s*['"]?(?!#)/i.test(element.textContent || "")) { element.remove(); return; }
    [...element.attributes].forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim();
      if (/^on/.test(name) || name === "srcdoc" || ((name === "href" || name === "xlink:href") && value && !value.startsWith("#")) || (name === "style" && /url\s*\(\s*['"]?(?!#)/i.test(value))) element.removeAttribute(attribute.name);
    });
  });
  const namespace = "http://www.w3.org/2000/svg";
  const defs = svg.querySelector<SVGDefsElement>(":scope > defs") || parsed.createElementNS(namespace, "defs");
  if (!defs.parentNode) svg.prepend(defs);
  const filter = parsed.createElementNS(namespace, "filter");
  filter.id = `${diagramId}-hand-drawn`;
  filter.setAttribute("x", "-8%");
  filter.setAttribute("y", "-8%");
  filter.setAttribute("width", "116%");
  filter.setAttribute("height", "116%");
  const noise = parsed.createElementNS(namespace, "feTurbulence");
  noise.setAttribute("type", "fractalNoise");
  noise.setAttribute("baseFrequency", "0.018");
  noise.setAttribute("numOctaves", "2");
  noise.setAttribute("seed", "3");
  noise.setAttribute("result", "roughNoise");
  const displacement = parsed.createElementNS(namespace, "feDisplacementMap");
  displacement.setAttribute("in", "SourceGraphic");
  displacement.setAttribute("in2", "roughNoise");
  displacement.setAttribute("scale", "0.8");
  displacement.setAttribute("xChannelSelector", "R");
  displacement.setAttribute("yChannelSelector", "G");
  filter.append(noise, displacement);
  defs.append(filter);
  const title = parsed.createElementNS(namespace, "title");
  const description = parsed.createElementNS(namespace, "desc");
  title.id = `${diagramId}-title`;
  title.textContent = "仓库文档关系图";
  description.id = `${diagramId}-desc`;
  description.textContent = "根据仓库文档中的 Mermaid 源码生成，可使用工具栏缩放查看。";
  svg.prepend(description);
  svg.prepend(title);
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-labelledby", `${title.id} ${description.id}`);
  svg.setAttribute("focusable", "false");
  svg.classList.add("agent-excalidraw-svg");
  svg.style.setProperty("--agent-hand-drawn-filter", `url(#${filter.id})`);
  svg.querySelectorAll<SVGGElement>("g.node").forEach((node, index) => { node.dataset.palette = String(index % 4); });
  svg.querySelectorAll<SVGGElement>("g.cluster").forEach((node, index) => { node.dataset.palette = String(index % 4); });
  svg.querySelectorAll<SVGGElement>("g.edgePath").forEach((node, index) => { node.dataset.palette = String(index % 4); });
  return new XMLSerializer().serializeToString(svg);
}

async function renderMermaid(source: string, reactId: string, element: HTMLElement | null) {
  let rendered = "";
  const run = async () => {
    const mermaid = await loadMermaid();
    mermaid.initialize(mermaidConfig(element));
    const sources = [...new Set([normalizeAgentMermaidSource(source), source])].filter(Boolean);
    let lastError: unknown;
    for (const candidate of sources) {
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const diagramId = `agent-mermaid-${reactId}-${mermaidSequence++}`;
        try {
          const result = await mermaid.render(diagramId, candidate);
          rendered = sanitizeMermaidSvg(result.svg, diagramId);
          return;
        } catch (reason) {
          lastError = reason;
          document.getElementById(diagramId)?.remove();
          document.getElementById(`d${diagramId}`)?.remove();
          if (attempt < 2) await new Promise((resolve) => window.setTimeout(resolve, 50 + attempt * 70));
        }
      }
    }
    throw lastError instanceof Error ? lastError : new Error("Mermaid render failed");
  };
  const task = mermaidRenderQueue.then(run);
  mermaidRenderQueue = task.catch(() => undefined);
  await task;
  return rendered;
}

function AgentMermaid({ source }: { source: string }) {
  const reactId = useId().replace(/:/g, "");
  const figureRef = useRef<HTMLElement>(null);
  const [svg, setSvg] = useState("");
  const [failed, setFailed] = useState(false);
  const [scale, setScale] = useState(1);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setFailed(false);
    setSvg("");
    void renderMermaid(source, `${reactId}-${attempt}`, figureRef.current).then((next) => { if (active) setSvg(next); }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [attempt, reactId, source]);
  useEffect(() => {
    if (!svg) return;
    const frame = window.requestAnimationFrame(() => {
      const viewport = figureRef.current?.querySelector<HTMLElement>(".agent-mermaid-viewport");
      const diagram = figureRef.current?.querySelector<SVGSVGElement>(".agent-mermaid-canvas > svg");
      const viewBox = diagram?.viewBox.baseVal;
      if (!viewport || !viewBox?.width || !viewBox.height) return;
      const availableWidth = Math.max(1, viewport.clientWidth - 48);
      const naturalHeight = availableWidth * viewBox.height / viewBox.width;
      const comfortableHeight = Math.min(640, Math.max(360, window.innerHeight * .55));
      setScale(Math.max(.35, naturalHeight > comfortableHeight ? comfortableHeight / naturalHeight : 1));
    });
    return () => window.cancelAnimationFrame(frame);
  }, [svg]);
  const change = (value: number) => setScale(Math.max(.35, Math.round(value * 100) / 100));
  const canvasStyle = { "--diagram-width": `${scale * 100}%` } as CSSProperties;
  return <figure ref={figureRef} className="agent-mermaid diagram-design" data-mermaid-original={source} data-mermaid-source={normalizeAgentMermaidSource(source)} data-diagram-scale={scale}>
    <div className="agent-mermaid-toolbar"><span><b>手绘关系图</b><em>{failed ? "本地兼容渲染" : svg ? "滚动查看 · 可缩放" : "正在绘制"}</em></span><div>
      <button type="button" aria-label="缩小" onClick={() => change(scale - .1)}><Minus /></button>
      <label className="agent-mermaid-scale"><input type="number" step="10" value={Math.round(scale * 100)} inputMode="numeric" aria-label="图表缩放百分比" onChange={(event) => change(Number(event.target.value) / 100)} /><span>%</span></label>
      <button type="button" aria-label="放大" onClick={() => change(scale + .1)}><Plus /></button>
      <button type="button" aria-label="重置图表" onClick={() => change(1)}><RotateCcw /></button>
      <button type="button" aria-label="全屏查看图表" onClick={() => { const frame = figureRef.current; if (!frame) return; if (document.fullscreenElement === frame) void document.exitFullscreen(); else void frame.requestFullscreen?.(); }}><Maximize2 /></button>
    </div></div>
    <div className="agent-mermaid-viewport">
      {svg ? <div className="agent-mermaid-canvas" style={canvasStyle} dangerouslySetInnerHTML={{ __html: svg }} />
        : failed ? <div className="agent-mermaid-canvas" style={canvasStyle}><MermaidFallback source={source} /></div>
          : <div className="agent-mermaid-canvas" style={canvasStyle}><div className="agent-diagram-loading" role="status" aria-label="正在绘制关系图"><span /><span /><span /><em>正在绘制关系图</em></div></div>}
    </div>
    {failed ? <figcaption><button type="button" onClick={() => setAttempt((value) => value + 1)}>重新渲染</button></figcaption> : null}
  </figure>;
}

function AgentPre({ children }: { children?: ReactNode }) {
  const code = Array.isArray(children) ? children.find(isValidElement) : children;
  const className = isValidElement<{ className?: string }>(code) ? code.props.className || "" : "";
  const source = nodeText(code).replace(/\n+$/, "");
  return /(?:^|\s)language-mermaid(?:\s|$)/.test(className) ? <AgentMermaid source={source} /> : <AgentCodeBlock>{children}</AgentCodeBlock>;
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
    const explicitWiki = href.startsWith("/wiki/") || /(?:deepwiki\.com|zread\.ai)\/[^/]+\/[^/]+\/(?:wiki\/)?/i.test(href) || wikiItems.some((item) => item.slug === href.replace(/^\.\//, ""));
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
        pre: AgentPre,
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
