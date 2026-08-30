export type AgentRepositoryFileReference = {
  path: string;
  line: number;
  column: number;
};

const INLINE_FILE_PATTERN = /^((?:\.{0,2}\/)?[\w@.+ -]+(?:\/[\w@.+ -]+)*\.(?:astro|c|cc|cpp|cs|css|go|graphql|gql|h|hpp|html|java|js|jsx|json|jsonc|kt|kts|md|mdx|mjs|php|py|rb|rs|scss|sh|sql|svelte|swift|toml|ts|tsx|txt|vue|xml|ya?ml))(?:(?:#L(\d+)(?:C(\d+))?(?:-L?\d+(?:C\d+)?)?)|(?::(\d+)(?::(\d+))?(?:-\d+)?))?$/i;

export function safeAgentDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function encodeAgentRepositoryPath(path: string) {
  return path
    .split("/")
    .filter(Boolean)
    .map((part) => encodeURIComponent(safeAgentDecode(part)))
    .join("/");
}

export function resolveAgentRepositoryPath(value: string, sourcePath = "") {
  const clean = value.trim().split(/[?#]/)[0] ?? "";
  if (!clean || /^[a-z][a-z\d+.-]*:/i.test(clean) || clean.startsWith("//")) return "";
  const sourceDirectory = sourcePath.includes("/") ? sourcePath.slice(0, sourcePath.lastIndexOf("/") + 1) : "";
  try {
    return new URL(clean, `https://local/${sourceDirectory}`).pathname
      .split("/")
      .filter(Boolean)
      .map(safeAgentDecode)
      .join("/");
  } catch {
    return "";
  }
}

export function agentRepositoryImageCandidates(raw: string, repo: string, refName: string, sourcePath = "") {
  if (/^data:image\/(?:avif|gif|jpe?g|png|svg\+xml|webp);/i.test(raw)) return [raw];
  try {
    const url = new URL(raw);
    const githubAsset = url.pathname.match(/^\/([^/]+)\/([^/]+)\/(?:blob|raw)\/(?:refs\/heads\/)?([^/]+)\/(.+)$/i);
    if (url.hostname === "github.com" && githubAsset) {
      const [, owner = "", name = "", ref = "", path = ""] = githubAsset;
      const encodedPath = encodeAgentRepositoryPath(path);
      return [
        `https://raw.githubusercontent.com/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/${encodeURIComponent(ref)}/${encodedPath}`,
        `https://cdn.jsdelivr.net/gh/${encodeURIComponent(owner)}/${encodeURIComponent(name)}@${encodeURIComponent(ref)}/${encodedPath}`,
      ];
    }
    const rawAsset = url.pathname.match(/^\/([^/]+)\/([^/]+)\/(?:refs\/heads\/)?([^/]+)\/(.+)$/i);
    if (url.hostname === "raw.githubusercontent.com" && rawAsset) {
      const [, owner = "", name = "", ref = "", path = ""] = rawAsset;
      return [
        url.href,
        `https://cdn.jsdelivr.net/gh/${encodeURIComponent(owner)}/${encodeURIComponent(name)}@${encodeURIComponent(ref)}/${encodeAgentRepositoryPath(path)}`,
      ];
    }
    return /^https?:$/.test(url.protocol) ? [url.href] : [];
  } catch {
    const path = resolveAgentRepositoryPath(raw, sourcePath);
    if (!path) return [];
    const encodedPath = encodeAgentRepositoryPath(path);
    return [
      `https://raw.githubusercontent.com/${repo}/${encodeURIComponent(refName)}/${encodedPath}`,
      `https://cdn.jsdelivr.net/gh/${repo}@${encodeURIComponent(refName)}/${encodedPath}`,
    ];
  }
}

export function parseAgentInlineFileReference(value: string, sourcePath = ""): AgentRepositoryFileReference | null {
  const match = value.trim().match(INLINE_FILE_PATTERN);
  if (!match?.[1]) return null;
  const path = resolveAgentRepositoryPath(match[1], sourcePath);
  return path ? {
    path,
    line: Number(match[2] || match[4] || 0),
    column: Number(match[3] || match[5] || 0),
  } : null;
}

export function normalizeAgentMarkdown(markdown: string) {
  let insideFence = false;
  const repairEmphasis = (value: string) => value
    .split(/(`+[^`\n]*`+)/g)
    .map((segment) => {
      if (segment.startsWith("`")) return segment;
      const markerBoundary = "(?=\\s|[，。！？、,.;:：；!?）)\\]】]|$)";
      return segment
        .replace(new RegExp(`\\*\\*([^*\\n]+?)\\*${markerBoundary}`, "g"), "**$1**")
        .replace(new RegExp(`(^|[\\s([{（【])\\*([^*\\n]+?)\\*\\*${markerBoundary}`, "g"), "$1**$2**");
    })
    .join("");

  const linksFixed = markdown
    .replace(/^# Page:\s*.+\n+/i, "")
    .replace(/\[([^\]\n]+)\]\(([^)\n]+)\)/g, (match, label: string, target: string) =>
      /\s/.test(target) ? `[${label}](${target.replace(/\s/g, "%20")})` : match,
    );

  return linksFixed
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => {
      if (/^\s*(?:```|~~~)/.test(line)) {
        insideFence = !insideFence;
        return line;
      }
      if (insideFence) return line;
      let normalized = repairEmphasis(line.replace(/^(\s*[-+*])(?=\S)/, "$1 "));
      const strongMarkers = normalized.match(/\*\*/g)?.length || 0;
      if (strongMarkers % 2 === 1) {
        normalized = normalized.replace(/^(\s*(?:[-+*]|\d+[.)])\s+)\*\*([^*\n]+?)(\s*[—–:：]\s*)/, "$1**$2**$3");
      }
      return normalized;
    })
    .join("\n");
}

export function normalizeAgentMermaidSource(source: string) {
  let normalized = source
    .replace(/\r\n?/g, "\n")
    .replace(/^(\s*)\[([A-Za-z_][\w.-]*)\]\s*--\s*"([^"\n]+)"\s*$/gm, "$1$2[\"$3\"]")
    .replace(/(^|[ \t])\[([A-Za-z_][\w.-]*)\](?=[ \t]*(?:--|-.->|==>|~~~))/gm, "$1$2")
    .replace(/((?:-->|---|-.->|==>|~~~)(?:\|[^|\n]*\|)?[ \t]*)\[([A-Za-z_][\w.-]*)\]/g, "$1$2");

  const identifiers = new Map<string, string>();
  let sequence = 0;
  const resolveIdentifier = (label: string) => {
    const existing = identifiers.get(label);
    if (existing) return existing;
    const identifier = `node_${sequence++}`;
    identifiers.set(label, identifier);
    return identifier;
  };
  normalized = normalized.replace(/(^|[ \t>])\[\s*"([^"\n]+)"\s*\]/gm, (_, prefix: string, label: string) => `${prefix}${resolveIdentifier(label)}[\"${label}\"]`);
  normalized = normalized.replace(/"([^"\n]+)"(?=[ \t]*(?:\[|\(|\{))/g, (_, label: string) => resolveIdentifier(label));
  for (const [label, identifier] of identifiers) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    normalized = normalized
      .replace(new RegExp(`"${escaped}"(?=[ \\t]*(?:-->|---|-.->|==>|~~~))`, "g"), identifier)
      .replace(new RegExp(`((?:-->|---|-.->|==>|~~~)(?:\\|[^|]*\\|)?[ \\t]*)"${escaped}"`, "g"), `$1${identifier}`);
  }
  return normalized;
}
