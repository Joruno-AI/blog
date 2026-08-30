"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { MobileTagDialog } from "@/components/site/mobile-tag-dialog";

export type ShortCard = {
  id: string;
  title: string;
  path: string;
  publishedAt: string | null;
  tags: string[];
};

const dateFormatter = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

const STORAGE_KEY = "tag-filter:selected:/shorts";

function uniqueTags(items: ShortCard[]) {
  return [...new Set(items.flatMap((item) => item.tags))].sort((a, b) => a.localeCompare(b, "zh-CN"));
}

function tagRelations(items: ShortCard[], tags: string[]) {
  return new Map(tags.map((tag) => {
    const related = new Set<string>();
    for (const item of items) {
      if (!item.tags.includes(tag)) continue;
      for (const candidate of item.tags) if (candidate !== tag) related.add(candidate);
    }
    return [tag, related] as const;
  }));
}

function availableTags(tags: string[], relations: Map<string, Set<string>>, selected: Set<string>) {
  if (selected.size === 0) return new Set(tags);
  let available: Set<string> | null = null;
  for (const tag of selected) {
    const related = relations.get(tag) ?? new Set<string>();
    available = available
      ? new Set(Array.from<string>(available).filter((candidate) => related.has(candidate)))
      : new Set(related);
  }
  const result = available ?? new Set<string>();
  for (const tag of selected) result.delete(tag);
  return result;
}

function TagControl({
  tags,
  relations,
  selected,
  onToggle,
}: {
  tags: string[];
  relations: Map<string, Set<string>>;
  selected: Set<string>;
  onToggle: (tag: string) => void;
}) {
  const available = availableTags(tags, relations, selected);
  return (
    <div className="shorts-tag-options" role="listbox" aria-multiselectable="true">
      {tags.map((tag) => {
        const active = selected.has(tag);
        return (
          <button
            type="button"
            role="option"
            aria-selected={active}
            data-tag={tag}
            data-related={[...(relations.get(tag) ?? [])].join(",")}
            disabled={!active && !available.has(tag)}
            key={tag}
            onClick={() => onToggle(tag)}
          >
            {tag}
          </button>
        );
      })}
    </div>
  );
}

export function ShortsDirectory({ items }: { items: ShortCard[] }) {
  const tags = useMemo(() => uniqueTags(items), [items]);
  const relations = useMemo(() => tagRelations(items, tags), [items, tags]);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    try {
      const value: unknown = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "[]");
      if (Array.isArray(value)) {
        setSelected(new Set(value.filter((tag): tag is string => typeof tag === "string" && tags.includes(tag))));
      }
    } catch {
      // Browsing remains usable when storage access is unavailable.
    }
  }, [tags]);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...selected]));
    } catch {
      // Browsing remains usable when storage access is unavailable.
    }
  }, [selected]);

  const toggleTag = (tag: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  };
  const visibleItems = selected.size
    ? items.filter((item) => [...selected].every((tag) => item.tags.includes(tag)))
    : items;

  if (items.length === 0) {
    return <div className="prose shorts-empty">No content available for display.<br />Please review and modify <code>CardView.astro</code> as needed.</div>;
  }

  return (
    <div className="shorts-page-body">
      <div className="shorts-layout fade-in">
        <div className="shorts-card-grid" aria-live="polite">
          {visibleItems.map((item) => (
            <section className="shorts-card-item" data-tags={item.tags.join(",")} key={item.id}>
              <div className="shorts-card-surface">
                <Link className="site-link shorts-card-link" href={item.path}>
                  <p className="prose">{item.title}</p>
                  <span className="shorts-card-grow" />
                  {item.publishedAt ? (
                    <time dateTime={item.publishedAt}>{dateFormatter.format(new Date(item.publishedAt))}</time>
                  ) : null}
                  <span className="shorts-card-rule" role="none" />
                  <span className="shorts-card-tags" role="none">
                    {item.tags.map((tag, index) => (
                      <span data-active={selected.has(tag)} data-tag={tag} key={tag}>{index === 0 ? ` ${tag}` : tag}</span>
                    ))}
                  </span>
                </Link>
              </div>
            </section>
          ))}
        </div>

        <aside className="shorts-tags-aside" aria-label="Tags filter" style={{ position: "sticky" }}>
          <p>Choose Tags</p>
          <a className="skip-tags-link" href="#skip-tags">Skip tags</a>
          <TagControl tags={tags} relations={relations} selected={selected} onToggle={toggleTag} />
          <span id="skip-tags" hidden />
        </aside>
      </div>

      <MobileTagDialog
        open={mobileOpen}
        onOpenChange={setMobileOpen}
        triggerClassName="shorts-tag-open"
        dialogClassName="shorts-mobile-tags"
        backdropClassName="shorts-tag-backdrop"
        panelClassName="shorts-tag-panel"
      >
        <TagControl tags={tags} relations={relations} selected={selected} onToggle={toggleTag} />
      </MobileTagDialog>
    </div>
  );
}
