"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export type ShortCard = {
  id: string;
  title: string;
  path: string;
  publishedAt: string | null;
  tags: string[];
};

const dateFormatter = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function ShortsDirectory({ items }: { items: ShortCard[] }) {
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const tags = useMemo(
    () => [...new Set(items.flatMap((item) => item.tags))].sort((a, b) => a.localeCompare(b, "zh-CN")),
    [items],
  );
  const visibleItems = activeTag
    ? items.filter((item) => item.tags.includes(activeTag))
    : items;

  if (items.length === 0) {
    return <div className="site-empty">No content available for display.</div>;
  }

  return (
    <div className="shorts-directory">
      <div className="shorts-grid" aria-live="polite">
        {visibleItems.map((item) => (
          <article className="short-card" key={item.id}>
            <Link className="short-card__body" href={item.path}>
              <p>{item.title}</p>
              <span className="short-card__grow" />
              {item.publishedAt ? (
                <time dateTime={item.publishedAt}>{dateFormatter.format(new Date(item.publishedAt))}</time>
              ) : null}
            </Link>
            {item.tags.length > 0 ? (
              <div className="short-card__tags" aria-label="标签">
                {item.tags.map((tag) => (
                  <button
                    className={activeTag === tag ? "is-active" : undefined}
                    key={tag}
                    onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                    type="button"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            ) : null}
          </article>
        ))}
      </div>
      {tags.length > 0 ? (
        <aside className="shorts-tags" aria-label="筛选标签">
          <p>Choose Tags</p>
          <button
            className={activeTag === null ? "is-active" : undefined}
            onClick={() => setActiveTag(null)}
            type="button"
          >
            全部 <span>{items.length}</span>
          </button>
          {tags.map((tag) => (
            <button
              className={activeTag === tag ? "is-active" : undefined}
              key={tag}
              onClick={() => setActiveTag(activeTag === tag ? null : tag)}
              type="button"
            >
              {tag} <span>{items.filter((item) => item.tags.includes(tag)).length}</span>
            </button>
          ))}
        </aside>
      ) : null}
    </div>
  );
}
