# /last30days

English | [Français](README.fr.md) | [Deutsch](README.de.md) | [Español](README.es.md) | [Português (Brasil)](README.pt-BR.md) | [日本語](README.ja.md) | [简体中文](README.zh-CN.md)

<p align="center">
  <img src="media/pr-assets/last30days-ad.gif" width="720" alt="last30days - an AI agent-led search engine that searches people, not editors" />
</p>

<p align="center">
  <a href="https://github.com/mvanhorn/last30days-skill">
    <img src="https://img.shields.io/badge/%231-Repository%20Of%20The%20Day-6f42c1?style=for-the-badge&logo=github&label=GITHUB%20TRENDING" alt="GitHub Trending #1 Repository Of The Day" />
  </a>
  <br/>
  <a href="https://trendshift.io/repositories/21997" target="_blank">
    <img src="https://trendshift.io/api/badge/repositories/21997" alt="mvanhorn/last30days-skill | Trendshift" style="width: 250px; height: 55px;" width="250" height="55"/>
  </a>
</p>

**An AI agent-led search engine scored by upvotes, likes, and real money - not editors.**

This README tracks the current v3 pipeline. The runtime skill spec lives in [skills/last30days/SKILL.md](skills/last30days/SKILL.md), which is the source of truth for the latest command and setup behavior.

**Claude Code (recommended — auto-updates via marketplace):**
```
/plugin marketplace add mvanhorn/last30days-skill
/plugin install last30days
```

**Codex, Cursor, Copilot, Gemini CLI, or any of 50+ [Agent Skills](https://agentskills.io) hosts:**
```
npx skills add mvanhorn/last30days-skill -g
```
(`-g` installs globally for your user, available across all projects. Drop it to scope per-project.)

More install options (claude.ai web, OpenClaw, manual) in the [Install](#install) section below.

Zero config. Reddit, HN, Polymarket, and GitHub work immediately. Run it once and the setup wizard unlocks X, YouTube, TikTok, arXiv, Techmeme, and more in 30 seconds.

---

Reddit upvotes. X likes. YouTube transcripts. TikTok engagement. Polymarket odds backed by real money and insider information. That's millions of people voting with their attention and their wallets every day. /last30days searches all of it in parallel, scores it by what real people actually engage with, and an AI agent judge synthesizes it into one brief.

Google aggregates editors. /last30days searches people.

You can't get this search anywhere else because no single AI has access to all of it. Google search doesn't touch Reddit comments or X posts. ChatGPT has a deal with Reddit but can't search X or TikTok. Gemini has YouTube but not Reddit. Claude has none of them natively. Each platform is a walled garden with its own API, its own tokens, its own auth. But you can bring your own keys and browser sessions, and suddenly an AI agent can search all of them at once, score them against each other, and tell you what actually matters.

That's the unlock. Not one better search engine. A dozen disconnected platforms, bridged by an agent.

```
/last30days Peter Steinberger
```

You have a meeting tomorrow. You Google them. You get their LinkedIn from 2023. /last30days gives you what they're actually doing this month: joined OpenAI to work on Codex, fighting Anthropic's ban on third-party agents, shipping 23 PRs at 85% merge rate, building "LobsterOS" for cross-device agent control, and r/ClaudeCode hit 569 upvotes debating whether he's a hero or "insufferable." Scattered across X posts, Reddit threads, YouTube transcripts, and GitHub commits. None of it was on Google.

## Why this exists

I built it to keep up in AI. Everything changes every day and the Reddit and X nerds are always on top of it first. I needed better prompts, and the training data was always months behind what the community had already figured out.

But it turned into something bigger. Now I run it before a sales call to know the last 30 days truth about a business. Before a meeting to read someone's recent tweets and podcast transcripts. Before a Disney World trip to know which rides are closed and what the community says about Genie+. Before I build anything to know what problems people are actually hitting.

If you're meeting with a CEO, have you read all their tweets and YouTube transcripts from the last 30 days? I have.

## Sources, scored by the people

| Source | What the people tell you |
|--------|--------------------------|
| **Reddit** | The unfiltered take. Top comments with real upvote counts, free, no API key. The real opinions that Google buries. |
| **X / Twitter** | The hot take, the expert thread, the breaking reaction. First to know, first to argue. |
| **YouTube** | The 45-minute deep dive. Full transcripts searched for the 5 quotable sentences that matter. |
| **TikTok** | The creator reaching 3.6M people with a take you'll never find on Google. |
| **Instagram Reels** | The influencer perspective with spoken-word transcripts. The visual culture signal. |
| **Hacker News** | The developer consensus. 825 points, 899 comments. Where technical people actually argue. |
| **Polymarket** | Not opinions. Odds. Backed by real money. 96% confidence on album sales. 4% on an acquisition. |
| **GitHub** | For people: PR velocity, top repos by stars, release notes. For topics: issues and discussions. |
| **Digg** | Curated story clusters from Digg's AI 1000 leaderboard (~1000 high-signal AI accounts on X), with attributable inline quotes (no X auth required). Auto-enabled when `digg-pp-cli` is on PATH. |
| **arXiv** | The papers behind the hype. New research in the window, free, no API key. Auto-enabled when `arxiv-pp-cli` is on PATH (first-run setup installs it). |
| **Techmeme** | The tech-news editorial layer, date-windowed to your 30 days. Free, no API key. Auto-enabled when `techmeme-pp-cli` is on PATH (first-run setup installs it). |
| **LinkedIn** | The professional signal. Posts and articles, with articles weighted as high signal. |
| **StockTwits** | Trader sentiment. Auto-activates when your topic is a ticker or crypto. |
| **Threads** | The post-Twitter text layer. Conversations from creators and brands. |
| **Pinterest** | Visual discovery. Pins, saves, and comments on products and ideas. |
| **Xiaohongshu (RED)** | Chinese lifestyle, product, and creator signals. Requested explicitly with `--search xhs` when a logged-in x-mcp browser plugin or `xiaohongshu-mcp` service is running locally. |
| **Bluesky** | The decentralized social layer. AT Protocol posts from the post-Twitter migration. |
| **Perplexity** | Controlled Agent API synthesis, OpenRouter Sonar fallback, raw Search API rows, and explicit Deep Research. |
| **Web** | The editorial coverage, the blog comparisons. One signal of many, not the only one. |

Community contributors keep adding more. Truth Social and other niche sources are in the engine with more on the way.

A Reddit thread with 1,500 upvotes is a stronger signal than a blog post nobody read. A TikTok with 3.6M views tells you more about what's culturally relevant than a press release. Polymarket odds backed by $66K in volume are harder to argue with than a pundit's guess.

The synthesis ranks by what real people actually engaged with. Social relevancy, not SEO relevancy.

## What people actually use it for

**Before a meeting.** `/last30days Peter Steinberger` - joined OpenAI's Codex team, fighting Anthropic's ban on third-party agents, 23 PRs merged at 85% merge rate on GitHub, building LobsterOS for cross-device agent control. r/ClaudeCode: "Ever since OpenClaw released, it was widely known that if you run it through anything other than the API, you were gonna get banned eventually" (227 upvotes). That's not on LinkedIn.

**To read hiring signals.** `/last30days Listen Labs --hiring-signals` - current jobs and careers pages become cited evidence for focus shifts: hiring into enterprise security, customer success, infrastructure, or product expansion. The report says what the hiring appears to signal, not what the roadmap will ship.

**To find the topic before it peaks.** Ask `/last30days what's exploding in AI agents?` and the skill switches to discovery mode: the engine sweeps Reddit category listings, Hacker News front/best stories, Digg's AI 1000 feed, and X when authenticated; your agent judges the nominations (names, junk filtering, content-worthiness) and writes podcast / X-article angles; then you get 5-10 velocity-ranked topics. Every result includes cross-source numbers, a momentum label, and a ready-to-run `/last30days "<topic>"` follow-up.

**When something drops.** `/last30days Kanye West` - UK blocked his visa, Wireless Festival canceled, sponsors fled. But BULLY debuted #2 on Billboard. Fantano came back from his "Yay sabbatical" to review it (653K views). SoFi Homecoming brought out Lauryn Hill and Travis Scott for 44 songs. Polymarket: "Will Kanye tweet again?" 86% Yes. 23 Reddit threads, 17 YouTube videos, 86K upvotes.

**To compare tools.** `/last30days OpenClaw vs Hermes vs Paperclip` - "These aren't competitors, they're layers." OpenClaw is the executor (351K GitHub stars, live), Hermes is the self-improving brain (31K stars), Paperclip is the org chart (49K stars). Star counts pulled live from the GitHub API, not stale blog posts. Side-by-side table with architecture, memory, security, best-for. Per @IMJustinBrooke: "OpenClaw = Charmander, Hermes = Charizard."

**To understand the world.** `/last30days Iran vs USA` - Day 38 of the war. Trump's Tuesday deadline for Iran to reopen the Strait of Hormuz. Two US warplanes downed. Oil at $126/barrel. The IEA called it "the largest supply disruption in the history of the global oil market." Polymarket: ceasefire by Dec 31 at 74%. 27 X posts, 10 YouTube videos, 20 prediction markets.

**Before a trip.** `/last30days Universal Epic Universe` - Expansion already under construction. "Project 680" permit filed. Fireworks show confirmed by infrastructure but unannounced. Wait times: Mine-Cart Madness averaging 148 minutes. No annual pass yet, and locals are frustrated. Stardust Racers down for refurbishment through April 5.

**To learn something fast.** `/last30days Nano Banana Pro prompting` - JSON-structured prompts are replacing tag soup. @pictsbyai's nested format prevents "concept bleeding." Edit-first workflow beats regeneration. Then it writes you a production prompt using exactly what the community said works.

## What's new

Since the v3.3 announcement in May, as of v3.11.1 (July 2026): 175 merged PRs - 122 of them from 52 community contributors - across 15 releases. This is what landed.

### First-class on OpenAI Codex

/last30days is now a native Codex plugin with guided setup - not a port, a first-class citizen. Renderer-aware citations mean Codex output reads like a brief instead of URL soup (#694), and the same engine runs on Claude Code, Cursor, Copilot, Gemini CLI, Claude Desktop, OpenClaw, and 50+ Agent Skills hosts. Codex plugin manifest by [@rfoust](https://github.com/rfoust) (#686), Codex auth fix by [@tmchow](https://github.com/tmchow) (#698).

### arXiv, Techmeme, and Digg - free, no API keys

arXiv brings the papers behind the hype and Techmeme brings the editorial tech-news layer - free, zero keys, and first-run setup installs their CLIs so they activate automatically (#709). Digg's AI 1000 story clusters arrive without X auth the same way - setup installs the free Digg CLI for you (#590). Trustpilot ships opt-in for consumer-brand research.

### Free Reddit grew real scores and top comments

Reddit's public .json API died; the free path came back stronger. Keyless RSS + shreddit scraping (#457), dedicated-subreddit discovery with real upvote counts via arctic-shift (#696), and a relevance floor so a viral off-topic post can't hijack your brief (#488, thanks [@rzachsmith](https://github.com/rzachsmith)). No API key. Real scores. Top comments included.

### The best comments in every brief

Comments are now a default-on layer across sources: Instagram comments with rank-based diversity so five hot takes don't all come from one post (#751), YouTube comments plus a ScrapeCreators transcript backup for when yt-dlp strikes out (#637), and crowd-voted comments weighted into Best Takes so the community's funniest lines survive scoring (#592, #608).

### One doctor command

Ask for a health check and the doctor runs every source, then prescribes exact fixes - which key is missing, which CLI is off PATH, which cookie expired (#753). No more guessing why X came back thin.

### X search, rebuilt

The X pipeline got a ground-up overhaul: FROM and ABOUT lanes so a person's own posts and the conversation about them both rank (#610), person-aware subquery disambiguation (#611), first-party authorship grounding with interaction-signal ranking (#613), and a single X source with automatic backend failover (#622). Plus an honest `--diagnose` that actually probes auth (#609).

### More sources joined

LinkedIn via ScrapeCreators, with articles as high signal ([@ravstr](https://github.com/ravstr), #702). StockTwits auto-activates for ticker and crypto topics ([@wtiwana](https://github.com/wtiwana), #658). Perplexity grew direct API modes and async Deep Research ([@sk-holmes](https://github.com/sk-holmes), #629).

### Hardened by the community

The security wave was almost entirely community work: stored-XSS fixes in the HTML renderer ([@iliaal](https://github.com/iliaal), [@aaronjmars](https://github.com/aaronjmars)), locked-down cookie temp files, supply-chain-hardened CI with OpenSSF Scorecard and build provenance attestation ([@shaanmajid](https://github.com/shaanmajid), [@hammadxcm](https://github.com/hammadxcm), [@aniruddh909](https://github.com/aniruddh909)), Semgrep and OSV-Scanner scans plus a PR dependency-review gate ([@23241a6749](https://github.com/23241a6749)), a test-coverage floor introduced at 60% and since raised to 84% ([@gourab5139014](https://github.com/gourab5139014)), and a Hermes security scan cleared of every CRITICAL finding (#768).

### Reaches further

Hebrew and non-Latin languages ([@dudyme](https://github.com/dudyme)). CJK-aware tokenization for Chinese sources ([@An-idd](https://github.com/An-idd)). A Windows compatibility wave. Cookie extraction across the full Chromium family - Brave, Edge, Vivaldi, Opera, Arc ([@andrey-esipov](https://github.com/andrey-esipov)) - plus macOS Keychain and Linux pass(1) credential sources. `--as-of` historical lookback ([@chiyi-creator](https://github.com/chiyi-creator)). Auto-provisioned Python 3.12 via uv ([@buntysomroy](https://github.com/buntysomroy)). `--hiring-signals` for reading a company's job pages. Watchlist deltas between runs.

### Still in the box from v3

The v3 foundations are all still here: the pre-research brain that resolves the right handles, subreddits, and hashtags before a single API call fires (built by [@j-sperling](https://github.com/j-sperling)); Best Takes scoring for humor and virality alongside relevance; cross-source cluster merging; single-pass comparisons ("CLI vs MCP" in 3 minutes, not 12); auto-discovered `-

> _README 过长已截断, 完整内容请查看 GitHub 仓库。_
