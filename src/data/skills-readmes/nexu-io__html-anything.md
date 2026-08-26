# HTML Anything

<p align="center"><sub>From the team behind <a href="https://github.com/nexu-io/open-design"><b>Open Design</b></a> — <b>40k★ · 200+ contributors</b>, production-grade and iterating faster. html-anything is the focused agent-era HTML editor; if it clicks for you, <a href="https://github.com/nexu-io/open-design">Open Design</a> is where the same team ships at scale.</sub></p>

<p align="center"><b>Live page:</b> <a href="https://open-design.ai/html-anything/"><b>open-design.ai/html-anything/</b></a> — overview, surface modes, and showcase before you clone.</p>

> **Markdown is the draft. HTML is what humans read. Your local agent writes it.** The agentic HTML editor — in the agentic era, you don't hand-edit docs anymore, so the output format should be what the reader actually wants: HTML. Local-first, zero API key, reuses the CLI session you already have logged in — **9 coding-agent CLIs** auto-detected on your `PATH` (Claude Code · Cursor Agent · Codex · Gemini CLI · GitHub Copilot CLI · OpenCode · Qwen Coder · Aider · IBM Bob), driven by **75 composable skill templates** across **9 deliverable surfaces** (magazine articles · keynote decks · résumés · posters · Xiaohongshu cards · tweet cards · web prototypes · data reports · Hyperframes videos). One-click export to WeChat / X / Zhihu, or download `.html` / `.png`.

<p align="center">
  <img src="docs/assets/banner.png" alt="HTML Anything — the agentic HTML editor, on your laptop" width="100%" />
</p>

<p align="center">
  <a href="LICENSE"><img alt="License" src="https://img.shields.io/badge/license-Apache%202.0-blue.svg?style=flat-square" /></a>
  <a href="#supported-coding-agents"><img alt="Agents" src="https://img.shields.io/badge/agents-9%20CLIs-black?style=flat-square" /></a>
  <a href="#skills"><img alt="Skills" src="https://img.shields.io/badge/skills-75-orange?style=flat-square" /></a>
  <a href="#export-targets"><img alt="Export" src="https://img.shields.io/badge/export-WeChat%20%C2%B7%20X%20%C2%B7%20Zhihu%20%C2%B7%20PNG-9b59b6?style=flat-square" /></a>
  <a href="#quickstart"><img alt="Quickstart" src="https://img.shields.io/badge/quickstart-30%20seconds-green?style=flat-square" /></a>
  <a href="#architecture"><img alt="No API key" src="https://img.shields.io/badge/no-API%20key%20required-ff6b35?style=flat-square" /></a>
</p>

<!-- This project is built on top of nexu-io/open-design — the badges below link to its community channels on purpose. -->
<p align="center">
  <a href="https://discord.gg/keeVPMrueT"><img alt="Discord (html-anything)" src="https://img.shields.io/badge/discord-html--anything-5865f2?style=flat-square&logo=discord&logoColor=white" /></a>
  <a href="https://x.com/nexudotio"><img alt="Follow @nexudotio on X" src="https://img.shields.io/badge/follow-%40nexudotio-000000?style=flat-square&logo=x&logoColor=white" /></a>
  <a href="https://github.com/nexu-io/open-design/releases/latest"><img alt="open-design release" src="https://img.shields.io/github/v/release/nexu-io/open-design?style=flat-square&label=release&color=8e44ad" /></a>
  <a href="https://github.com/nexu-io/open-design/graphs/commit-activity"><img alt="open-design commits / month" src="https://img.shields.io/github/commit-activity/m/nexu-io/open-design?style=flat-square&label=commits%2Fmonth&color=f39c12" /></a>
  <a href="#showcase"><img alt="Design systems" src="https://img.shields.io/badge/design%20systems-9-1abc9c?style=flat-square" /></a>
  <a href="https://github.com/nexu-io/open-design"><img alt="Built on open-design" src="https://img.shields.io/badge/built%20on-nexu--io%2Fopen--design-ff7043?style=flat-square&logo=github&logoColor=white" /></a>
</p>

<p align="center"><b>English</b> · <a href="README.zh-CN.md">简体中文</a></p>

---

## Showcase

The eight skills that surface at the top of the picker's **Featured / 推荐** group — sorted by their `recommended:` rank in `SKILL.md` frontmatter (lower = higher). Each ships a real `example.html` you can open straight from the repo, no auth, no setup.

<table>
<tr>
<td width="50%" valign="top">
<a href="next/src/lib/templates/skills/deck-guizang-editorial/"><img src="docs/screenshots/skills/deck-guizang-editorial.png" alt="deck-guizang-editorial" /></a><br/>
<sub><b><a href="next/src/lib/templates/skills/deck-guizang-editorial/"><code>deck-guizang-editorial</code></a></b> · <i>deck</i> · <code>recommended: 1</code><br/>Magazine × e-ink editorial deck, inspired by <a href="https://github.com/op7418/guizang-ppt-skill"><code>op7418/guizang-ppt-skill</code></a> — 10 locked layouts × 5 palettes (Ink / Indigo Porcelain / Forest Ink / Kraft / Dune). Reads like a printed art-zine, not a slide deck.</sub>
</td>
<td width="50%" valign="top">
<a href="next/src/lib/templates/skills/deck-swiss-international/"><img src="docs/screenshots/skills/deck-swiss-international.png" alt="deck-swiss-international" /></a><br/>
<sub><b><a href="next/src/lib/templates/skills/deck-swiss-international/"><code>deck-swiss-international</code></a></b> · <i>deck</i> · <code>recommended: 2</code><br/>Swiss International deck — 16-column grid + one saturated accent (Klein Blue / Lemon / Mint / Safety Orange) across 22 locked layouts. Cold, rational, institutional. The deck that reads "a designer made this" the moment it opens.</sub>
</td>
</tr>
<tr>
<td width="50%" valign="top">
<a href="next/src/lib/templates/skills/doc-kami-parchment/"><img src="docs/screenshots/skills/doc-kami-parchment.png" alt="doc-kami-parchment" /></a><br/>
<sub><b><a href="next/src/lib/templates/skills/doc-kami-parchment/"><code>doc-kami-parchment</code></a></b> · <i>doc</i> · <code>recommended: 3</code><br/>Warm-parchment editorial document, inspired by <a href="https://github.com/tw93/kami"><code>tw93/kami</code></a>. <code>#f5f4ed</code> ground + ink-blue accent + single serif voice — a noticeably calmer reading surface than plain-white markdown for long essays, reports, and one-pagers.</sub>
</td>
<td width="50%" valign="top">
<a href="next/src/lib/templates/skills/magazine-poster/"><img src="docs/screenshots/skills/magazine-poster.png" alt="magazine-poster" /></a><br/>
<sub><b><a href="next/src/lib/templates/skills/magazine-poster/"><code>magazine-poster</code></a></b> · <i>poster</i> · <code>recommended: 4</code><br/>Newsprint Sunday-paper poster — oversized serif headline, two-column body, six numbered sections, dot-pattern cream ground. Reads like a printed broadsheet, not a webpage.</sub>
</td>
</tr>
<tr>
<td width="50%" valign="top">
<a href="next/src/lib/templates/skills/video-hyperframes/"><img src="docs/screenshots/skills/video-hyperframes.png" alt="video-hyperframes" /></a><br/>
<sub><b><a href="next/src/lib/templates/skills/video-hyperframes/"><code>video-hyperframes</code></a></b> · <i>frame / video</i> · <code>recommended: 5</code><br/>Hyperframes / Remotion-compatible storyboard — 6–10 sequential <code>1920×1080</code> frames with hidden duration + transition markers and an auto-play script. Hand straight to <a href="https://github.com/heygen-com/hyperframes"><code>heygen-com/hyperframes</code></a> or Remotion to render <code>.mp4</code>.</sub>
</td>
<td width="50%" valign="top">
<a href="next/src/lib/templates/skills/frame-glitch-title/"><img src="docs/screenshots/skills/frame-glitch-title.png" alt="frame-glitch-title" /></a><br/>
<sub><b><a href="next/src/lib/templates/skills/frame-glitch-title/"><code>frame-glitch-title</code></a></b> · <i>frame</i> · <code>recommended: 6</code><br/>Glitch title frame — cyan/magenta chromatic offset, CRT scanlines, corrupted-data subtitle, ASCII noise in the corners. Cyberpunk hero card or video transition.</sub>
</td>
</tr>
<tr>
<td width="50%" valign="top">
<a href="next/src/lib/templates/skills/vfx-text-cursor/"><img src="docs/screenshots/skills/vfx-text-cursor.png" alt="vfx-text-cursor" /></a><br/>
<sub><b><a href="next/src/lib/templates/skills/vfx-text-cursor/"><code>vfx-text-cursor</code></a></b> · <i>vfx</i> · <code>recommended: 7</code><br/>VFX text-cursor opener — a cursor "types" across the canvas, each character revealed with a hot-pink × cyan chromatic trail and directional light leaks. Drop in a quote, get a film-grade opening frame.</sub>
</td>
<td width="50%" valign="top">
<a href="next/src/lib/templates/skills/frame-logo-outro/"><img src="docs/screenshots/skills/frame-logo-outro.png" alt="frame-logo-outro" /></a><br/>
<sub><b><a href="next/src/lib/templates/skills/frame-logo-outro/"><code>frame-logo-outro</code></a></b> · <i>frame</i> · <code>recommended: 8</code><br/>Logo outro frame — logo assembles piece-by-piece with glow bloom, tagline rises, CTA appears. The closing card for a product reveal or brand film.</sub>
</td>
</tr>
</table>

The full skill catalog (organized by mode) is in [Skills](#skills) below.

## Why this exists

Anthropic's [Claude Code team announced](https://x.com/trq212/status/2052809885763747935) they stopped writing internal docs in Markdown — they ship HTML now. The argument is simple:

| Markdown | HTML |
|---|---|
| Good for the writer | Good for the reader |
| Layout limited to the renderer | Layout is yours |
| Looks ugly screenshotted into a tweet | Already looks like a designed image |
| Has to be re-flowed for WeChat / Zhihu / newsletter | One-click format conversion |

**HTML is the final form for humans. Markdown is just an intermediate state during writing.**

But "writing HTML" used to mean writing CSS, picking type scales, snapping to a grid, doing responsive — most users won't, designers won't bother, writers don't have the patience. So what we built: after you press ⌘+Enter, your **local AI agent** turns any input (Markdown / CSV / Excel / JSON / SQL / raw notes) into a **ship-ready single-file HTML** in seconds, then one-click sends it to WeChat / X / Zhihu / anywhere. "Ship-ready" is the bar — when generation finishes, the artifact is what your audience actually sees. No "I'll touch it up later" pass.

We stand on four open-source shoulders:

- [**`nexu-io/open-design`**](https://github.com/nexu-io/open-design) — the agent-detection layer, the design-system model, and the `SKILL.md` protocol. `next/src/lib/agents/` and `next/src/lib/templates/skills/*` mirror this architecture directly.
- [**`mdnice/markdown-nice`**](https://github.com/mdnice/markdown-nice) — proof that `juice`-inlined CSS pastes cleanly into WeChat and Zhihu without per-platform manual fix-up.
- [**`gcui-art/markdown-to-image`**](https://github.com/gcui-art/markdown-to-image) — the iframe → high-DPI PNG export path.
- [**`alchaincyf/huashu-md-html`**](https://github.com/alchaincyf/huashu-md-html) — the anti-AI-slop discipline that maps into the hard constraints inside every `SKILL.md` (CJK-first font stack, 8 px baseline grid, contrast ≥ 4.5, must-use-real-data rule).

## At a glance

| | What you get |
|---|---|
| **Coding-agent CLIs (8)** | Claude Code · Cursor Agent · OpenAI Codex · Gemini CLI · GitHub Copilot CLI · OpenCode · Qwen Coder · Aider — scanned on startup across `PATH` (including `~/.local/bin`, `~/.bun/bin`, `/opt/homebrew/bin`, `~/.npm-global/bin` — directories a GUI-launched Node process normally misses), swap from the top-bar picker. |
| **Zero API key** | We reuse the session you already have logged in via `claude login` · `cursor login` · `gemini auth`. Your existing subscription does the work; marginal cost is **$0**. |
| **75 skill templates** | `prototype` (web / SaaS landing / dashboard / data report) · `deck` (20 keynote skills incl. Swiss International, Guizang Editorial, XHS Pastel, Hermes Cyber, Replit, Magazine Web…) · `frame` (10 Hyperframes video frames — liquid hero, NYT data chart, sticky-note flowchart, glitch title, cinema light-leak, macOS notification, logo outro…) · `social` (X / Xiaohongshu / Spotify / Reddit cards) · `office` (PM spec · eng runbook · finance report · HR onboarding · invoice · OKRs · weekly update · meeting notes · kanban) · `doc` (Kami warm-parchment editorial) · `mockup` (3D device frame) · `vfx` (text-cursor effect). |
| **9 surface modes** | 📖 magazine article · 🎬 keynote deck · 📄 résumé · 🖼️ poster · 📱 Xiaohongshu card · 🐦 tweet card · 🛠️ web prototype · 📊 data report · 🎞️ Hyperframes video. Each has multiple skills you can pick from. |
| **One-click export** | `juice` inlines CSS → WeChat paste with zero re-formatting · `modern-screenshot` renders the iframe to a 2× PNG → `ClipboardItem` → drop straight into the tweet composer · `<mjx-container>` → `data-eeimg` placeholder → Zhihu equations render automatically · standalone `.html` download · high-DPI `.png` download. |
| **Streaming render** | `POST /api/convert` over SSE. The agent's stdout JSON-line stream is parsed for text deltas → server-sent events → client appends → iframe `srcdoc` updates live. Waiting for an AI generation looks like watching it type in real time. |
| **Sandboxed preview** | `<iframe sandbox="allow-scripts allow-same-origin">`. User-emitted HTML runs in an isolated origin — Tailwind CDN / Google Fonts / inline scripts work, but cookies and localStorage are quarantined from the host. |
| **Format auto-detect** | The editor accepts Markdown / CSV / TSV / JSON / SQL / plain text. `papaparse` + `xlsx` parse tabular data in the browser — nothing is uploaded. |
| **Deployable to** | Local (`pnpm -F @html-anything/next dev`) · Vercel for the web layer (the agent always stays on your laptop). |
| **License** | Apache-2.0 |

## Demo

<table>
<tr>
<td width="50%">
<img src="docs/screenshots/01-entry-view.png" alt="01 · Entry view" /><br/>
<sub><b>Entry view</b> — the top bar shows your installed CLIs, the left pane is the editor, the middle is the template + design-system picker, the right is a live iframe preview. The same surface produces magazines, decks, posters, web prototypes, and Hyperframes frame scripts.</sub>
</td>
<td width="50%">
<img src="docs/screenshots/02-template-picker.png" alt="02 · 75 skills, searchable and filterable" /><br/>
<sub><b>75 templates, searchable and filterable</b> — pick by mode (prototype / deck / frame / social / office / doc) × scenario (design / marketing / engineering / product / personal). Every skill ships an <code>example.html</code> you can open straight from the repo to see what the agent will produce.</sub>
</td>
</tr>
<tr>
<td width="50%">
<img src="docs/screenshots/03-streaming.png" alt="03 · Live SSE streaming" /><br/>
<sub><b>SSE streaming</b> — agent stdout JSON-line is parsed for text deltas, appended into the iframe <code>srcdoc</code> in real time. You watch the page render line by line. Don't like where it's going? Interrupt and re-prompt — no wasted full generation.</sub>
</td>
<td width="50%">
<img src="docs/screenshots/04-export.png" alt="04 · One-click export" /><br/>
<sub><b>One-click export</b> — WeChat (juice-inlined CSS) · X / Weibo / Xiaohongshu (modern-screenshot → 2× PNG → <code>ClipboardItem</code>) · Zhihu (LaTeX image placeholders) · download <code>.html</code> · download <code>.png</code>.

> _README 过长已截断, 完整内容请查看 GitHub 仓库。_
