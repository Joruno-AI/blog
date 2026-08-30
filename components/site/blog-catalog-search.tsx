"use client";

import { Search, X } from "lucide-react";
import { useRef } from "react";

type BlogCatalogSearchProps = {
  id: string;
  value: string;
  expanded: boolean;
  mobile?: boolean;
  onValueChange: (value: string) => void;
  onExpandedChange: (expanded: boolean) => void;
};

export function BlogCatalogSearch({
  id,
  value,
  expanded,
  mobile = false,
  onValueChange,
  onExpandedChange,
}: BlogCatalogSearchProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function expandAndFocus() {
    onExpandedChange(true);
    window.setTimeout(() => inputRef.current?.focus(), 50);
  }

  function collapseIfIdle() {
    window.setTimeout(() => {
      if (!value && !boxRef.current?.contains(document.activeElement)) onExpandedChange(false);
    }, 150);
  }

  return (
    <div
      ref={boxRef}
      className={`search-box catalog-search-box${mobile ? " mobile-search-box" : ""}${expanded ? " expanded" : ""}`}
      id={id}
      onClick={(event) => {
        if ((event.target as HTMLElement).closest(".search-clear")) return;
        expandAndFocus();
      }}
    >
      <button type="button" className="search-trigger" aria-label="搜索目录" onClick={expandAndFocus}>
        <Search aria-hidden="true" />
      </button>
      <input
        ref={inputRef}
        type="search"
        className="search-input"
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        onFocus={() => onExpandedChange(true)}
        onBlur={collapseIfIdle}
        aria-label="搜索博客文章"
        placeholder="搜索文章"
        autoComplete="off"
      />
      <button
        type="button"
        className={`search-clear${value ? "" : " hidden"}`}
        aria-label="清除搜索"
        onClick={(event) => {
          event.stopPropagation();
          onValueChange("");
          onExpandedChange(false);
        }}
      >
        <X aria-hidden="true" />
      </button>
    </div>
  );
}
