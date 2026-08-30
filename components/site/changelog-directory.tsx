"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { BlogArticleToc } from "@/components/site/blog-article-toc";
import { MobileTagDialog } from "@/components/site/mobile-tag-dialog";
import { SiteIcon } from "@/components/site/site-icon";

export type ChangelogListItem = {
  id: string;
  title: string;
  path: string;
  publishedAt: string;
  minutesRead: number;
  tags: string[];
};

const monthDay = new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric" });
const STORAGE_KEY = "tag-filter:selected:/changelog";

function buildRelations(items: ChangelogListItem[], tags: string[]) {
  return new Map(tags.map((tag) => {
    const related = new Set<string>();
    for (const item of items) if (item.tags.includes(tag)) for (const other of item.tags) if (other !== tag) related.add(other);
    return [tag, related] as const;
  }));
}

function TagButtons({ tags, relations, selected, toggle }: {
  tags: string[];
  relations: Map<string, Set<string>>;
  selected: Set<string>;
  toggle: (tag: string) => void;
}) {
  let available = new Set(tags);
  if (selected.size) {
    let intersection: Set<string> | null = null;
    for (const tag of selected) {
      const related = relations.get(tag) ?? new Set<string>();
      intersection = intersection
        ? new Set(Array.from<string>(intersection).filter((candidate) => related.has(candidate)))
        : new Set(related);
    }
    available = intersection ?? new Set<string>();
    for (const tag of selected) available.delete(tag);
  }
  return (
    <div className="changelog-tag-options" role="listbox" aria-multiselectable="true">
      {tags.map((tag) => {
        const active = selected.has(tag);
        return <button type="button" role="option" aria-selected={active} disabled={!active && !available.has(tag)} data-tag={tag} key={tag} onClick={() => toggle(tag)}>{tag}</button>;
      })}
    </div>
  );
}

export function ChangelogDirectory({ items }: { items: ChangelogListItem[] }) {
  const years = useMemo(() => [...new Set(items.map((item) => new Date(item.publishedAt).getFullYear().toString()))], [items]);
  const tags = useMemo(() => [...new Set(items.flatMap((item) => item.tags))].sort((a, b) => a.localeCompare(b)), [items]);
  const relations = useMemo(() => buildRelations(items, tags), [items, tags]);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [mobileTags, setMobileTags] = useState(false);

  useEffect(() => {
    try {
      const raw: unknown = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "[]");
      if (Array.isArray(raw)) setSelected(new Set(raw.filter((tag): tag is string => typeof tag === "string" && tags.includes(tag))));
    } catch { /* keep the default selection */ }
  }, [tags]);
  useEffect(() => {
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...selected])); } catch { /* storage is optional */ }
  }, [selected]);
  const toggle = (tag: string) => setSelected((current) => {
    const next = new Set(current);
    if (next.has(tag)) next.delete(tag); else next.add(tag);
    return next;
  });
  const visible = (item: ChangelogListItem) => !selected.size || [...selected].every((tag) => item.tags.includes(tag));

  return (
    <div className="changelog-directory">
      <BlogArticleToc
        headings={years.map((year) => ({ depth: 2, text: year, id: year }))}
        desktopPosition="left"
        context={null}
        desktopAfter={(
          <aside className="changelog-tags-aside" aria-label="Tags filter">
            <SiteIcon name="price-tag-3-line" />
            <a className="skip-tags-link" href="#skip-tags">Skip tags</a>
            <TagButtons tags={tags} relations={relations} selected={selected} toggle={toggle} />
            <span id="skip-tags" hidden />
          </aside>
        )}
      />

      <MobileTagDialog
        open={mobileTags}
        onOpenChange={setMobileTags}
        triggerClassName="changelog-tag-open"
        dialogClassName="changelog-mobile-tags"
        backdropClassName="changelog-tags-backdrop"
        panelClassName="changelog-tag-panel"
      >
        <TagButtons tags={tags} relations={relations} selected={selected} toggle={toggle} />
      </MobileTagDialog>

      <div className="changelog-groups" aria-label="Post list">
        {years.map((year) => {
          const group = items.filter((item) => new Date(item.publishedAt).getFullYear().toString() === year && visible(item));
          if (!group.length) return null;
          return (
            <section data-year={year} key={year}>
              <div id={year} className="toc-heading changelog-year-heading"><span>{year}</span></div>
              {group.map((item, index) => (
                <div className="slide-enter changelog-list-item" data-tags={item.tags.join(",")} key={item.id} style={{ "--enter-stage": index % 5 } as React.CSSProperties}>
                  <Link className="site-link blog-list-link changelog-list-link" href={item.path}>
                    <span className="list-item-title-row"><span className="list-item-title">{item.title}</span></span>
                    <span className="list-item-meta">
                      <time dateTime={item.publishedAt}>{monthDay.format(new Date(item.publishedAt))}</time>
                      <span>· {item.minutesRead} min</span>
                      <SiteIcon name="arrow-right-line" className="list-item-arrow" />
                    </span>
                  </Link>
                </div>
              ))}
            </section>
          );
        })}
      </div>

    </div>
  );
}
