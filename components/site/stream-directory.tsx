import Link from "next/link";
import { ArrowRight, Radio, Video } from "lucide-react";

import type { PublishedResource } from "@/modules/resources/infrastructure/resource-repository";

type StreamMetadata = {
  externalUrl?: string;
  radio?: boolean;
  video?: boolean;
  platform?: string;
};

const dateFormatter = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function metadata(resource: PublishedResource): StreamMetadata {
  try {
    const value: unknown = JSON.parse(resource.metadataJson);
    return value && typeof value === "object" && !Array.isArray(value) ? value as StreamMetadata : {};
  } catch {
    return {};
  }
}

export function StreamDirectory({ resources }: { resources: PublishedResource[] }) {
  if (resources.length === 0) return <div className="legacy-empty">nothing here yet</div>;
  const groups = new Map<number, PublishedResource[]>();
  resources.forEach((resource) => {
    const year = resource.publishedAt?.getFullYear() ?? 0;
    groups.set(year, [...(groups.get(year) ?? []), resource]);
  });
  const sections = [...groups.entries()].sort(([a], [b]) => b - a);

  return (
    <div className="stream-directory-layout">
      <nav className="stream-year-nav" aria-label="年份目录">
        {sections.map(([year]) => <a href={`#streams-${year}`} key={year}>{year || "其他"}</a>)}
      </nav>
      <div className="stream-list" aria-label="Stream list">
        {sections.map(([year, items]) => (
          <section className="stream-year" key={year}>
            <h2 id={`streams-${year}`}>{year || "其他"}</h2>
            {items.map((resource) => {
              const meta = metadata(resource);
              const href = meta.externalUrl || resource.path;
              return (
                <Link className="stream-item" href={href} key={resource.id} target="_blank" rel="noreferrer">
                  <span className="stream-item__title">{resource.title}</span>
                  <span className="stream-item__meta">
                    {meta.video ? <Video aria-label="Provided in video" /> : null}
                    {meta.radio ? <Radio aria-label="Provided in radio" /> : null}
                    {resource.publishedAt ? <time dateTime={resource.publishedAt.toISOString()}>{dateFormatter.format(resource.publishedAt)}</time> : null}
                    {meta.platform ? <span>· {meta.platform}</span> : null}
                    <ArrowRight aria-hidden="true" />
                  </span>
                </Link>
              );
            })}
          </section>
        ))}
      </div>
    </div>
  );
}
