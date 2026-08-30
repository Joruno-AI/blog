import type { CSSProperties } from "react";

export type SiteIconName =
  | "home-4-line"
  | "article-line"
  | "book-open-line"
  | "code-box-line"
  | "shapes-line"
  | "camera-ai-line"
  | "sticky-note-line"
  | "disc-line"
  | "github-alt"
  | "search"
  | "sun-line"
  | "moon-line"
  | "rss"
  | "menu-line"
  | "close-line"
  | "arrow-up-line"
  | "command-line"
  | "arrow-upward"
  | "arrow-downward"
  | "return"
  | "arrow-cool-down"
  | "expand-all"
  | "price-tag-3-line"
  | "arrow-left-line"
  | "arrow-right-line"
  | "menu-2-fill"
  | "file-copy-line"
  | "robot-2-line"
  | "arrow-down-s-line"
  | "openai-fill"
  | "claude-fill"
  | "external-link-line"
  | "fullscreen-line"
  | "fullscreen-exit-line";

export function SiteIcon({ name, className }: { name: SiteIconName; className?: string }) {
  const iconUrl = `url(/icons/${name}.svg)`;
  return (
    <span
      aria-hidden="true"
      className={["site-icon", className].filter(Boolean).join(" ")}
      style={{ "--site-icon": iconUrl } as CSSProperties}
    />
  );
}
