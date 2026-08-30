"use client";

import Link from "next/link";
import { BookOpen, ChevronLeft, ChevronRight, LayoutGrid, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { BlogCatalogSearch } from "@/components/site/blog-catalog-search";
import {
  buildBlogCatalogTree,
  flattenBlogCatalogTree,
  type FlattenedBlogCatalogNode,
} from "@/components/site/blog-catalog-tree";
import type { BlogReaderPost } from "@/lib/parity/blog-reader";

type ReaderCatalogListProps = {
  flattened: FlattenedBlogCatalogNode<BlogReaderPost>[];
  total: number;
  currentId: string;
  currentCategory?: string;
  query: string;
  mobile?: boolean;
  onNavigate?: () => void;
};

function ReaderCatalogList({
  flattened,
  total,
  currentId,
  currentCategory,
  query,
  mobile = false,
  onNavigate,
}: ReaderCatalogListProps) {
  const needle = query.trim().toLocaleLowerCase();

  return (
    <ul className={`category-nav reader-category-list${mobile ? " mobile-nav" : ""}`}>
      <li className={`category-group${needle ? " search-no-match" : ""}`} data-depth="0">
        <Link className="category-header reader-category-all" href="/blog/" onClick={onNavigate}>
          <LayoutGrid aria-hidden="true" />
          <span className="category-name">全部文章</span>
          <span className="category-count">{`(${total})`}</span>
        </Link>
      </li>
      {flattened.map(({ node, depth, hasChildren, totalPosts }) => {
        const categoryMatches = node.name.toLocaleLowerCase().includes(needle);
        const matchingPosts = node.posts.filter((post) => !needle || categoryMatches || post.title.toLocaleLowerCase().includes(needle));
        const matches = !needle || categoryMatches || matchingPosts.length > 0;
        if (!matches) return null;

        const isCurrent = node.path === currentCategory;
        const inCurrentBranch = Boolean(currentCategory && (isCurrent || currentCategory.startsWith(`${node.path}/`)));
        const isExpanded = needle ? matchingPosts.length > 0 : isCurrent;
        const hasExpandableContent = hasChildren || node.posts.length > 0;
        return (
          <li className="category-group" data-depth={depth} data-path={node.path} key={node.path}>
            <Link
              href={`/blog/?category=${encodeURIComponent(node.path)}`}
              className={`category-header${isCurrent ? " active" : ""}${inCurrentBranch && !isCurrent ? " is-parent" : ""}${isExpanded ? " expanded" : ""}`}
              aria-current={isCurrent ? "location" : undefined}
              style={{ paddingLeft: `${depth * 0.75}rem` }}
              onClick={onNavigate}
            >
              {hasExpandableContent ? <ChevronRight className={`expand-icon${isExpanded ? " expanded" : ""}`} aria-hidden="true" /> : null}
              <span className="category-name">{node.name}</span>
              <span className="category-count">{`(${totalPosts})`}</span>
            </Link>
            {node.posts.length ? (
              <ul
                className={`category-posts reader-post-list${isExpanded ? " expanded" : ""}`}
                style={{ paddingLeft: `${depth * 0.75 + 1.25}rem` }}
              >
                {matchingPosts.map((post) => (
                  <li key={post.id}>
                    <Link
                      className={`post-link${post.id === currentId ? " active" : ""}`}
                      aria-current={post.id === currentId ? "page" : undefined}
                      href={`/blog/${post.slug}/`}
                      title={post.title}
                      onClick={onNavigate}
                    >
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

export function BlogReaderSidebar({ posts, currentId }: { posts: BlogReaderPost[]; currentId: string }) {
  const current = posts.find((post) => post.id === currentId);
  const tree = useMemo(() => buildBlogCatalogTree(posts), [posts]);
  const flattened = useMemo(() => flattenBlogCatalogTree(tree), [tree]);
  const [query, setQuery] = useState("");
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const drawerCloseRef = useRef<HTMLButtonElement>(null);
  const drawerTriggerRef = useRef<HTMLButtonElement>(null);

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

  const listProps = {
    flattened,
    total: posts.length,
    currentId,
    currentCategory: current?.categoryPath,
    query,
  };

  function closeDrawer(restoreFocus = false) {
    setDrawerOpen(false);
    if (restoreFocus) window.setTimeout(() => drawerTriggerRef.current?.focus(), 0);
  }

  return (
    <>
      <aside className="reader-catalog category-sidebar reader-catalog-desktop blog-parity-catalog" aria-label="博客目录">
        <nav className="toc-desktop toc-desktop-content blog-catalog-nav reader-catalog-nav">
          <div className="catalog-heading">
            <Link className="catalog-home reader-catalog-home" href="/blog/">
              <BookOpen aria-hidden="true" />
              <span>Blog</span>
              <span className="catalog-total">{posts.length}</span>
            </Link>
          </div>
          <BlogCatalogSearch
            id="blog-reader-catalog-search-box"
            value={query}
            expanded={searchExpanded}
            onValueChange={setQuery}
            onExpandedChange={setSearchExpanded}
          />
          <ReaderCatalogList {...listProps} />
        </nav>
      </aside>

      <button
        ref={drawerTriggerRef}
        type="button"
        className="category-drawer-trigger floating-tool-button reader-category-drawer-trigger"
        aria-label={drawerOpen ? "关闭博客目录" : "打开博客目录"}
        aria-expanded={drawerOpen}
        aria-controls="blog-reader-category-drawer"
        onClick={() => setDrawerOpen((open) => !open)}
      >
        <PanelLeftOpen className="drawer-trigger-icon drawer-trigger-icon-collapsed" aria-hidden="true" />
        <PanelLeftClose className="drawer-trigger-icon drawer-trigger-icon-expanded" aria-hidden="true" />
      </button>

      <div
        ref={drawerRef}
        id="blog-reader-category-drawer"
        className={`category-drawer blog-parity-catalog${drawerOpen ? " open" : ""}`}
        aria-hidden={!drawerOpen}
        inert={!drawerOpen}
      >
        <button type="button" className="drawer-overlay" aria-label="关闭博客目录" onClick={() => closeDrawer(true)} />
        <div className="drawer-content" role="dialog" aria-modal="true" aria-label="博客目录">
          <div className="drawer-header">
            <BlogCatalogSearch
              id="blog-reader-catalog-mobile-search-box"
              value={query}
              expanded={searchExpanded}
              mobile
              onValueChange={setQuery}
              onExpandedChange={setSearchExpanded}
            />
            <button ref={drawerCloseRef} type="button" className="drawer-close" aria-label="关闭博客目录" onClick={() => closeDrawer(true)}>
              <ChevronLeft aria-hidden="true" />
            </button>
          </div>
          <ReaderCatalogList {...listProps} mobile onNavigate={() => closeDrawer()} />
        </div>
      </div>
    </>
  );
}
