"use client";

import {
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
} from "lucide-react";
import {
  isValidElement,
  type CSSProperties,
  type ComponentPropsWithoutRef,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import {
  bundledLanguages,
  codeToHtml,
  type BundledLanguage,
} from "shiki/bundle/full";

import { SiteIcon } from "@/components/site/site-icon";
import { docsMarkdownSanitizeSchema } from "@/lib/security/docs-markdown";

import {
  docsRawUrl,
  resolveDocsPath,
  type DocsArticle,
  type DocsCatalog,
  type DocsSource,
} from "@/lib/docs/catalog";
import {
  docsHeadingId,
  docsMarkdownUrls,
  docsReaderUrl,
  extractDocsHeadings,
  findDocsArticle,
  normalizeDocsMarkdown,
  rememberDocsLocation,
  shouldRetryDocsStatus,
  type DocsHeading,
  type LocatedDocsArticle,
} from "@/lib/parity/docs";

const FETCH_RETRY_DELAYS = [240, 700, 1400] as const;
const markdownCache = new Map<string, string>();
let catalogPromise: Promise<DocsCatalog> | null = null;

type HistoryMode = "none" | "push" | "replace";

const DOCS_RI_PATHS = {
  add: "M11 11V5H13V11H19V13H13V19H11V13H5V11H11Z",
  close: "M11.9997 10.5865L16.9495 5.63672L18.3637 7.05093L13.4139 12.0007L18.3637 16.9504L16.9495 18.3646L11.9997 13.4149L7.04996 18.3646L5.63574 16.9504L10.5855 12.0007L5.63574 7.05093L7.04996 5.63672L11.9997 10.5865Z",
  menu: "M3 4H21V6H3V4ZM3 11H15V13H3V11ZM3 18H21V20H3V18Z",
  nodeTree: "M10 2C10.5523 2 11 2.44772 11 3V7C11 7.55228 10.5523 8 10 8H8V10H13V9C13 8.44772 13.4477 8 14 8H20C20.5523 8 21 8.44772 21 9V13C21 13.5523 20.5523 14 20 14H14C13.4477 14 13 13.5523 13 13V12H8V18H13V17C13 16.4477 13.4477 16 14 16H20C20.5523 16 21 16.4477 21 17V21C21 21.5523 20.5523 22 20 22H14C13.4477 22 13 21.5523 13 21V20H7C6.44772 20 6 19.5523 6 19V8H4C3.44772 8 3 7.55228 3 7V3C3 2.44772 3.44772 2 4 2H10ZM19 18H15V20H19V18ZM19 10H15V12H19V10ZM9 4H5V6H9V4Z",
  subtract: "M5 11V13H19V11H5Z",
} as const;

function DocsRiIcon({ name }: { name: keyof typeof DOCS_RI_PATHS }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor">
      <path d={DOCS_RI_PATHS[name]} />
    </svg>
  );
}

function reloadDocsIndex(event: ReactMouseEvent<HTMLAnchorElement>) {
  if (
    event.defaultPrevented
    || event.button !== 0
    || event.metaKey
    || event.ctrlKey
    || event.shiftKey
    || event.altKey
  ) return;

  event.preventDefault();
  window.location.assign("/docs/");
}

function nodeText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(nodeText).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) return nodeText(node.props.children);
  return "";
}

function waitForRetry(delay: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const timer = window.setTimeout(resolve, delay);
    signal?.addEventListener("abort", () => {
      window.clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    }, { once: true });
  });
}

async function fetchDocsCatalog() {
  if (!catalogPromise) {
    catalogPromise = (async () => {
      let lastStatus: number | undefined;
      for (let attempt = 0; attempt < FETCH_RETRY_DELAYS.length; attempt += 1) {
        try {
          const response = await fetch("/docs/catalog.json?v=5");
          lastStatus = response.status;
          if (response.ok) return response.json() as Promise<DocsCatalog>;
          if (!shouldRetryDocsStatus(response.status)) break;
        } catch {
          // Retry transient same-origin failures.
        }
        if (attempt < FETCH_RETRY_DELAYS.length - 1) {
          await waitForRetry(FETCH_RETRY_DELAYS[attempt]);
        }
      }
      catalogPromise = null;
      const suffix = lastStatus ? `（HTTP ${lastStatus}）` : "";
      throw new Error(`无法加载文档目录${suffix}，请稍后重试。`);
    })();
  }
  return catalogPromise;
}

async function fetchMarkdown(source: DocsSource, path: string, signal?: AbortSignal) {
  const cacheKey = `${source.id}:${path}`;
  const cached = markdownCache.get(cacheKey);
  if (cached !== undefined) return cached;

  let lastStatus: number | undefined;
  for (const url of docsMarkdownUrls(source, path)) {
    for (let attempt = 0; attempt < FETCH_RETRY_DELAYS.length; attempt += 1) {
      try {
        const response = await fetch(url, { signal });
        lastStatus = response.status;
        if (response.ok) {
          const markdown = await response.text();
          if (!markdown.trim()) throw new Error("该章节源文件暂无正文。");
          markdownCache.set(cacheKey, markdown);
          return markdown;
        }
        if (!shouldRetryDocsStatus(response.status)) break;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") throw error;
        if (error instanceof Error && error.message === "该章节源文件暂无正文。") throw error;
      }
      if (attempt < FETCH_RETRY_DELAYS.length - 1) {
        await waitForRetry(FETCH_RETRY_DELAYS[attempt], signal);
      }
    }
  }

  const suffix = lastStatus ? `（HTTP ${lastStatus}）` : "";
  throw new Error(`正文加载失败${suffix}，已自动重试并切换备用源。`);
}

const CODE_LANGUAGE_ALIASES: Record<string, BundledLanguage> = {
  bash: "shellscript",
  bat: "bat",
  c: "c",
  "c#": "csharp",
  "c++": "cpp",
  cjs: "javascript",
  console: "shellscript",
  cpp: "cpp",
  cs: "csharp",
  csharp: "csharp",
  css: "css",
  docker: "dockerfile",
  dockerfile: "dockerfile",
  dotenv: "dotenv",
  graphql: "graphql",
  go: "go",
  golang: "go",
  html: "html",
  http: "http",
  ini: "ini",
  java: "java",
  javascript: "javascript",
  js: "javascript",
  json: "json",
  json5: "json5",
  jsx: "jsx",
  kotlin: "kotlin",
  kt: "kotlin",
  make: "makefile",
  makefile: "makefile",
  markdown: "markdown",
  md: "markdown",
  mts: "typescript",
  mysql: "sql",
  nginx: "nginx",
  objectivec: "objective-c",
  perl: "perl",
  php: "php",
  powershell: "powershell",
  ps1: "powershell",
  py: "python",
  python: "python",
  rb: "ruby",
  rs: "rust",
  ruby: "ruby",
  rust: "rust",
  scala: "scala",
  sh: "shellscript",
  shell: "shellscript",
  shellscript: "shellscript",
  sql: "sql",
  swift: "swift",
  terminal: "shellscript",
  toml: "toml",
  ts: "typescript",
  tsx: "tsx",
  typescript: "typescript",
  vue: "vue",
  xml: "xml",
  yaml: "yaml",
  yml: "yaml",
};

const DIFF_LANGUAGE_TOKENS = new Set(["dif", "diff", "patch"]);
const GENERIC_LANGUAGE_TOKENS = new Set(["none", "plain", "plaintext", "text", "txt"]);

function hasDiffMarkers(value: string) {
  return /^(?:diff --git|index [\da-f]+|@@\s|---\s|\+\+\+\s|[+-](?![+-]))/im.test(value);
}

function inferCodeLanguage(source: string): BundledLanguage | undefined {
  const code = source.trim();
  if (!code) return undefined;
  if (code.startsWith("{") || code.startsWith("[")) {
    try {
      JSON.parse(code);
      return "json";
    } catch {
      // Continue with syntax-based detection.
    }
  }
  if (/<template(?:\s|>)|<script\s+setup|defineComponent\s*\(/i.test(code)) return "vue";
  if (/^<\?php|\b(?:namespace|use)\s+[A-Z\\][\w\\]*;/m.test(code)) return "php";
  if (/(?:^|\n)\s*package\s+\w+\b|(?:^|\n)\s*func\s+(?:\([^)]*\)\s*)?\w+\s*\(|\bfmt\.(?:Print|Printf|Println)\b/m.test(code)) return "go";
  if (/(?:^|\n)\s*(?:use\s+(?:std|crate)::|fn\s+\w+\s*\(|let\s+mut\s+\w+)|\bprintln!\s*\(/m.test(code)) return "rust";
  if (/(?:^|\n)\s*#include\s*[<"]|\bstd::|\b(?:cout|cin)\s*<</m.test(code)) return "cpp";
  if (/(?:^|\n)\s*(?:using\s+System\b|namespace\s+\w+)|\bConsole\.WriteLine\s*\(/m.test(code)) return "csharp";
  if (/(?:^|\n)\s*(?:interface|type|enum|namespace)\s+\w+|:\s*(?:string|number|boolean|unknown|never)(?:\W|$)|\b(?:as const|satisfies)\b/m.test(code)) return "typescript";
  if (/^\s*export\s+[A-Z_][A-Z0-9_]*\s*=/m.test(code)) return "shellscript";
  if (/(?:^|\n)\s*(?:FROM|RUN|COPY|ADD|ENTRYPOINT|CMD|WORKDIR|EXPOSE)\s+/m.test(code)) return "dockerfile";
  if (/(?:^|\n)\s*(?:from\s+[\w.]+\s+import\s+|import\s+(?:os|sys|json|re|math|pathlib|typing|openai|langchain)\b)/m.test(code) || /\b(?:os\.environ|client\.(?:chat\.)?completions\.create|True|False|None)\b/.test(code)) return "python";
  if (/(?:^|\n)\s*(?:require\s+['"][^'"]+['"]|puts\s+|class\s+\w+\s*<)|\.each\s+do\s*\|/m.test(code)) return "ruby";
  if (/(?:^|\n)\s*(?:import|export)\b|\b(?:const|let|var)\s+[$\w]+|=>|\bfunction\s+[$\w]+|\b(?:window|document|console)\./m.test(code)) return "javascript";
  if (/<[a-z][\s\S]*>/i.test(code)) return "html";
  if (/(?:^|\n)\s*(?:[.#][\w-]+|@media\b)[^{\n]*\{|\b(?:display|color|margin|padding|background):\s*/m.test(code)) return "css";
  if (/(?:^|\n)\s*(?:[$#]\s+)?(?:sudo\s+)?(?:npm|pnpm|yarn|bun|pip|pip3|python|python3|uv|poetry|pipx|curl|wget|git|cd|mkdir|docker|kubectl|mysql|psql|sqlite3|apt|apt-get|brew|echo|export|source|chmod|chown|rm|cp|mv|cat|grep|sed|awk|md5sum|sha256sum|groupadd|useradd|tar|ln|rpm|yum|dnf|service|systemctl|more|less|head|tail|make|cmake)\b|(?:^|\n)\s*\.\/(?:configure|[\w.-]+)|(?:^|\n)\s*(?:mysql|psql)>\s*|^#!\/.*(?:ba|z)?sh|(?:^|\n)\s*(?:if\s+\[|for\s+\w+\s+in\b|case\s+.+\s+in\b|[A-Z_][A-Z0-9_]*=)/m.test(code)) return "shellscript";
  if ((((code.match(/(?:^|\n)\s*[\w.-]+:\s+[^\n]+/g) || []).length >= 2) || /(?:^|\n)\s*---\s*$/.test(code)) && !/<[a-z][\s\S]*>/i.test(code) && !/[{}()]|(?:^|\n)\s*(?:def|class|from|import)\b/m.test(code)) return "yaml";
  if (/(?:^|\n)\s*\[[\w.-]+\]\s*$/m.test(code) || ((code.match(/(?:^|\n)\s*[\w.-]+\s*=\s*(?:"[^"]*"|'[^']*'|\d+)/g) || []).length >= 2 && !/[(){}:]|(?:^|\n)\s*(?:def|class|from|import)\b/m.test(code))) return "toml";
  if (/(?:^|\n)\s*(?:def|class)\s+\w+|(?:^|\n)\s*from\s+[\w.]+\s+import\s+|(?:^|\n)\s*import\s+[\w.]+|\bprint\s*\(|\b(?:model|temperature|max_tokens|prompt|messages)\s*=|\b(?:client|response)\.[\w.]+\(/m.test(code)) return "python";
  if (/\b(?:SELECT|INSERT|UPDATE|DELETE|CREATE TABLE|ALTER TABLE)\b/i.test(code)) return "sql";
  if (/(?:^|\n)\s*(?:val|var)\s+\w+\s*(?::[^=]+)?=|(?:^|\n)\s*(?:object|case class|trait)\s+\w+/m.test(code)) return "scala";
  if (/\bpublic\s+(?:static\s+)?(?:class|void)|\bSystem\.out\./m.test(code)) return "java";
  if (!/[A-Za-z_$][\w$]*(?:\s*[=().:]|\s|$)/.test(code)) return "text" as BundledLanguage;
  return undefined;
}

type HighlightedCode = {
  className: string;
  html: string;
  style: CSSProperties;
};

function CodeBlock({ children }: { children?: ReactNode }) {
  const [copied, setCopied] = useState(false);
  const [highlighted, setHighlighted] = useState<HighlightedCode | null>(null);
  const value = nodeText(children).replace(/\n+$/, "");
  const codeChild = Array.isArray(children) ? children.find(isValidElement) : children;
  const className = isValidElement<{ className?: string }>(codeChild) ? codeChild.props.className || "" : "";
  const languageToken = className.match(/language-([^\s,{]+)/)?.[1]?.toLocaleLowerCase();
  const declaredLanguage = languageToken
    ? CODE_LANGUAGE_ALIASES[languageToken]
      || (languageToken in bundledLanguages ? languageToken as BundledLanguage : undefined)
    : undefined;
  const shouldInfer = !languageToken
    || !declaredLanguage
    || GENERIC_LANGUAGE_TOKENS.has(languageToken)
    || (DIFF_LANGUAGE_TOKENS.has(languageToken) && !hasDiffMarkers(value));
  const inferredLanguage = inferCodeLanguage(value);
  const hasLanguageMismatch = inferredLanguage
    && declaredLanguage
    && inferredLanguage !== declaredLanguage
    && (inferredLanguage === "shellscript" || inferredLanguage === "python");
  const language = (
    shouldInfer
      ? inferredLanguage || declaredLanguage
      : hasLanguageMismatch
        ? inferredLanguage
        : declaredLanguage
  ) || ("text" as BundledLanguage);
  const terminal = language === "shellscript";

  useEffect(() => {
    let active = true;
    setHighlighted(null);

    void (async () => {
      for (const candidate of Array.from(new Set<BundledLanguage>([language, "text" as BundledLanguage]))) {
        try {
          const html = await codeToHtml(value, {
            lang: candidate,
            themes: { light: "vitesse-light", dark: "vitesse-dark" },
            defaultColor: false,
          });
          if (!active) return;
          const template = document.createElement("template");
          template.innerHTML = html;
          const pre = template.content.querySelector("pre");
          if (!pre) continue;
          const style = Array.from(pre.style).reduce<Record<string, string>>((result, property) => {
            result[property] = pre.style.getPropertyValue(property);
            return result;
          }, {});
          setHighlighted({
            className: pre.className,
            html: pre.innerHTML,
            style: style as CSSProperties,
          });
          return;
        } catch {
          // Fall back to plain text after the final candidate.
        }
      }
    })();

    return () => { active = false; };
  }, [language, value]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const fallback = document.createElement("textarea");
      fallback.value = value;
      fallback.readOnly = true;
      fallback.style.position = "fixed";
      fallback.style.opacity = "0";
      document.body.append(fallback);
      fallback.select();
      document.execCommand("copy");
      fallback.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <div className="reader-code-block" data-code={value} data-source-language={languageToken} data-highlighted={String(Boolean(highlighted))} data-language={language} data-terminal={String(terminal)}>
      <div className="reader-code-toolbar" data-terminal={String(terminal)}>
        <span className="reader-code-window-controls" aria-hidden="true">
          <span className="reader-code-window-dot is-close" />
          <span className="reader-code-window-dot is-minimize" />
          <span className="reader-code-window-dot is-maximize" />
        </span>
        <span className="reader-code-copy-feedback" data-visible={copied || undefined} role="status" aria-live="polite">
          {copied ? "已复制" : ""}
        </span>
        <button type="button" className="reader-code-copy" data-copied={copied || undefined} onClick={copy} aria-label="复制代码">
          <SiteIcon name="file-copy-line" />
          <span className="reader-code-copy-label">{copied ? "已复制" : "复制"}</span>
        </button>
      </div>
      {highlighted ? (
        <pre className={highlighted.className} style={highlighted.style} tabIndex={0} dangerouslySetInnerHTML={{ __html: highlighted.html }} />
      ) : (
        <pre><code>{value}</code></pre>
      )}
      <span className="reader-code-language">{terminal ? "bash" : (language as string) === "text" ? "代码" : language}</span>
    </div>
  );
}

function DocsArticleActions({
  markdown,
  title,
  url,
  immersive,
  onImmersiveChange,
}: {
  markdown: string;
  title: string;
  url: string;
  immersive: boolean;
  onImmersiveChange: (next: boolean) => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState("");

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("click", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("click", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  useEffect(() => {
    document.documentElement.toggleAttribute("data-immersive", immersive);
    return () => document.documentElement.removeAttribute("data-immersive");
  }, [immersive]);

  async function copyMarkdown() {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopyFeedback("Copied");
    } catch {
      const fallback = document.createElement("textarea");
      fallback.value = markdown;
      fallback.readOnly = true;
      fallback.style.position = "fixed";
      fallback.style.opacity = "0";
      document.body.append(fallback);
      fallback.select();
      const copied = document.execCommand("copy");
      fallback.remove();
      setCopyFeedback(copied ? "Copied" : "Copy failed");
    }
    window.setTimeout(() => setCopyFeedback(""), 1600);
  }

  const prompt = encodeURIComponent(`请阅读这篇文章并帮我总结要点：《${title}》\n${url}`);
  return (
    <div className="post-actions" data-post-actions>
      <button type="button" className="post-action" data-copy-md onClick={copyMarkdown}>
        <SiteIcon name="file-copy-line" /><span>复制</span>
        <span className="copy-tooltip" data-visible={copyFeedback || undefined} role="status" aria-live="polite">{copyFeedback}</span>
      </button>

      <div ref={menuRef} className="post-action-menu" data-open={menuOpen || undefined}>
        <button
          type="button"
          className="post-action"
          data-open-trigger
          aria-haspopup="true"
          aria-expanded={menuOpen}
          onClick={(event) => {
            event.stopPropagation();
            setMenuOpen((value) => !value);
          }}
        >
          <SiteIcon name="robot-2-line" /><span>用 AI 打开</span><SiteIcon name="arrow-down-s-line" className="post-action-caret" />
        </button>
        <div className="post-action-dropdown" hidden={!menuOpen}>
          <a className="post-action-item" href={`https://chatgpt.com/?q=${prompt}`} target="_blank" rel="noopener noreferrer" onClick={() => setMenuOpen(false)}>
            <SiteIcon name="openai-fill" /><span>ChatGPT</span><SiteIcon name="external-link-line" className="post-action-ext" />
          </a>
          <a className="post-action-item" href={`https://claude.ai/new?q=${prompt}`} target="_blank" rel="noopener noreferrer" onClick={() => setMenuOpen(false)}>
            <SiteIcon name="claude-fill" /><span>Claude</span><SiteIcon name="external-link-line" className="post-action-ext" />
          </a>
        </div>
      </div>

      <button
        type="button"
        className="post-action post-action-immersive"
        data-immersive-toggle
        aria-pressed={immersive}
        title="切换沉浸阅读（更宽的正文）"
        onClick={() => onImmersiveChange(!immersive)}
      >
        <SiteIcon name={immersive ? "fullscreen-exit-line" : "fullscreen-line"} />
        <span>{immersive ? "默认宽度" : "沉浸阅读"}</span>
      </button>
    </div>
  );
}

type MindMapNode = {
  title: string;
  depth: number;
  headingId?: string;
  children: MindMapNode[];
  lines?: string[];
  width?: number;
  height?: number;
  x?: number;
  y?: number;
};

type MindMapLayout = {
  root: MindMapNode;
  nodes: MindMapNode[];
  width: number;
  height: number;
};

function wrapMindMapText(value: string, maxUnits: number, maxLines = 3) {
  const normalized = value.replace(/\s+/g, " ").trim() || "未命名章节";
  const tokens = normalized.match(/[\u3400-\u9fff\uf900-\ufaff]|[A-Za-z0-9_$@#.+:/-]+|[^\s]/g) || [];
  const lines: string[] = [];
  let line = "";
  let units = 0;
  const measure = (token: string) => /^[\u3400-\u9fff\uf900-\ufaff]$/.test(token)
    ? 2
    : Math.max(1, Math.min(token.length, maxUnits));

  for (const token of tokens) {
    const tokenUnits = measure(token);
    const needsSpace = Boolean(line) && /^[A-Za-z0-9_$@#]/.test(token);
    const nextUnits = units + tokenUnits + (needsSpace ? 1 : 0);
    if (line && nextUnits > maxUnits) {
      lines.push(line);
      line = token;
      units = tokenUnits;
      if (lines.length === maxLines) break;
    } else {
      line += `${needsSpace ? " " : ""}${token}`;
      units = nextUnits;
    }
  }
  if (lines.length < maxLines && line) lines.push(line);
  const visibleText = lines.join("").replace(/\s+/g, "");
  const fullText = normalized.replace(/\s+/g, "");
  if (visibleText.length < fullText.length && lines.length) {
    lines[lines.length - 1] = `${lines.at(-1)?.replace(/[….]+$/, "")}…`;
  }
  return lines;
}

function buildMindMapLayout(title: string, headings: DocsHeading[], compact: boolean): MindMapLayout {
  const root: MindMapNode = { title, depth: 1, children: [] };
  const stack: MindMapNode[] = [root];
  for (const heading of headings) {
    const node: MindMapNode = {
      title: heading.text,
      depth: heading.depth,
      headingId: heading.id,
      children: [],
    };
    while (stack.length > 1 && (stack.at(-1)?.depth || 0) >= heading.depth) stack.pop();
    (stack.at(-1) || root).children.push(node);
    stack.push(node);
  }

  const nodeWidth = compact ? 176 : 208;
  const rootWidth = compact ? 192 : 224;
  const horizontalGap = compact ? 56 : 80;
  const verticalGap = 16;
  const padding = compact ? 24 : 32;
  const lineHeight = 20;
  const nodes: MindMapNode[] = [];
  let cursorY = padding;
  const snap = (value: number) => Math.round(value / 4) * 4;

  function prepare(node: MindMapNode) {
    node.width = node.depth === 1 ? rootWidth : nodeWidth;
    node.lines = wrapMindMapText(
      node.title,
      node.depth === 1 ? (compact ? 20 : 24) : compact ? 17 : 21,
    );
    node.height = snap(Math.max(48, node.lines.length * lineHeight + 24));
    node.children.forEach(prepare);
  }

  function position(node: MindMapNode) {
    node.x = padding + (node.depth - 1) * (nodeWidth + horizontalGap) + (node.depth > 1 ? rootWidth - nodeWidth : 0);
    if (node.children.length === 0) {
      node.y = cursorY;
      cursorY += (node.height || 0) + verticalGap;
    } else {
      node.children.forEach(position);
      const first = node.children[0];
      const last = node.children.at(-1) || first;
      const firstCenter = (first.y || 0) + (first.height || 0) / 2;
      const lastCenter = (last.y || 0) + (last.height || 0) / 2;
      node.y = snap(Math.max(padding, (firstCenter + lastCenter) / 2 - (node.height || 0) / 2));
    }
    nodes.push(node);
  }

  prepare(root);
  position(root);
  return {
    root,
    nodes,
    width: snap(Math.max(...nodes.map((node) => (node.x || 0) + (node.width || 0))) + padding),
    height: snap(Math.max(...nodes.map((node) => (node.y || 0) + (node.height || 0))) + padding),
  };
}

function DocsMindMap({
  open,
  title,
  headings,
  onClose,
  onJump,
}: {
  open: boolean;
  title: string;
  headings: DocsHeading[];
  onClose: () => void;
  onJump: (headingId: string) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [compact, setCompact] = useState(false);
  const [scale, setScale] = useState(1);
  const layout = useMemo(() => buildMindMapLayout(title, headings, compact), [compact, headings, title]);

  const fit = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport || !layout.width) return;
    const availableWidth = Math.max(1, viewport.clientWidth - 32);
    const minimumReadableScale = compact ? 0.78 : 0.68;
    setScale(Math.min(1, Math.max(minimumReadableScale, availableWidth / layout.width)));
    viewport.scrollTo({ left: 0, top: 0, behavior: "auto" });
  }, [compact, layout.width]);

  useEffect(() => {
    const update = () => setCompact(window.matchMedia("(max-width: 640px)").matches);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
    if (open) window.requestAnimationFrame(fit);
  }, [fit, open]);

  function applyScale(nextScale: number) {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const centerX = (viewport.scrollLeft + viewport.clientWidth / 2) / Math.max(1, viewport.scrollWidth);
    const centerY = (viewport.scrollTop + viewport.clientHeight / 2) / Math.max(1, viewport.scrollHeight);
    setScale(Math.min(1.8, Math.max(0.32, nextScale)));
    window.requestAnimationFrame(() => {
      viewport.scrollLeft = centerX * viewport.scrollWidth - viewport.clientWidth / 2;
      viewport.scrollTop = centerY * viewport.scrollHeight - viewport.clientHeight / 2;
    });
  }

  return (
    <dialog
      ref={dialogRef}
      id="reader-mindmap-dialog"
      className="reader-mindmap-dialog diagram-design"
      aria-labelledby="reader-mindmap-title"
      onClose={onClose}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="reader-mindmap-shell">
        <header className="reader-mindmap-header">
          <div className="reader-mindmap-heading">
            <span className="reader-mindmap-kicker">文章导图</span>
            <h2 id="reader-mindmap-title">{title || "思维导图"}</h2>
          </div>
          <div className="reader-mindmap-tools" aria-label="导图控制">
            <button type="button" onClick={() => applyScale(scale - 0.14)} aria-label="缩小导图" title="缩小"><DocsRiIcon name="subtract" /></button>
            <button type="button" className="reader-mindmap-fit" onClick={fit} aria-label="适应画布">适应</button>
            <button type="button" onClick={() => applyScale(scale + 0.14)} aria-label="放大导图" title="放大"><DocsRiIcon name="add" /></button>
            <button type="button" className="reader-mindmap-close" onClick={onClose} aria-label="关闭思维导图" title="关闭"><DocsRiIcon name="close" /></button>
          </div>
        </header>
        <div className="reader-mindmap-viewport" ref={viewportRef}>
          <svg
            className="reader-mindmap-canvas"
            data-motion-mode="none"
            role="img"
            aria-labelledby="reader-mindmap-svg-title reader-mindmap-svg-desc"
            viewBox={`0 0 ${layout.width} ${layout.height}`}
            style={{ width: Math.round(layout.width * scale), height: Math.round(layout.height * scale) }}
          >
            <title id="reader-mindmap-svg-title">{layout.root.title}文章结构图</title>
            <desc id="reader-mindmap-svg-desc">以文章标题为根节点，展示二级至四级章节的层级关系；章节节点可用于跳转。</desc>
            <g aria-hidden="true">
              {layout.nodes.flatMap((parent) => parent.children.map((child) => {
                const startX = (parent.x || 0) + (parent.width || 0);
                const startY = (parent.y || 0) + (parent.height || 0) / 2;
                const endX = child.x || 0;
                const endY = (child.y || 0) + (child.height || 0) / 2;
                const bendX = Math.round((startX + (endX - startX) / 2) / 4) * 4;
                const radius = 8;
                const direction = endY >= startY ? 1 : -1;
                const d = Math.abs(endY - startY) < radius * 2
                  ? `M ${startX} ${startY} H ${endX}`
                  : `M ${startX} ${startY} H ${bendX - radius} Q ${bendX} ${startY} ${bendX} ${startY + direction * radius} V ${endY - direction * radius} Q ${bendX} ${endY} ${bendX + radius} ${endY} H ${endX}`;
                return <path className="reader-mindmap-edge" d={d} key={`${parent.title}:${child.title}:${endY}`} />;
              }))}
            </g>
            {layout.nodes.map((node, nodeIndex) => {
              const textX = node.depth === 1 ? 16 : 12;
              const lineHeight = 20;
              const startY = ((node.height || 0) - (node.lines?.length || 0) * lineHeight) / 2 + lineHeight * 0.76;
              const jump = () => {
                if (node.headingId) onJump(node.headingId);
              };
              return (
                <g
                  className="reader-mindmap-node"
                  transform={`translate(${node.x} ${node.y})`}
                  data-root={String(node.depth === 1)}
                  data-leaf={String(node.children.length === 0)}
                  data-mindmap-heading={node.headingId}
                  role={node.headingId ? "link" : undefined}
                  tabIndex={node.headingId ? 0 : undefined}
                  aria-hidden={node.headingId ? undefined : true}
                  aria-label={node.headingId ? `跳转到：${node.title}` : undefined}
                  onClick={jump}
                  onKeyDown={(event) => {
                    if (node.headingId && (event.key === "Enter" || event.key === " ")) {
                      event.preventDefault();
                      jump();
                    }
                  }}
                  key={`${node.headingId || "root"}:${nodeIndex}`}
                >
                  <rect width={node.width} height={node.height} rx="6" />
                  <text>
                    {node.lines?.map((line, lineIndex) => (
                      <tspan x={textX} y={startY + lineIndex * lineHeight} key={`${line}:${lineIndex}`}>{line}</tspan>
                    ))}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
        <p className="reader-mindmap-hint">点击节点即可跳转到对应章节，放大后可滚动查看。</p>
      </section>
    </dialog>
  );
}

function PanelSkeleton({ side }: { side: "course" | "toc" }) {
  const count = side === "course" ? 12 : 8;
  return (
    <aside className={`reader-panel-skeleton reader-panel-skeleton-${side}`} aria-hidden="true">
      <span className="reader-panel-skeleton-heading" />
      {Array.from({ length: count }, (_, index) => <span key={index} />)}
      <div className="reader-panel-skeleton-fill" />
    </aside>
  );
}

export function DocsReader({ sourceId, path, courseId }: { sourceId?: string; path?: string; courseId?: string }) {
  const articleRootRef = useRef<HTMLElement>(null);
  const requestRef = useRef<AbortController | null>(null);
  const loadSequenceRef = useRef(0);
  const [catalog, setCatalog] = useState<DocsCatalog | null>(null);
  const [located, setLocated] = useState<LocatedDocsArticle | null>(null);
  const [markdown, setMarkdown] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [courseOpen, setCourseOpen] = useState(false);
  const [tocOpen, setTocOpen] = useState(false);
  const [mindMapOpen, setMindMapOpen] = useState(false);
  const [activeHeading, setActiveHeading] = useState("");
  const [immersive, setImmersive] = useState(false);

  const headings = useMemo(() => extractDocsHeadings(markdown), [markdown]);
  const headingByLine = useMemo(() => new Map(headings.map((heading) => [heading.line, heading])), [headings]);
  const articleTitle = located ? `${located.article.sequence} ${located.article.displayTitle}` : "";

  const loadLocation = useCallback(async (
    nextPath: string,
    nextSourceId: string,
    nextCourseId?: string,
    historyMode: HistoryMode = "none",
    initial = false,
  ) => {
    const sequence = ++loadSequenceRef.current;
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setLoading(true);
    setError("");
    setMindMapOpen(false);

    try {
      const nextCatalog = await fetchDocsCatalog();
      if (sequence !== loadSequenceRef.current) return;
      const nextLocated = findDocsArticle(nextCatalog, nextPath, nextSourceId, nextCourseId);
      if (!nextLocated) throw new Error("没有在当前内容快照中找到这篇文档。");
      const source = await fetchMarkdown(nextLocated.source, nextLocated.article.path, controller.signal);
      if (sequence !== loadSequenceRef.current) return;
      const content = normalizeDocsMarkdown(source);

      setCatalog(nextCatalog);
      setLocated(nextLocated);
      setMarkdown(content);
      setCourseOpen(false);
      setTocOpen(false);
      setActiveHeading("");

      const href = docsReaderUrl(nextLocated.article.path, nextLocated.source.id, nextLocated.course.id);
      if (historyMode === "push") window.history.pushState({}, "", href);
      if (historyMode === "replace") window.history.replaceState(window.history.state, "", href);
      rememberDocsLocation(nextLocated.article.path, nextLocated.source.id, nextLocated.course.id);
      const nextTitle = `${nextLocated.article.sequence} ${nextLocated.article.displayTitle}`;
      document.title = `${nextTitle} - Joruno`;
      document.querySelector('meta[name="description"]')?.setAttribute("content", `${nextLocated.course.name}：${nextTitle}`);

      if (!initial) {
        window.requestAnimationFrame(() => {
          const breadcrumb = document.querySelector<HTMLElement>(".reader-breadcrumb");
          const top = breadcrumb ? breadcrumb.getBoundingClientRect().top + window.scrollY - 80 : 0;
          window.scrollTo({ top: Math.max(0, top), behavior: "auto" });
          if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            articleRootRef.current?.animate(
              [{ opacity: 0.55, transform: "translateY(6px)" }, { opacity: 1, transform: "translateY(0)" }],
              { duration: 180, easing: "cubic-bezier(0.23, 1, 0.32, 1)" },
            );
          }
        });
      }

      const previous = nextLocated.course.articles[nextLocated.index - 1];
      const next = nextLocated.course.articles[nextLocated.index + 1];
      for (const neighbor of [previous, next]) {
        if (neighbor) void fetchMarkdown(nextLocated.source, neighbor.path).catch(() => undefined);
      }
    } catch (loadError) {
      if (sequence === loadSequenceRef.current && (loadError as Error).name !== "AbortError") {
        setError((loadError as Error).message || "文档加载失败，请稍后重试。");
      }
    } finally {
      if (sequence === loadSequenceRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let nextPath = path;
    let nextSourceId = sourceId || "geektime";
    let nextCourseId = courseId;
    if (!nextPath) {
      try {
        nextPath = sessionStorage.getItem("geektime:last-article-path") || undefined;
        nextSourceId = sessionStorage.getItem("geektime:last-source-id") || "geektime";
        nextCourseId = sessionStorage.getItem("geektime:last-course-id") || undefined;
      } catch {
        // Fall through to the library when storage is unavailable.
      }
    }
    if (!nextPath) {
      window.location.replace("/docs/");
      return;
    }
    void loadLocation(nextPath, nextSourceId, nextCourseId, "replace", true);
    return () => requestRef.current?.abort();
  }, [courseId, loadLocation, path, sourceId]);

  useEffect(() => {
    function onPopState() {
      const url = new URL(window.location.href);
      const nextPath = url.searchParams.get("path");
      if (!nextPath) return;
      void loadLocation(
        nextPath,
        url.searchParams.get("source") || "geektime",
        url.searchParams.get("course") || undefined,
        "none",
      );
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [loadLocation]);

  useEffect(() => {
    if (!located) return;
    const active = document.querySelector<HTMLAnchorElement>('.reader-course-link[aria-current="page"]');
    window.requestAnimationFrame(() => active?.scrollIntoView({ block: "nearest" }));
  }, [located]);

  useEffect(() => {
    if (!headings.length || !articleRootRef.current) return;
    const elements = Array.from(articleRootRef.current.querySelectorAll<HTMLElement>("h2, h3, h4"));
    setActiveHeading(elements[0]?.id || "");
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.find((entry) => entry.isIntersecting);
      if (visible?.target instanceof HTMLElement) setActiveHeading(visible.target.id);
    }, { rootMargin: "-12% 0px -72% 0px" });
    elements.forEach((heading) => observer.observe(heading));
    return () => observer.disconnect();
  }, [headings, markdown]);

  const articleLookup = useMemo(() => {
    const lookup = new Map<string, { article: DocsArticle; sourceId: string; courseId: string }>();
    for (const category of catalog?.categories ?? []) {
      for (const course of category.courses) {
        for (const article of course.articles) {
          lookup.set(`${course.sourceId || "geektime"}:${article.path}`, {
            article,
            sourceId: course.sourceId || "geektime",
            courseId: course.id,
          });
        }
      }
    }
    return lookup;
  }, [catalog]);

  const previous = located && located.index > 0 ? located.course.articles[located.index - 1] : null;
  const next = located && located.index < located.course.articles.length - 1 ? located.course.articles[located.index + 1] : null;

  const navigateArticle = useCallback((event: ReactMouseEvent<HTMLAnchorElement>, article: DocsArticle, targetSourceId?: string, targetCourseId?: string) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (!located && (!targetSourceId || !targetCourseId)) return;
    void loadLocation(
      article.path,
      targetSourceId || located?.source.id || "geektime",
      targetCourseId || located?.course.id,
      "push",
    );
  }, [loadLocation, located]);

  const jumpToHeading = useCallback((headingId: string) => {
    setMindMapOpen(false);
    setTocOpen(false);
    window.requestAnimationFrame(() => {
      // Closing either React-controlled panel can replace the Markdown
      // subtree; resolve the heading after that commit instead of retaining a
      // detached element whose client rect collapses to zero.
      const heading = articleRootRef.current?.querySelector<HTMLElement>(`#${CSS.escape(headingId)}`);
      if (!heading) return;
      const top = heading.getBoundingClientRect().top + window.scrollY - 88;
      window.scrollTo({
        top: Math.max(0, top),
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      });
      const url = new URL(window.location.href);
      url.hash = encodeURIComponent(headingId);
      window.history.pushState(window.history.state, "", url);
      setActiveHeading(headingId);
    });
  }, []);

  const ReaderHeading = useCallback(function ReaderHeading({
    level,
    children,
    node,
  }: {
    level: 2 | 3 | 4 | 5 | 6;
    children?: ReactNode;
    node?: { position?: { start?: { line?: number } } };
  }) {
    const text = nodeText(children);
    const planned = headingByLine.get(node?.position?.start?.line || -1);
    const id = planned?.id || docsHeadingId(text);
    const Tag = `h${level}` as "h2";
    return <Tag id={id}>{children}</Tag>;
  }, [headingByLine]);

  const MarkdownLink = useCallback(function MarkdownLink({ href = "", children, ...props }: ComponentPropsWithoutRef<"a">) {
    if (!located || /^(?:[a-z]+:)?\/\//i.test(href) || href.startsWith("mailto:")) {
      return <a href={href} target="_blank" rel="noopener noreferrer" {...props}>{children}</a>;
    }
    if (href.startsWith("#")) {
      const headingId = decodeURIComponent(href.slice(1));
      return <a href={`#${encodeURIComponent(headingId)}`} onClick={(event) => { event.preventDefault(); jumpToHeading(headingId); }} {...props}>{children}</a>;
    }

    const [rawPath] = href.split("#");
    const resolved = resolveDocsPath(located.article.path, rawPath);
    const target = articleLookup.get(`${located.source.id}:${resolved}`);
    if (target) {
      return (
        <a href={docsReaderUrl(resolved, target.sourceId, target.courseId)} onClick={(event) => navigateArticle(event, target.article, target.sourceId, target.courseId)} {...props}>
          {children}
        </a>
      );
    }
    return <a href={docsRawUrl(located.source, resolved)} target="_blank" rel="noopener noreferrer" {...props}>{children}</a>;
  }, [articleLookup, jumpToHeading, located, navigateArticle]);

  const MarkdownImage = useCallback(function MarkdownImage({ src = "", alt = "", ...props }: ComponentPropsWithoutRef<"img">) {
    if (!located || typeof src !== "string") return null;
    const url = /^(?:[a-z]+:)?\/\//i.test(src) || src.startsWith("data:")
      ? src
      : docsRawUrl(located.source, resolveDocsPath(located.article.path, src));
    // Source repositories own these immutable, commit-pinned course assets.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={alt} loading="lazy" decoding="async" referrerPolicy="no-referrer" {...props} />;
  }, [located]);

  const initialLoading = loading && !located;
  const displayError = Boolean(error);

  return (
    <section
      className="geektime-reader docs-reader-shell"
      data-catalog-url="/docs/catalog.json?v=5"
      data-loading={initialLoading ? "" : undefined}
      aria-busy={initialLoading || undefined}
    >
      <div className="reader-layout">
        <PanelSkeleton side="course" />

        <aside
          id="reader-course-panel"
          className="reader-course-panel"
          data-reader-panel-ready={located ? "true" : undefined}
          data-reader-panel-open={courseOpen ? "" : undefined}
          hidden={!located}
        >
          <div className="reader-aside-heading">
            <SiteIcon name="book-open-line" />
            <a href={located ? `/docs/#${located.category.id}` : "/docs/"}>{located?.course.name || "本课程"}</a>
            <span data-course-count>{located ? `${located.course.articles.length} 篇` : ""}</span>
          </div>
          <ol className="reader-course-list" data-course-id={located ? `${located.source.id}:${located.course.id}` : undefined}>
            {located?.course.articles.map((article) => (
              <li className="reader-course-item" key={article.path}>
                <a
                  className="reader-course-link"
                  href={docsReaderUrl(article.path, located.source.id, located.course.id)}
                  data-article-path={article.path}
                  aria-current={article.path === located.article.path ? "page" : undefined}
                  onClick={(event) => navigateArticle(event, article)}
                  onPointerEnter={() => { void fetchMarkdown(located.source, article.path).catch(() => undefined); }}
                >
                  <span className="reader-course-index">{article.sequence}</span>
                  <span>{article.displayTitle}</span>
                </a>
              </li>
            ))}
          </ol>
        </aside>

        <div className="reader-main" data-switching={loading && located ? "" : undefined} aria-busy={loading && located ? true : undefined}>
          <div className="reader-breadcrumb-skeleton" aria-hidden="true"><span /><span /><span /></div>
          <nav className="reader-breadcrumb" aria-label="面包屑">
            <Link href="/docs/" prefetch={false} onClick={reloadDocsIndex}>Docs</Link>
            <span aria-hidden="true" hidden={!located && !displayError}>/</span>
            <a href={located ? `/docs/#${located.category.id}` : "/docs/"}>
              {displayError ? "加载失败" : located?.course.name || <span className="sr-only">课程</span>}
            </a>
          </nav>

          <header className="reader-header">
            <div className="reader-header-skeleton" aria-hidden="true">
              <span className="reader-header-skeleton-title" />
              <span className="reader-header-skeleton-title reader-header-skeleton-title-short" />
              <span className="reader-header-skeleton-actions" />
            </div>
            <div className="reader-header-content">
              <h1>{displayError ? "文档暂时无法打开" : articleTitle || <span className="sr-only">正在加载文档</span>}</h1>
              <div className="reader-actions" hidden={!located || displayError}>
                {located ? (
                  <DocsArticleActions
                    markdown={markdown}
                    url={docsReaderUrl(located.article.path, located.source.id, located.course.id)}
                    title={articleTitle}
                    immersive={immersive}
                    onImmersiveChange={setImmersive}
                  />
                ) : null}
                <button
                  type="button"
                  className="reader-mindmap-trigger"
                  aria-haspopup="dialog"
                  aria-controls="reader-mindmap-dialog"
                  onClick={() => setMindMapOpen(true)}
                >
                  <DocsRiIcon name="nodeTree" /><span>思维导图</span>
                </button>
              </div>
            </div>
          </header>

          {initialLoading ? (
            <div className="reader-state" aria-live="polite">
              <span className="sr-only">正在从内容快照加载正文</span>
              <div className="reader-skeleton" aria-hidden="true">
                {Array.from({ length: 18 }, (_, index) => <span className={index === 3 || index === 13 ? "reader-skeleton-media" : undefined} key={index} />)}
              </div>
            </div>
          ) : null}

          {displayError ? (
            <div className="reader-state is-error" role="alert">
              <span>{error}</span>
              <div className="reader-error-actions">
                <button type="button" className="reader-error-back reader-error-retry" onClick={() => window.location.reload()}>重新加载</button>
                <Link className="reader-error-back" href="/docs/" prefetch={false} onClick={reloadDocsIndex}>返回 Docs</Link>
              </div>
            </div>
          ) : null}

          {located && !displayError ? (
            <>
              <article ref={articleRootRef} className="prose reader-content">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkMath]}
                  rehypePlugins={[
                    rehypeRaw,
                    [rehypeSanitize, docsMarkdownSanitizeSchema],
                    rehypeKatex,
                  ]}
                  components={{
                    a: MarkdownLink,
                    img: MarkdownImage,
                    h2: ({ children, node }) => <ReaderHeading level={2} node={node}>{children}</ReaderHeading>,
                    h3: ({ children, node }) => <ReaderHeading level={3} node={node}>{children}</ReaderHeading>,
                    h4: ({ children, node }) => <ReaderHeading level={4} node={node}>{children}</ReaderHeading>,
                    h5: ({ children, node }) => <ReaderHeading level={5} node={node}>{children}</ReaderHeading>,
                    h6: ({ children, node }) => <ReaderHeading level={6} node={node}>{children}</ReaderHeading>,
                    pre: ({ children }) => <CodeBlock>{children}</CodeBlock>,
                  }}
                >{markdown}</ReactMarkdown>
              </article>

              <nav className="reader-neighbors" aria-label="章节导航">
                {previous ? (
                  <a data-previous href={docsReaderUrl(previous.path, located.source.id, located.course.id)} data-article-path={previous.path} onClick={(event) => navigateArticle(event, previous)}>
                    <span>上一篇</span>
                    <strong>{previous.sequence} {previous.displayTitle}</strong>
                  </a>
                ) : (
                  <Link className="reader-neighbor-hidden" data-previous href="/docs/" prefetch={false} aria-hidden="true" tabIndex={-1}>
                    <span>上一篇</span>
                    <strong />
                  </Link>
                )}
                {next ? (
                  <a data-next href={docsReaderUrl(next.path, located.source.id, located.course.id)} data-article-path={next.path} onClick={(event) => navigateArticle(event, next)}>
                    <span>下一篇</span>
                    <strong>{next.sequence} {next.displayTitle}</strong>
                  </a>
                ) : (
                  <Link className="reader-neighbor-hidden" data-next href="/docs/" prefetch={false} aria-hidden="true" tabIndex={-1}>
                    <span>下一篇</span>
                    <strong />
                  </Link>
                )}
              </nav>
            </>
          ) : null}
        </div>

        <aside
          id="reader-toc-panel"
          className="reader-toc-panel"
          data-reader-panel-ready={headings.length ? "true" : undefined}
          data-reader-panel-open={tocOpen ? "" : undefined}
          hidden={!headings.length}
        >
          <div className="reader-aside-heading"><DocsRiIcon name="menu" /><span>本页目录</span></div>
          <nav className="reader-toc-list" aria-label="本页目录">
            {headings.map((heading) => (
              <a
                className="reader-toc-link"
                data-depth={heading.depth}
                data-heading-id={heading.id}
                href={`#${encodeURIComponent(heading.id)}`}
                aria-current={activeHeading === heading.id ? "true" : undefined}
                onClick={(event) => { event.preventDefault(); jumpToHeading(heading.id); }}
                key={`${heading.id}:${heading.line}`}
              >{heading.text}</a>
            ))}
          </nav>
        </aside>

        <PanelSkeleton side="toc" />
      </div>

      <div className="reader-floating-controls" aria-label="阅读面板">
        <button
          type="button"
          className="reader-panel-toggle reader-course-toggle"
          aria-label={`${courseOpen ? "关闭" : "打开"}课程目录`}
          aria-controls="reader-course-panel"
          aria-expanded={courseOpen}
          onClick={() => {
            setImmersive(false);
            setTocOpen(false);
            setCourseOpen((value) => !value);
          }}
        >
          <span className="reader-toggle-icon-collapsed"><PanelLeftOpen aria-hidden="true" /></span>
          <span className="reader-toggle-icon-expanded"><PanelLeftClose aria-hidden="true" /></span>
        </button>
        <button
          type="button"
          className="reader-panel-toggle reader-toc-toggle"
          aria-label={`${tocOpen ? "关闭" : "打开"}本页目录`}
          aria-controls="reader-toc-panel"
          aria-expanded={tocOpen}
          onClick={() => {
            setImmersive(false);
            setCourseOpen(false);
            setTocOpen((value) => !value);
          }}
        >
          <span className="reader-toggle-icon-collapsed"><PanelRightOpen aria-hidden="true" /></span>
          <span className="reader-toggle-icon-expanded"><PanelRightClose aria-hidden="true" /></span>
        </button>
      </div>

      {located ? (
        <DocsMindMap
          open={mindMapOpen}
          title={articleTitle}
          headings={headings}
          onClose={() => setMindMapOpen(false)}
          onJump={jumpToHeading}
        />
      ) : null}
    </section>
  );
}
