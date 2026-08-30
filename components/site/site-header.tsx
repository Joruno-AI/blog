"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { SiteIcon, type SiteIconName } from "@/components/site/site-icon";

type SearchResult = {
  id: string;
  path: string;
  title: string;
  description?: string | null;
};

const navigation: Array<{ href: string; label: string; icon: SiteIconName }> = [
  { href: "/", label: "Home", icon: "home-4-line" },
  { href: "/blog/", label: "Blog", icon: "article-line" },
  { href: "/docs/", label: "Docs", icon: "book-open-line" },
  { href: "/projects/", label: "Projects", icon: "code-box-line" },
  { href: "/agent/", label: "Agent", icon: "shapes-line" },
  { href: "/photos/", label: "Photos", icon: "camera-ai-line" },
  { href: "/shorts/", label: "Shorts", icon: "sticky-note-line" },
  { href: "/music/", label: "Music Player", icon: "disc-line" },
];

const logoPaths = [
  "M66 229C40 223 11 195 0 152C-23 66 20 -3 95 -16C176 -30 259 -6 336 122C391 213 488 412 521 490C546 549 541 593 528 615C521 627 512 628 504 616C472 567 386 396 332 285C265 146 192 -6 102 15C71 22 32 67 81 209C87 226 80 232 66 229Z",
  "M1093 85C1105 111 1101 138 1096 150C1092 159 1085 157 1081 148C1049 75 998 8 958 11C926 13 914 52 933 107C951 160 999 228 1046 281C1076 315 1051 362 1033 383C1025 393 1016 390 1003 381C965 355 930 338 895 333C915 386 933 459 898 458C858 457 760 325 834 293C813 255 784 236 756 231C756 237 758 242 758 247C763 320 734 326 710 357C689 384 673 394 643 391C583 386 520 330 482 261C439 182 424 95 467 36C506 -17 558 -19 594 -7C668 17 730 120 750 205C805 207 846 241 874 286C906 286 950 296 995 325C953 276 890 202 870 135C845 53 876 -14 953 -18C1008 -21 1066 25 1093 85ZM694 247C675 263 666 288 669 313C673 342 695 350 699 317C701 300 700 276 694 247ZM685 218C678 193 666 166 650 136C600 45 538 9 512 32C486 55 500 146 543 222C565 260 593 293 620 316C621 280 646 240 685 218Z",
  "M1266 81C1258 23 1284 -18 1349 -18C1408 -18 1470 33 1499 89C1513 117 1512 144 1508 152C1504 161 1495 160 1490 151C1451 81 1400 15 1358 13C1322 11 1318 53 1344 110C1367 161 1417 236 1439 281C1463 331 1455 375 1440 393C1432 403 1425 401 1415 387C1383 344 1354 275 1291 173C1237 86 1182 16 1143 19C1120 21 1117 57 1138 106C1159 154 1179 194 1216 253C1252 310 1257 355 1235 388C1227 397 1217 398 1209 387C1144 296 1093 198 1071 132C1049 66 1051 -8 1122 -13C1178 -17 1231 34 1266 81Z",
  "M1634 294C1645 330 1646 364 1631 389C1625 399 1617 400 1610 389C1547 296 1470 157 1450 94C1434 44 1440 11 1460 -9C1469 -18 1475 -14 1479 -5C1522 89 1566 185 1625 249C1689 319 1747 347 1757 343C1775 335 1687 229 1654 131C1625 44 1645 -18 1730 -18C1788 -18 1851 33 1878 89C1892 118 1894 141 1887 152C1882 160 1875 160 1870 151C1832 81 1783 15 1742 13C1706 11 1700 58 1726 116C1749 168 1798 242 1819 286C1844 338 1813 387 1780 392C1747 397 1679 342 1634 294Z",
  "M2200 215C2204 220 2204 225 2197 225C2189 225 2183 223 2177 223C2178 231 2178 238 2179 246C2185 318 2155 325 2132 356C2112 383 2095 392 2064 390C2004 386 1943 328 1905 260C1860 180 1845 93 1889 35C1929 -17 1979 -21 2015 -9C2089 16 2152 117 2173 202C2183 203 2193 207 2200 215ZM2114 242C2098 257 2087 286 2092 313C2097 342 2117 348 2122 316C2125 298 2122 273 2114 242ZM2107 215C2099 191 2087 163 2072 135C2023 43 1962 8 1934 31C1908 53 1923 145 1965 221C1986 259 2015 292 2042 315C2043 278 2067 243 2088 227C2094 222 2100 218 2107 215Z",
];

function normalizedPath(value: string) {
  return value.length > 1 ? value.replace(/\/+$/, "") : value;
}

function JorunoLogo() {
  return (
    <svg viewBox="-120 -100 2480 900" aria-hidden="true" className="logo-svg">
      <g className="logo-word" transform="translate(24 650) scale(1 -1)">
        <g className="logo-base">
          {logoPaths.map((path) => <path key={`base-${path}`} d={path} />)}
        </g>
        <g className="logo-ink">
          {logoPaths.map((path) => <path key={`ink-${path}`} pathLength="1" d={path} />)}
        </g>
      </g>
    </svg>
  );
}

function setThemeMetadata(isDark: boolean, updateThemeColor = true) {
  document.querySelector("meta[name='color-scheme']")?.setAttribute("content", isDark ? "dark light" : "light dark");
  if (updateThemeColor) {
    const background = getComputedStyle(document.documentElement).getPropertyValue("--c-bg").trim();
    if (background) document.querySelector("meta[name='theme-color']")?.setAttribute("content", background);
  }
  const giscus = document.getElementById("giscus-script");
  const theme = isDark ? "/giscus/dark.css" : "/giscus/light.css";
  giscus?.setAttribute("data-theme", theme);
  const iframe = document.querySelector<HTMLIFrameElement>("iframe.giscus-frame");
  iframe?.contentWindow?.postMessage({ giscus: { setConfig: { theme } } }, "https://giscus.app");
}

function applyTheme(isDark: boolean) {
  document.documentElement.classList.remove("light", "dark");
  if (isDark) document.documentElement.classList.add("dark");
  document.documentElement.style.removeProperty("color-scheme");
  window.localStorage.setItem("theme", isDark ? "dark" : "light");
  setThemeMetadata(isDark);
}

function appearanceTransitionFill(): "both" | "none" {
  const userAgentData = (navigator as Navigator & {
    userAgentData?: { brands?: Array<{ brand: string; version: string }> };
  }).userAgentData;
  return userAgentData?.brands?.some(({ brand }) => /Chrom(e|ium)/i.test(brand)) ? "both" : "none";
}

function NavigationIcon({ icon }: { icon: SiteIconName }) {
  return <SiteIcon name={icon} />;
}

export function SiteHeader() {
  const pathname = usePathname();
  const { setTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuRendered, setMenuRendered] = useState(false);
  const [menuNoMotion, setMenuNoMotion] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const menuFrameRef = useRef(0);
  const menuCloseTimerRef = useRef(0);

  const closeMenu = useCallback((restoreFocus = false, allowMotion = true) => {
    window.cancelAnimationFrame(menuFrameRef.current);
    window.clearTimeout(menuCloseTimerRef.current);
    setMenuNoMotion(!allowMotion);
    setMenuOpen(false);
    if (allowMotion) {
      menuCloseTimerRef.current = window.setTimeout(() => {
        setMenuRendered(false);
        setMenuNoMotion(false);
      }, 240);
    } else {
      setMenuRendered(false);
      setMenuNoMotion(false);
    }
    if (restoreFocus) {
      requestAnimationFrame(() => document.getElementById("nav-open-button")?.focus());
    }
  }, []);

  const openMenu = useCallback((allowMotion = true) => {
    window.cancelAnimationFrame(menuFrameRef.current);
    window.clearTimeout(menuCloseTimerRef.current);
    setMenuNoMotion(!allowMotion);
    setMenuRendered(true);
    setMenuOpen(false);
    menuFrameRef.current = window.requestAnimationFrame(() => setMenuOpen(true));
  }, []);

  useEffect(() => {
    closeMenu(false, false);
    setSearchOpen(false);
  }, [closeMenu, pathname]);

  useEffect(() => () => {
    window.cancelAnimationFrame(menuFrameRef.current);
    window.clearTimeout(menuCloseTimerRef.current);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const sync = () => {
      if (root.classList.contains("light")) root.classList.remove("light");
      root.style.removeProperty("color-scheme");
      setDark(root.classList.contains("dark"));
    };
    sync();
    setThemeMetadata(root.classList.contains("dark"), false);
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystemTheme = (event: MediaQueryListEvent) => {
      applyTheme(event.matches);
      setDark(event.matches);
      setTheme(event.matches ? "dark" : "light");
    };
    systemTheme.addEventListener("change", onSystemTheme);
    return () => {
      observer.disconnect();
      systemTheme.removeEventListener("change", onSystemTheme);
    };
  }, [setTheme]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMenu(true, false);
    };
    const onPointer = (event: MouseEvent) => {
      if (menuOpen && event.target instanceof Node && !headerRef.current?.contains(event.target)) closeMenu(false, true);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
    };
  }, [closeMenu, menuOpen]);

  useEffect(() => {
    const musicLink = document.querySelector<HTMLElement>("[data-music-nav]");
    const audio = document.querySelector<HTMLAudioElement>("#global-music-player audio");
    if (!musicLink || !audio) return;
    const syncPlaybackState = () => {
      const playing = !audio.paused && !audio.ended;
      musicLink.dataset.playing = String(playing);
      musicLink.setAttribute("aria-label", playing ? "音乐播放中，打开播放器" : musicLink.getAttribute("title") || "打开音乐");
    };
    audio.addEventListener("play", syncPlaybackState);
    audio.addEventListener("pause", syncPlaybackState);
    audio.addEventListener("ended", syncPlaybackState);
    syncPlaybackState();
    return () => {
      audio.removeEventListener("play", syncPlaybackState);
      audio.removeEventListener("pause", syncPlaybackState);
      audio.removeEventListener("ended", syncPlaybackState);
    };
  }, []);

  const toggleTheme = (event: React.MouseEvent<HTMLButtonElement>) => {
    const nextIsDark = !document.documentElement.classList.contains("dark");
    const toggle = () => {
      applyTheme(nextIsDark);
      flushSync(() => setDark(nextIsDark));
      setTheme(nextIsDark ? "dark" : "light");
    };
    const documentWithTransition = document as Document & {
      startViewTransition?: (callback: () => void) => { ready: Promise<void> };
    };
    if (!documentWithTransition.startViewTransition || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      toggle();
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const hasPointerCoordinates = event.detail > 0 && (event.clientX !== 0 || event.clientY !== 0);
    const x = hasPointerCoordinates ? event.clientX : rect.left + rect.width / 2;
    const y = hasPointerCoordinates ? event.clientY : rect.top + rect.height / 2;
    const originX = `${(x / innerWidth) * 100}%`;
    const originY = `${(y / innerHeight) * 100}%`;
    const transition = documentWithTransition.startViewTransition(toggle);
    transition.ready.then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0% at ${originX} ${originY})`, `circle(150% at ${originX} ${originY})`] },
        { duration: 400, easing: "ease-out", fill: appearanceTransitionFill(), pseudoElement: "::view-transition-new(root)" },
      );
    });
  };

  const isActive = (href: string) => normalizedPath(pathname) === normalizedPath(href);
  const closeSearch = () => {
    setSearchOpen(false);
    requestAnimationFrame(() => document.getElementById("search-switch")?.focus());
  };

  return (
    <>
      <header ref={headerRef} className="nav-header">
        <div className="logo-wrapper">
          <Link prefetch={false} className="site-link logo-link" href="/" aria-label="Joruno · Joruno Jobāna" aria-current={pathname === "/" ? "page" : undefined}>
            <span className="logo-container"><JorunoLogo /></span>
          </Link>
        </div>
        <nav className="main-nav" aria-label="Main menu">
          <div className="desktop-nav-items">
            {navigation.map(({ href, label, icon }) => (
              <Link
                prefetch={false}
                className="nav-icon-link desktop-navigation-link"
                href={href}
                key={href}
                title={label}
                aria-label={label}
                aria-current={isActive(href) ? "page" : undefined}
                data-music-nav={href === "/music/" ? "true" : undefined}
              >
                <NavigationIcon icon={icon} />
              </Link>
            ))}
            <a className="nav-icon-link desktop-navigation-link" href="https://github.com/Joruno-AI" title="GitHub Profile" aria-label="GitHub Profile" rel="noopener noreferrer me" target="_blank">
              <NavigationIcon icon="github-alt" />
            </a>
            <hr className="nav-divider" aria-hidden="true" />
            <button id="search-switch" type="button" className="nav-icon-link" title="Search" aria-label="Search" onClick={() => setSearchOpen(true)}>
              <NavigationIcon icon="search" />
            </button>
            <button id="theme-switch" type="button" className="nav-icon-link" title="Toggle theme" role="switch" aria-label="Dark mode" aria-checked={dark} onClick={toggleTheme}>
              <NavigationIcon icon={dark ? "moon-line" : "sun-line"} />
            </button>
            <a className="nav-icon-link desktop-only" href="/rss.xml" title="RSS feed" aria-label="RSS feed" target="_blank" rel="noopener noreferrer">
              <NavigationIcon icon="rss" />
            </a>
          </div>
          <button
            id="nav-open-button"
            type="button"
            className="nav-icon-link mobile-menu-button touch-target"
            aria-label={menuOpen ? "收起导航菜单" : "打开导航菜单"}
            title={menuOpen ? "收起导航菜单" : "打开导航菜单"}
            aria-expanded={menuOpen}
            aria-controls="nav-panel"
            onClick={(event) => {
              if (menuOpen) closeMenu(false, event.detail > 0);
              else openMenu(event.detail > 0);
            }}
          >
            <NavigationIcon icon="menu-line" />
          </button>
          <div
            id="nav-panel"
            className={menuOpen ? "visible" : ""}
            hidden={!menuRendered}
            role="navigation"
            aria-label="导航菜单"
            data-no-motion={menuRendered && menuNoMotion ? "" : undefined}
          >
            <div className="mobile-nav-icon-grid">
              {navigation.map(({ href, label, icon }) => (
                <Link prefetch={false} href={href} key={href} title={label} aria-label={label} aria-current={isActive(href) ? "page" : undefined} onClick={() => closeMenu(false, true)}>
                  <NavigationIcon icon={icon} />
                </Link>
              ))}
              <a href="https://github.com/Joruno-AI" title="GitHub Profile" aria-label="GitHub Profile" target="_blank" rel="noopener noreferrer me"><NavigationIcon icon="github-alt" /></a>
              <a href="/rss.xml" title="RSS feed" aria-label="RSS feed" target="_blank" rel="noopener noreferrer"><NavigationIcon icon="rss" /></a>
            </div>
          </div>
        </nav>
      </header>
      <SearchPanel open={searchOpen} onClose={closeSearch} />
    </>
  );
}

function SearchPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTab, setSelectedTab] = useState<"blog" | "changelog">("blog");
  const [selectedItem, setSelectedItem] = useState(0);
  const [visibleCount, setVisibleCount] = useState(5);
  const [rendered, setRendered] = useState(open);
  const [closing, setClosing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const scrollLockRef = useRef<{ overflow: string; paddingRight: string } | null>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem("search-tab");
    if (saved === "1") setSelectedTab("changelog");
  }, []);

  useEffect(() => {
    let frame = 0;
    let timer = 0;
    const unlockScroll = () => {
      const previous = scrollLockRef.current;
      if (!previous) return;
      if (previous.overflow) document.body.style.overflow = previous.overflow;
      else document.body.style.removeProperty("overflow");
      if (previous.paddingRight) document.body.style.paddingRight = previous.paddingRight;
      else document.body.style.removeProperty("padding-right");
      scrollLockRef.current = null;
    };

    if (open) {
      if (!scrollLockRef.current) {
        scrollLockRef.current = {
          overflow: document.body.style.overflow,
          paddingRight: document.body.style.paddingRight,
        };
        const scrollbarWidth = window.innerWidth - document.body.clientWidth;
        if (scrollbarWidth > 0 && !document.getElementById("bg-rose")) {
          document.body.style.paddingRight = `${scrollbarWidth}px`;
        }
        document.body.style.overflow = "hidden";
      }
      setRendered(true);
      setClosing(false);
      frame = requestAnimationFrame(() => {
        if (resultsRef.current) resultsRef.current.scrollTop = 0;
        inputRef.current?.focus();
      });
    } else if (rendered) {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        setClosing(false);
        setRendered(false);
        unlockScroll();
      } else {
        setClosing(true);
        timer = window.setTimeout(() => {
          setClosing(false);
          setRendered(false);
          unlockScroll();
        }, 300);
      }
    }

    return () => {
      if (frame) cancelAnimationFrame(frame);
      if (timer) window.clearTimeout(timer);
    };
  }, [open, rendered]);

  useEffect(() => () => {
    const previous = scrollLockRef.current;
    if (!previous) return;
    if (previous.overflow) document.body.style.overflow = previous.overflow;
    else document.body.style.removeProperty("overflow");
    if (previous.paddingRight) document.body.style.paddingRight = previous.paddingRight;
    else document.body.style.removeProperty("padding-right");
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key !== "Tab" && event.key !== "Escape") return;
      const panel = document.getElementById("search-panel");
      const active = document.activeElement;
      const outside = !panel?.contains(active) && active?.id !== "search-switch";
      if (event.key === "Escape" || outside) onClose();
    };
    document.addEventListener("keyup", onKeyUp);
    return () => document.removeEventListener("keyup", onKeyUp);
  }, [onClose, open]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const searchParams = new URLSearchParams({
          q: query,
          collection: selectedTab,
        });
        const response = await fetch(`/api/public/search?${searchParams}`, {
          signal: controller.signal,
        });
        const payload = await response.json() as { resources?: SearchResult[] };
        setResults(payload.resources ?? []);
        setSelectedItem(0);
        setVisibleCount(5);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query, selectedTab]);

  const filteredResults = useMemo(
    () => results.filter((result) => selectedTab === "blog" ? result.path.startsWith("/blog/") : result.path.startsWith("/changelog/")),
    [results, selectedTab],
  );
  const visibleResults = filteredResults.slice(0, visibleCount);

  const selectTab = (tab: "blog" | "changelog") => {
    setSelectedTab(tab);
    setResults([]);
    setSelectedItem(0);
    setVisibleCount(5);
    window.localStorage.setItem("search-tab", tab === "blog" ? "0" : "1");
    inputRef.current?.focus();
  };

  const navigateToResult = (result: SearchResult | undefined) => {
    if (!result) return;
    onClose();
    router.push(result.path);
  };

  return (
    <>
      <div
        id="backdrop"
        className={`search-backdrop${rendered ? closing ? " fade-out" : " fade-in" : " hidden"}`}
        aria-hidden="true"
        onMouseDown={open ? onClose : undefined}
      />
      <section
        role="dialog"
        id="search-panel"
        className={`search-surface${rendered ? closing ? " fade-out" : " fade-in" : " hidden"}`}
        aria-modal="true"
        aria-hidden={!open}
        aria-labelledby="search-label"
        aria-keyshortcuts="ArrowUp,ArrowDown,Enter,Esc"
      >
        <div className="search-panel-controls">
          <div className="search-panel-topbar">
            <div className="search-panel-heading"><SiteIcon name="command-line" /><span>全站搜索</span></div>
            <button id="search-close-button" className="search-close-button" type="button" aria-label="关闭搜索" title="关闭搜索" onClick={onClose}><SiteIcon name="close-line" /></button>
          </div>
          <div role="tablist" className="search-tabs" aria-label="Search categories">
            <button type="button" role="tab" aria-selected={selectedTab === "blog"} onClick={() => selectTab("blog")}>Blog</button>
            <button type="button" role="tab" aria-selected={selectedTab === "changelog"} onClick={() => selectTab("changelog")}>Changelog</button>
          </div>
          <div className="search-input-shell">
            <SiteIcon name="search" />
            <label htmlFor="search-input" id="search-label" className="sr-only">Search {selectedTab === "blog" ? "Blog" : "Changelog"}</label>
            <input
              ref={inputRef}
              type="search"
              role="combobox"
              id="search-input"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              aria-labelledby="search-label"
              aria-autocomplete="list"
              aria-controls="search-results"
              aria-expanded={visibleResults.length > 0}
              placeholder={`Search ${selectedTab === "blog" ? "Blog" : "Changelog"}`}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.preventDefault();
                  onClose();
                  return;
                }
                if (!visibleResults.length) return;
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  setSelectedItem((value) => (value + 1) % visibleResults.length);
                } else if (event.key === "ArrowUp") {
                  event.preventDefault();
                  setSelectedItem((value) => (value - 1 + visibleResults.length) % visibleResults.length);
                } else if (event.key === "Enter") {
                  event.preventDefault();
                  navigateToResult(visibleResults[selectedItem]);
                }
              }}
            />
          </div>
        </div>
        <div ref={resultsRef} role="listbox" id="search-results" aria-labelledby="search-input" tabIndex={-1} aria-busy={loading || undefined}>
          <div id="search-content">
            {visibleResults.length > 0 ? <div className="search-result-h1">{selectedTab === "blog" ? "Blog" : "Changelog"}</div> : null}
            {visibleResults.map((result, index) => (
              <Link
                prefetch={false}
                href={result.path}
                key={result.id}
                className="search-result-item"
                role="option"
                tabIndex={-1}
                aria-selected={index === selectedItem}
                onPointerEnter={() => setSelectedItem(index)}
                onClick={onClose}
              >
                <div className="search-result-title">{result.title}</div>
                <div className="search-result-excerpt">{result.description || result.path}</div>
              </Link>
            ))}
          </div>
          <div id="search-feedback" className={loading || (query && visibleResults.length === 0) ? "" : "hidden"}>
            {loading ? "搜索中…" : query ? "没有找到匹配内容" : ""}
          </div>
          {visibleCount < filteredResults.length ? (
            <div id="search-pagination">
              <button type="button" data-action="more" onClick={() => setVisibleCount((value) => value + 5)}><SiteIcon name="arrow-cool-down" /><span>Load more</span></button>
              <button type="button" data-action="all" onClick={() => setVisibleCount(filteredResults.length)}><SiteIcon name="expand-all" /><span>Show all</span></button>
            </div>
          ) : null}
        </div>
        <footer role="note" aria-label="Keyboard shortcuts">
          <ul className="search-shortcuts">
            <li><kbd className="search-kbd-key"><SiteIcon name="arrow-upward" /></kbd><kbd className="search-kbd-key"><SiteIcon name="arrow-downward" /></kbd><span>Navigate</span></li>
            <li><kbd className="search-kbd-key"><SiteIcon name="return" /></kbd><span>Go to Page</span></li>
            <li><kbd className="search-kbd-key">esc</kbd><span>Close</span></li>
          </ul>
        </footer>
      </section>
    </>
  );
}
