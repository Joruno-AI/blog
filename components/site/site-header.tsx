"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen, Camera, Code2, Disc3, FileText, Github, Home, Menu, Moon,
  Rss, Search, Shapes, StickyNote, Sun, X,
} from "lucide-react";
import { useEffect, useState } from "react";

const navigation = [
  { href: "/", label: "Home", icon: Home },
  { href: "/blog", label: "Blog", icon: FileText },
  { href: "/docs", label: "Docs", icon: BookOpen },
  { href: "/projects", label: "Projects", icon: Code2 },
  { href: "/agent", label: "Agent", icon: Shapes },
  { href: "/photos", label: "Photos", icon: Camera },
  { href: "/shorts", label: "Shorts", icon: StickyNote },
  { href: "/music", label: "Music Player", icon: Disc3 },
] as const;

const logoPaths = [
  "M66 229C40 223 11 195 0 152C-23 66 20 -3 95 -16C176 -30 259 -6 336 122C391 213 488 412 521 490C546 549 541 593 528 615C521 627 512 628 504 616C472 567 386 396 332 285C265 146 192 -6 102 15C71 22 32 67 81 209C87 226 80 232 66 229Z",
  "M1093 85C1105 111 1101 138 1096 150C1092 159 1085 157 1081 148C1049 75 998 8 958 11C926 13 914 52 933 107C951 160 999 228 1046 281C1076 315 1051 362 1033 383C1025 393 1016 390 1003 381C965 355 930 338 895 333C915 386 933 459 898 458C858 457 760 325 834 293C813 255 784 236 756 231C756 237 758 242 758 247C763 320 734 326 710 357C689 384 673 394 643 391C583 386 520 330 482 261C439 182 424 95 467 36C506 -17 558 -19 594 -7C668 17 730 120 750 205C805 207 846 241 874 286C906 286 950 296 995 325C953 276 890 202 870 135C845 53 876 -14 953 -18C1008 -21 1066 25 1093 85ZM694 247C675 263 666 288 669 313C673 342 695 350 699 317C701 300 700 276 694 247ZM685 218C678 193 666 166 650 136C600 45 538 9 512 32C486 55 500 146 543 222C565 260 593 293 620 316C621 280 646 240 685 218Z",
  "M1266 81C1258 23 1284 -18 1349 -18C1408 -18 1470 33 1499 89C1513 117 1512 144 1508 152C1504 161 1495 160 1490 151C1451 81 1400 15 1358 13C1322 11 1318 53 1344 110C1367 161 1417 236 1439 281C1463 331 1455 375 1440 393C1432 403 1425 401 1415 387C1383 344 1354 275 1291 173C1237 86 1182 16 1143 19C1120 21 1117 57 1138 106C1159 154 1179 194 1216 253C1252 310 1257 355 1235 388C1227 397 1217 398 1209 387C1144 296 1093 198 1071 132C1049 66 1051 -8 1122 -13C1178 -17 1231 34 1266 81Z",
  "M1634 294C1645 330 1646 364 1631 389C1625 399 1617 400 1610 389C1547 296 1470 157 1450 94C1434 44 1440 11 1460 -9C1469 -18 1475 -14 1479 -5C1522 89 1566 185 1625 249C1689 319 1747 347 1757 343C1775 335 1687 229 1654 131C1625 44 1645 -18 1730 -18C1788 -18 1851 33 1878 89C1892 118 1894 141 1887 152C1882 160 1875 160 1870 151C1832 81 1783 15 1742 13C1706 11 1700 58 1726 116C1749 168 1798 242 1819 286C1844 338 1813 387 1780 392C1747 397 1679 342 1634 294Z",
  "M2200 215C2204 220 2204 225 2197 225C2189 225 2183 223 2177 223C2178 231 2178 238 2179 246C2185 318 2155 325 2132 356C2112 383 2095 392 2064 390C2004 386 1943 328 1905 260C1860 180 1845 93 1889 35C1929 -17 1979 -21 2015 -9C2089 16 2152 117 2173 202C2183 203 2193 207 2200 215ZM2114 242C2098 257 2087 286 2092 313C2097 342 2117 348 2122 316C2125 298 2122 273 2114 242ZM2107 215C2099 191 2087 163 2072 135C2023 43 1962 8 1934 31C1908 53 1923 145 1965 221C1986 259 2015 292 2042 315C2043 278 2067 243 2088 227C2094 222 2100 218 2107 215Z",
];

function JorunoLogo() {
  return <svg viewBox="-120 -100 2480 900" aria-hidden="true" className="logo-svg"><g className="logo-word logo-ink" transform="translate(24 650) scale(1 -1)">{logoPaths.map((path) => <path key={path} pathLength="1" d={path} />)}</g></svg>;
}

export function SiteHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [dark, setDark] = useState(false);

  useEffect(() => setMenuOpen(false), [pathname]);
  useEffect(() => {
    const root = document.documentElement;
    setDark(root.classList.contains("dark"));
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setSearchOpen(true); }
      if (event.key === "Escape") { setSearchOpen(false); setMenuOpen(false); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const toggleTheme = () => {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
    setDark(next);
  };
  const isActive = (href: string) => href === "/" ? pathname === "/" : pathname.startsWith(href);

  return <>
    <header className="nav-header">
      <div className="logo-wrapper"><Link className="site-link logo-link" href="/" aria-label="Joruno · Joruno Jobāna" aria-current={pathname === "/" ? "page" : undefined}><span className="logo-container"><JorunoLogo /></span></Link></div>
      <nav className="main-nav" aria-label="Main menu">
        <div className="desktop-nav-items">
          {navigation.map(({ href, label, icon: Icon }) => <Link className="nav-icon-link" href={href} key={href} title={label} aria-label={label} aria-current={isActive(href) ? "page" : undefined}><Icon aria-hidden="true" /></Link>)}
          <a className="nav-icon-link" href="https://github.com/Joruno-AI" title="GitHub Profile" aria-label="GitHub Profile" rel="noopener noreferrer me" target="_blank"><Github aria-hidden="true" /></a><span className="nav-divider" aria-hidden="true" />
        </div>
        <button type="button" className="nav-icon-link" title="Search" aria-label="Search" onClick={() => setSearchOpen(true)}><Search aria-hidden="true" /></button>
        <button type="button" className="nav-icon-link" title="Toggle theme" role="switch" aria-label="Dark mode" aria-checked={dark} onClick={toggleTheme}>{dark ? <Moon aria-hidden="true" /> : <Sun aria-hidden="true" />}</button>
        <a className="nav-icon-link desktop-only" href="/rss.xml" title="RSS feed" aria-label="RSS feed" target="_blank"><Rss aria-hidden="true" /></a>
        <button type="button" className="nav-icon-link mobile-menu-button" aria-label={menuOpen ? "收起导航菜单" : "打开导航菜单"} aria-expanded={menuOpen} aria-controls="nav-panel" onClick={() => setMenuOpen((value) => !value)}>{menuOpen ? <X /> : <Menu />}</button>
        <div id="nav-panel" className={menuOpen ? "visible" : ""} aria-hidden={!menuOpen}>
          {navigation.map(({ href, label, icon: Icon }) => <Link href={href} key={href} aria-current={isActive(href) ? "page" : undefined}><Icon aria-hidden="true" /><span>{label}</span></Link>)}
          <a href="https://github.com/Joruno-AI" target="_blank" rel="noopener noreferrer me"><Github aria-hidden="true" /><span>GitHub</span></a><a href="/rss.xml" target="_blank"><Rss aria-hidden="true" /><span>RSS</span></a>
        </div>
      </nav>
    </header>
    {searchOpen ? <SearchPanel onClose={() => setSearchOpen(false)} /> : null}
  </>;
}

function SearchPanel({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Array<{ id: string; path: string; title: string; description?: string | null }>>([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/public/search?q=${encodeURIComponent(query)}`, { signal: controller.signal });
        const payload = await response.json() as { resources?: typeof results };
        setResults(payload.resources ?? []);
      } catch (error) { if (!(error instanceof DOMException && error.name === "AbortError")) setResults([]); }
      finally { setLoading(false); }
    }, 180);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [query]);
  return <div className="search-backdrop" role="presentation" onMouseDown={onClose}><section className="search-panel" role="dialog" aria-modal="true" aria-label="全站搜索" onMouseDown={(event) => event.stopPropagation()}><header><span>全站搜索</span><button type="button" onClick={onClose} aria-label="关闭搜索"><X /></button></header><label className="search-input-shell"><Search aria-hidden="true" /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索 Blog 与 Changelog" /></label><div className="search-results" aria-live="polite">{loading ? <p>搜索中…</p> : null}{!loading && query && results.length === 0 ? <p>没有找到匹配内容</p> : null}{results.map((result) => <Link href={result.path} key={result.id} onClick={onClose}><strong>{result.title}</strong>{result.description ? <span>{result.description}</span> : null}</Link>)}</div><footer><kbd>⌘ K</kbd> 打开 · <kbd>Esc</kbd> 关闭</footer></section></div>;
}
