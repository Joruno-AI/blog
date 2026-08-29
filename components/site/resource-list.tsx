import Link from "next/link";
import { ArrowRight } from "lucide-react";

import type { PublishedResource } from "@/modules/resources/infrastructure/resource-repository";

const dateFormatter = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function ResourceList({
  resources,
  emptyMessage = "这里还没有公开内容。",
}: {
  resources: PublishedResource[];
  emptyMessage?: string;
}) {
  if (resources.length === 0) {
    return <div className="site-empty">{emptyMessage}</div>;
  }

  return (
    <div className="resource-list">
      {resources.map((resource, index) => (
        <article className="resource-row" key={resource.id}>
          <span className="resource-row__index" aria-hidden="true">
            {String(index + 1).padStart(2, "0")}
          </span>
          <div className="resource-row__body">
            <div className="resource-row__meta">
              <time dateTime={resource.publishedAt?.toISOString()}>
                {resource.publishedAt
                  ? dateFormatter.format(resource.publishedAt)
                  : "待定"}
              </time>
              <span>{resource.type === "article" ? "文章" : "作品"}</span>
            </div>
            <h2>
              <Link href={resource.path}>{resource.title}</Link>
            </h2>
            {resource.description ? <p>{resource.description}</p> : null}
          </div>
          <Link
            className="resource-row__arrow"
            href={resource.path}
            aria-label={`阅读《${resource.title}》`}
          >
            <ArrowRight aria-hidden="true" />
          </Link>
        </article>
      ))}
    </div>
  );
}
