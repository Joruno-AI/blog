import Link from "next/link";
import {
  CheckCircle2,
  CircleDollarSign,
  CloudSun,
  Code2,
  Compass,
  GalleryHorizontalEnd,
  Globe2,
  Images,
  Languages,
  Map as MapIcon,
  NotebookText,
  Package,
  PaintBucket,
  Puzzle,
  QrCode,
  Shirt,
  Sparkles,
  SquareStack,
  TerminalSquare,
  Waves,
  Webhook,
} from "lucide-react";

import type { PublishedResource } from "@/modules/resources/infrastructure/resource-repository";

type ProjectMetadata = {
  externalUrl?: string;
  icon?: string;
  category?: string;
  order?: number;
};

const iconByName = {
  "i-ph-dress-duotone": Shirt,
  "i-ph-translate-duotone": Languages,
  "i-ph-map-trifold-duotone": MapIcon,
  "i-ph-squares-four-duotone": SquareStack,
  "i-ph-compass-rose-duotone": Compass,
  "i-ph-qr-code-duotone": QrCode,
  "i-ph-notebook-duotone": NotebookText,
  "i-ph-sparkle-duotone": Sparkles,
  "i-ph-puzzle-piece-duotone": Puzzle,
  "i-ph-images-duotone": Images,
  "i-ph-check-circle-duotone": CheckCircle2,
  "i-skill-icons-vscode-dark": Code2,
  "i-ph-rainbow-cloud-duotone": CloudSun,
  "i-ph-code-block-duotone": Code2,
  "i-ph-package-duotone": Package,
  "i-ph-paint-bucket-duotone": PaintBucket,
  "i-ph-webhooks-logo-duotone": Webhook,
  "i-ph-globe-hemisphere-east-duotone": Globe2,
  "i-ph-terminal-window-duotone": TerminalSquare,
  "i-ph-waveform-duotone": Waves,
  "i-ph-coins-duotone": CircleDollarSign,
} as const;

function metadata(resource: PublishedResource): ProjectMetadata {
  try {
    const parsed: unknown = JSON.parse(resource.metadataJson);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as ProjectMetadata)
      : {};
  } catch {
    return {};
  }
}

function anchor(category: string, index: number) {
  const value = category
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-|-$/g, "");
  return `project-${value || index + 1}`;
}

function linkKind(url: string) {
  try {
    return new URL(url).hostname === "github.com" ? "GitHub" : "网站";
  } catch {
    return "链接";
  }
}

export function ProjectDirectory({ resources }: { resources: PublishedResource[] }) {
  if (resources.length === 0) {
    return <div className="site-empty">No content available for display.</div>;
  }

  const groups = new Map<string, Array<{ resource: PublishedResource; meta: ProjectMetadata }>>();
  resources
    .map((resource) => ({ resource, meta: metadata(resource) }))
    .sort((a, b) => (a.meta.order ?? Number.MAX_SAFE_INTEGER) - (b.meta.order ?? Number.MAX_SAFE_INTEGER))
    .forEach((item) => {
      const category = item.meta.category?.trim() || "其他";
      groups.set(category, [...(groups.get(category) ?? []), item]);
    });
  const sections = [...groups.entries()];

  return (
    <div className="project-directory-layout has-anchor-nav">
      <nav className="project-anchor-nav" aria-label="项目分类">
        <p>目录</p>
        {sections.map(([category], index) => (
          <a href={`#${anchor(category, index)}`} key={category}>{category}</a>
        ))}
      </nav>
      <div className="project-directory-groups">
        {sections.map(([category, items], sectionIndex) => (
          <section className="project-group" key={category}>
            <h2 id={anchor(category, sectionIndex)}>{category}</h2>
            <div className="project-items-grid">
              {items.map(({ resource, meta }, index) => {
                const href = meta.externalUrl || resource.path;
                const Icon = iconByName[meta.icon as keyof typeof iconByName] ?? GalleryHorizontalEnd;
                const external = /^https?:\/\//.test(href);
                return (
                  <Link
                    className="project-item-link"
                    href={href}
                    key={resource.id}
                    target={external ? "_blank" : undefined}
                    rel={external ? "noreferrer" : undefined}
                    title={`${resource.title} - ${resource.description ?? ""}`}
                  >
                    <Icon className={`project-item-icon project-item-icon--${index % 3}`} aria-hidden="true" />
                    <span className="project-item-body">
                      <span className="project-item-head">
                        <strong className="project-item-title">{resource.title}</strong>
                        <small className="project-item-kind">{linkKind(href)}</small>
                      </span>
                      <span className="project-item-desc">{resource.description}</span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
