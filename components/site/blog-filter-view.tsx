"use client";

import Link from "next/link";
import { BookOpen, ChevronLeft, ChevronRight, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { BlogCatalogSearch } from "@/components/site/blog-catalog-search";
import { SiteIcon } from "@/components/site/site-icon";
import {
  blogIndexGroupLabel,
  buildBlogCatalogTree,
  flattenBlogCatalogTree,
  isBlogCategoryMatch,
  type FlattenedBlogCatalogNode,
} from "@/components/site/blog-catalog-tree";

export type BlogIndexPost = {
  id: string;
  title: string;
  slug: string;
  categoryPath: string | null;
  categoryNamePath: string | null;
  pubDate: string | null;
  minutesRead: number | null;
};

const date = new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric" });
const CATEGORY_PARAM = "category";
const CATEGORY_STORAGE_KEY = "blog-filter-category";
const EXPANDED_STORAGE_KEY = "blog-filter-expanded";

function writeStorage(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Private browsing and hardened environments can deny storage access.
  }
}

function readStorage(key: string) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function categoryFromUrl(validPaths: ReadonlySet<string>) {
  const selected = new URL(window.location.href).searchParams.get(CATEGORY_PARAM);
  return selected && (selected === "all" || validPaths.has(selected)) ? selected : undefined;
}

function syncCategoryToUrl(category: string) {
  const url = new URL(window.location.href);
  if (category === "all") url.searchParams.delete(CATEGORY_PARAM);
  else url.searchParams.set(CATEGORY_PARAM, category);

  const next = `${url.pathname}${url.search}${url.hash}`;
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (next !== current) window.history.replaceState({}, "", next);
}

type FilterCatalogListProps = {
  flattened: FlattenedBlogCatalogNode<BlogIndexPost>[];
  total: number;
  category: string;
  expandedCategory: string | null;
  query: string;
  mobile?: boolean;
  onSelect: (path: string, canExpand: boolean) => void;
  onNavigate?: () => void;
};

function FilterCatalogList({
  flattened,
  total,
  category,
  expandedCategory,
  query,
  mobile = false,
  onSelect,
  onNavigate,
}: FilterCatalogListProps) {
  const needle = query.trim().toLocaleLowerCase();

  return (
    <ul className={`category-nav${mobile ? " mobile-nav" : ""}`}>
      <li className={`category-group${needle ? " search-no-match" : ""}`} data-depth="0">
        <button
          type="button"
          className={`category-header${category === "all" ? " active" : ""}`}
          data-category="all"
          onClick={() => onSelect("all", false)}
        >
          <span className="category-name">全部</span>
          <span className="category-count">{`(${total})`}</span>
        </button>
      </li>
      {flattened.map(({ node, depth, hasChildren, totalPosts }) => {
        const categoryMatches = node.name.toLocaleLowerCase().includes(needle);
        const matchingPosts = node.posts.filter((post) => !needle || categoryMatches || post.title.toLocaleLowerCase().includes(needle));
        const matches = !needle || categoryMatches || matchingPosts.length > 0;
        if (!matches) return null;

        const canExpand = node.posts.length > 0;
        const isExpanded = needle ? matchingPosts.length > 0 : expandedCategory === node.path;
        return (
          <li className="category-group" data-depth={depth} data-path={node.path} key={node.path}>
            <button
              type="button"
              className={`category-header${category === node.path ? " active" : ""}${isExpanded ? " expanded" : ""}`}
              data-category={node.path}
              data-has-children={hasChildren || canExpand || undefined}
              style={{ paddingLeft: `${depth * 0.75}rem` }}
              aria-expanded={canExpand ? isExpanded : undefined}
              onClick={() => onSelect(node.path, canExpand)}
            >
              {hasChildren || canExpand ? <ChevronRight className="expand-icon" aria-hidden="true" /> : null}
              <span className="category-name">{node.name}</span>
              <span className="category-count">{`(${totalPosts})`}</span>
            </button>
            {canExpand ? (
              <ul className={`category-posts${isExpanded ? " expanded" : ""}`} style={{ paddingLeft: `${depth * 0.75 + 1.25}rem` }}>
                {matchingPosts.map((post) => (
                  <li key={post.id}>
                    <Link className="post-link" href={`/blog/${post.slug}/`} title={post.title} onClick={onNavigate}>
                      {post.title}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

export function BlogFilterView({ posts }: { posts: BlogIndexPost[] }) {
  const tree = useMemo(() => buildBlogCatalogTree(posts), [posts]);
  const flattened = useMemo(() => flattenBlogCatalogTree(tree), [tree]);
  const validPaths = useMemo(() => new Set(flattened.map(({ node }) => node.path)), [flattened]);
  const validPathKey = useMemo(() => [...validPaths].join("\u0000"), [validPaths]);
  const [category, setCategory] = useState("all");
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState("");
  const [query, setQuery] = useState("");
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const drawerCloseRef = useRef<HTMLButtonElement>(null);
  const drawerTriggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!searchValue) {
      setQuery("");
      return;
    }
    const timer = window.setTimeout(() => setQuery(searchValue.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [searchValue]);

  useEffect(() => {
    const urlCategory = categoryFromUrl(validPaths);
    const savedCategory = readStorage(CATEGORY_STORAGE_KEY);
    const restored = urlCategory || (savedCategory && (savedCategory === "all" || validPaths.has(savedCategory)) ? savedCategory : "all");
    setCategory(restored);
    writeStorage(CATEGORY_STORAGE_KEY, restored);
    if (!urlCategory) syncCategoryToUrl(restored);

    try {
      const savedExpanded = JSON.parse(readStorage(EXPANDED_STORAGE_KEY) || "[]") as unknown;
      if (Array.isArray(savedExpanded)) {
        const restoredExpanded = [...savedExpanded].reverse().find((path): path is string => typeof path === "string" && validPaths.has(path));
        setExpandedCategory(restoredExpanded || null);
        if (restoredExpanded) writeStorage(EXPANDED_STORAGE_KEY, JSON.stringify([restoredExpanded]));
      }
    } catch {
      setExpandedCategory(null);
    }

    const onPopState = () => {
      const next = categoryFromUrl(validPaths) || "all";
      setCategory(next);
      writeStorage(CATEGORY_STORAGE_KEY, next);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
    // The serialized key intentionally represents the membership of validPaths.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validPathKey]);

  useEffect(() => {
    if (!query) return;
    setCategory("all");
    writeStorage(CATEGORY_STORAGE_KEY, "all");
    syncCategoryToUrl("all");
  }, [query]);

  useEffect(() => {
    if (!drawerOpen) return;
    const previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    window.setTimeout(() => drawerCloseRef.current?.focus(), 0);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setDrawerOpen(false);
        window.setTimeout(() => drawerTriggerRef.current?.focus(), 0);
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = Array.from(
        drawerRef.current?.querySelectorAll<HTMLElement>("button:not([disabled]), a[href], input:not([disabled])") || [],
      ).filter((element) => element.getClientRects().length > 0);
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.documentElement.style.overflow = previousOverflow;
    };
  }, [drawerOpen]);

  function selectCategory(path: string, canExpand: boolean) {
    const next = path === "all" || validPaths.has(path) ? path : "all";
    setCategory(next);
    writeStorage(CATEGORY_STORAGE_KEY, next);
    syncCategoryToUrl(next);

    if (canExpand) {
      setExpandedCategory((current) => {
        const expanded = current === next ? null : next;
        writeStorage(EXPANDED_STORAGE_KEY, JSON.stringify(expanded ? [expanded] : []));
        return expanded;
      });
    }
  }

  const groups = useMemo(() => {
    const needle = query.toLocaleLowerCase();
    return flattened.flatMap(({ node }) => {
      const visiblePosts = node.posts.filter((post) => {
        return isBlogCategoryMatch(post.categoryPath, category) && (!needle || post.title.toLocaleLowerCase().includes(needle));
      });
      // Astro uses the curated display name in the catalog navigation but the
      // raw normalized category slug as the section heading in the post list.
      return visiblePosts.length ? [{ path: node.path, name: blogIndexGroupLabel(node.path), posts: visiblePosts }] : [];
    });
  }, [flattened, category, query]);
  const visibleCount = groups.reduce((total, group) => total + group.posts.length, 0);

  const catalogListProps = {
    flattened,
    total: posts.length,
    category,
    expandedCategory,
    query,
    onSelect: selectCategory,
  };

  function closeDrawer(restoreFocus = false) {
    setDrawerOpen(false);
    if (restoreFocus) window.setTimeout(() => drawerTriggerRef.current?.focus(), 0);
  }

  return (
    <div className="blog-filter-view">
      <aside className="blog-catalog category-sidebar blog-catalog-desktop blog-parity-catalog" aria-label="博客目录">
        <nav className="toc-desktop toc-desktop-content blog-catalog-nav">
          <div className="catalog-heading">
            <Link className="catalog-home" href="/blog/" aria-current="page">
              <BookOpen aria-hidden="true" />
              <span>Blog</span>
              <span className="catalog-total">{posts.length}</span>
            </Link>
          </div>
          <BlogCatalogSearch
            id="blog-catalog-search-box"
            value={searchValue}
            expanded={searchExpanded}
            onValueChange={setSearchValue}
            onExpandedChange={setSearchExpanded}
          />
          <FilterCatalogList {...catalogListProps} />
        </nav>
      </aside>

      <button
        ref={drawerTriggerRef}
        type="button"
        className="category-drawer-trigger floating-tool-button"
        aria-label={drawerOpen ? "关闭博客目录" : "打开博客目录"}
        aria-expanded={drawerOpen}
        aria-controls="blog-filter-category-drawer"
        onClick={() => setDrawerOpen((open) => !open)}
      >
        <PanelLeftOpen className="drawer-trigger-icon drawer-trigger-icon-collapsed" aria-hidden="true" />
        <PanelLeftClose className="drawer-trigger-icon drawer-trigger-icon-expanded" aria-hidden="true" />
      </button>

      <div
        ref={drawerRef}
        id="blog-filter-category-drawer"
        className={`category-drawer blog-parity-catalog${drawerOpen ? " open" : ""}`}
        aria-hidden={!drawerOpen}
        inert={!drawerOpen}
      >
        <button type="button" className="drawer-overlay" aria-label="关闭博客目录" onClick={() => closeDrawer(true)} />
        <div className="drawer-content" role="dialog" aria-modal="true" aria-label="博客目录">
          <div className="drawer-header">
            <BlogCatalogSearch
              id="blog-catalog-mobile-search-box"
              value={searchValue}
              expanded={searchExpanded}
              mobile
              onValueChange={setSearchValue}
              onExpandedChange={setSearchExpanded}
            />
            <button ref={drawerCloseRef} type="button" className="drawer-close" aria-label="关闭博客目录" onClick={() => closeDrawer(true)}>
              <ChevronLeft aria-hidden="true" />
            </button>
          </div>
          <FilterCatalogList {...catalogListProps} mobile onNavigate={() => closeDrawer()} />
        </div>
      </div>

      <div id="blog-post-list" aria-label="Post list">
        {groups.flatMap((group) =>
          group.posts.map((post, index) => (
            <div className="post-item" data-category={group.path} key={post.id}>
              {index === 0 ? (
                <div className="toc-heading slide-enter">
                  <span>{group.name}</span>
                </div>
              ) : null}
              <div className="slide-enter blog-list-item">
                <Link className="site-link no-underline blog-list-link" href={`/blog/${post.slug}/`} title={post.title}>
                  <span className="list-item-title-shell">
                    <span className="list-item-title-row">
                      <span className="list-item-title">{post.title}</span>
                    </span>
                  </span>
                  <span className="list-item-meta">
                    {post.pubDate ? (
                      <time className="list-item-date" dateTime={new Date(post.pubDate).toISOString()}>
                        {date.format(new Date(post.pubDate))}
                      </time>
                    ) : null}
                    {post.minutesRead ? <span className="list-item-read-time">· {Math.ceil(post.minutesRead)} min</span> : null}
                    <SiteIcon name="arrow-right-line" className="list-item-arrow" />
                  </span>
                </Link>
              </div>
            </div>
          )),
        )}
        {visibleCount === 0 ? <p className="blog-empty">没有找到匹配文章。</p> : null}
      </div>
    </div>
  );
}
