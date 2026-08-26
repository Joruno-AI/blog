<p align="center">
  <a href="https://github.com/eugeniughelbur/obsidian-second-brain">
    <img src="media/banner.png" alt="obsidian-second-brain: one brain, eight platforms, 46 commands. A cross-platform skill for Obsidian that runs on Claude Code, Codex, Gemini, OpenCode, Antigravity, Hermes, Pi, and Grok Bot." width="100%" />
  </a>
</p>

<p align="center">
  <a href="#install"><img src="https://img.shields.io/badge/Claude_Code-D97757?style=for-the-badge&logo=anthropic&logoColor=white" alt="Claude Code" /></a>
  <a href="#grok-bot"><img src="https://img.shields.io/badge/Grok_Bot-000000?style=for-the-badge&logo=x&logoColor=white" alt="Grok Bot" /></a>
  <a href="#codex-cli--gemini-cli--opencode"><img src="https://img.shields.io/badge/Codex_CLI-412991?style=for-the-badge&logo=openai&logoColor=white" alt="Codex CLI" /></a>
  <a href="#codex-cli--gemini-cli--opencode"><img src="https://img.shields.io/badge/Gemini_CLI-4285F4?style=for-the-badge&logo=googlegemini&logoColor=white" alt="Gemini CLI" /></a>
  <a href="#codex-cli--gemini-cli--opencode"><img src="https://img.shields.io/badge/OpenCode-181818?style=for-the-badge&logo=opensourceinitiative&logoColor=white" alt="OpenCode" /></a>
</p>

<p align="center">
  <strong>Your vault is the memory. Claude, Grok Bot, Codex - same brain.</strong>
  <br />
  <em>Your vault outlives whichever CLI you switch to.</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Obsidian-Vault-7C3AED?style=for-the-badge&logo=obsidian&logoColor=white" alt="Obsidian Vault" />
  <img src="https://img.shields.io/github/v/release/eugeniughelbur/obsidian-second-brain?style=for-the-badge&color=green" alt="Release" />
  <img src="https://img.shields.io/badge/license-MIT-blue?style=for-the-badge" alt="License: MIT" />
  <img src="https://img.shields.io/github/stars/eugeniughelbur/obsidian-second-brain?style=for-the-badge&color=yellow" alt="Stars" />
  <a href="https://github.com/sponsors/eugeniughelbur"><img src="https://img.shields.io/badge/Sponsor-EA4AAA?style=for-the-badge&logo=github-sponsors&logoColor=white" alt="Sponsor" /></a>
</p>

<h1 align="center">obsidian-second-brain: AI second brain for Obsidian - persistent memory for Claude Code and Grok Bot</h1>

<p align="center">
  <strong>An evolution of <a href="https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f">Karpathy's LLM Wiki pattern</a>: a vault that rewrites itself.</strong>
  <br /><br />
  <em>Every source updates existing pages instead of just appending new ones. Contradictions reconcile automatically. Your vault compounds while you sleep.</em>
  <br /><br />
  <strong>Powered by <a href="references/freshness-policy.md">OKM - Open Knowledge Metabolism</a>:</strong> <em>every stored fact is timeless, dated, or a pointer - so your knowledge base never fills with facts that used to be true.</em>
  <br /><br />
  <strong>Built for</strong> <em>developers &middot; founders and operators &middot; writers &middot; researchers - <a href="#choose-your-preset">pick a preset at setup</a></em>
  <br /><br />
  <strong>Start with three:</strong> <em><code>/obsidian-init</code> to set up, <code>/obsidian-save</code> to capture, <code>/obsidian-find</code> to recall. The other 42 are there when you need them.</em>
  <br /><br />
  <em>auto-synthesis &middot; thinking tools that argue with you</em>
  <br /><br />
  <em>live research from X, the web, and YouTube &middot; 4 scheduled agents &middot; 4 role presets</em>
  <br /><br />
  <em>write-time AI-first validator &middot; <code>/create-command</code> interview flow &middot; multilingual trigger schema</em>
  <br /><br />
  <a href="#install"><strong>Install &rarr;</strong></a> &middot;
  <a href="DEMOS.md">Demos</a> &middot;
  <a href="#what-happens-when-you-install-this">See it in action</a> &middot;
  <a href="#45-commands">All commands</a> &middot;
  <a href="#choose-your-preset">Presets</a> &middot;
  <a href="#the-vault-is-alive">OKM</a> &middot;
  <a href="https://github.com/eugeniughelbur/obsidian-second-brain/discussions">Discussions</a>
</p>

<p align="center">
  <a href="DEMOS.md">
    <img src="media/obsidian-save.gif" alt="One /obsidian-save command turns a conversation into five cross-linked AI-first notes: a person, a project with the decision, a task, a board card, and the daily note." width="100%" />
  </a>
  <br />
  <em>One <code>/obsidian-save</code> - five cross-linked notes. Real footage, synthetic vault. <a href="DEMOS.md">More demos &rarr;</a></em>
  <br /><br />
  <em>If this looks useful, <a href="https://github.com/eugeniughelbur/obsidian-second-brain">star the repo</a>. It is how other people find it.</em>
</p>

<p align="center">
  <strong>v0.14 - The Harvest (July 2026):</strong> we scanned all 408 forks of this repo and shipped the best ideas back upstream, crediting every author.<br/>
  <em>Multi-turn /obsidian-brainstorm, bounded vault recall, full-page source reading, Brave + Tavily sources, a guarded updater, supersession-aware search, secret detection, pt-BR triggers - and one Agent Skills build serving Codex, OpenCode, Antigravity, and Copilot CLI (v0.13). 198-test CI wall.</em>
  <a href="CHANGELOG.md">See the changelog &rarr;</a>
</p>

---

## The Problem

You use Claude every day. Every session starts from scratch. You re-explain everything. The conversation ends. Everything disappears. Claude Code has no persistent memory across sessions - and neither does Grok Bot, Codex, Gemini, or any of the others.

You take notes in Obsidian. Hundreds of files. They just sit there. You make the same decision twice because you forgot you made it six months ago. Ideas rot in daily notes. Nobody connects the dots.

**Two powerful tools. Completely disconnected.** You already have the long-term memory. The thing doing the thinking cannot reach it.

---

## How this extends Karpathy's LLM Wiki

Karpathy's pattern is brilliant. Drop sources, LLM creates wiki pages, ask questions. This skill takes it further:

| | Karpathy's LLM Wiki | obsidian-second-brain |
|---|---|---|
| **New sources** | Append new pages, cross-reference | **Rewrite existing pages.** People get updated, claims revised, stale facts replaced. |
| **Contradictions** | Flagged, you resolve manually | `/obsidian-reconcile` resolves them automatically |
| **Patterns** | Surface when you ask | `/obsidian-synthesize` finds unnamed patterns and writes synthesis pages on its own |
| **When it runs** | On demand, when you prompt | 4 scheduled agents: morning brief, nightly consolidation, weekly review, vault-health check |
| **Note format** | Human-readable wiki pages | AI-first: `## For future agent` preamble + frontmatter for LLM retrieval, not human review |

If Karpathy's wiki is a knowledge base you maintain with an LLM, this is a knowledge base that maintains itself.

---

## What Happens When You Install This

**After a meeting:** `/obsidian-save`
Claude pulls out every decision, person, task, and idea and saves each one to the right note. You do nothing.

**You recorded a voice memo:** `/obsidian-ingest meeting.m4a`
Claude transcribes it with a local Whisper install, attributes speakers where the transcript makes them identifiable, extracts every promise and action item, and distributes across entity pages, task boards, and the daily note.

**You screenshot a whiteboard:** `/obsidian-ingest photo.png`
Claude reads the image, extracts text and structure, creates concept notes, links to related projects. A photo becomes knowledge.

**You find a great video:** `/obsidian-ingest https://youtube.com/...`
Claude doesn't summarize into one note. It REWRITES your existing pages. People get updated. Contradictions get resolved. Patterns trigger new synthesis pages. One URL in. The vault is smarter.

**Before a big decision:** `/obsidian-challenge`
Claude searches your vault for past failures and reversed decisions on the same topic. Pushes back with your own words. Your vault holds you accountable.

**You want to see the big picture:** `/obsidian-visualize`
Claude generates a visual canvas of your entire vault. Hub nodes centered, color-coded by type, orphans highlighted. Open it in Obsidian and see the shape of your knowledge.

**You go to sleep:** The nightly agent runs 5 phases: closes the day, reconciles contradictions, synthesizes cross-source patterns, heals orphan notes, and rebuilds the index. You wake up to a smarter vault.

**You start a new day:** `/obsidian-daily`
Claude pulls your calendar events, overdue tasks, and overnight changes into today's note. Your morning starts informed.

**Someone shares an X post:** `/x-read https://x.com/...`
Grok with live X access fetches the post, the thread, and the replies. Returns verbatim text + TL;DR + key claims + reply sentiment + voices to watch. No more screenshots.

**You're planning today's content:** `/x-pulse "AI automation"`
Grok scans X for what's trending in your topic right now. Returns 3-5 emerging themes (with rep posts + key voices), gaps nobody is filling, hook formats that are working, and 3 specific post ideas you could write today.

**You need real research:** `/research "AI memory tools"`
Perplexity Sonar Pro pulls a deep dossier with citations: summary, key facts (every claim with a recency marker and source domain), timeline, key players, contrarian views, recommended further reading, open questions. Saved to your vault, auto-opens in Obsidian.

**You want vault-first deep research:** `/research-deep "AI memory tools"`
Scans your vault for what you already know. Identifies gaps. Spawns 3-5 targeted searches via Perplexity (web) and Grok (X discourse). Synthesizes a delta report: what's new, what's confirmed, contradictions to resolve, recommended vault updates. Vault baseline doesn't get re-researched. Only gaps get filled.

**You hit a great YouTube video:** `/youtube https://youtu.be/...`
Free transcript via youtube-transcript-api. Optional metadata + top comments via YouTube Data API v3. Gemini (free tier, Grok fallback) summarizes into TL;DR, Key Points, Notable Quotes (verbatim), Themes, Comment Sentiment, and Worth Following Up On. Saved as an AI-first note in your vault. Add `--visual` to also *watch* it: scene-change frame extraction (ffmpeg) that Claude reads with its own vision to capture on-screen text, code, diagrams, and demos the transcript misses.

**You never open Obsidian.** Everything happens through Claude.

---

## Before & After

| | Without this skill | With this skill |
|---|---|---|
| Saving decisions | Copy-paste or lose them | Auto-saved to the right project note |
| Daily notes | Write it yourself, forget half the time | Created automatically |
| Finding patterns | Re-read dozens of notes | `/emerge` finds them for you |
| Challenging yourself | Nobody pushes back | `/challenge` uses your own history against you |
| Session continuity | Re-explain every time | `/world` loads full context in 10 seconds |
| Ingesting content | Read it, forget it | `/ingest` rewrites 5-15 vault pages from 1 source (URLs, PDFs, audio, screenshots) |
| Contradictions | You don't know they exist | `/reconcile` resolves them automatically |
| Synthesis | You connect dots manually | `/synthesize` finds patterns across sources on its own |
| Sharing vault data | Only Claude can read it | `/export` gives any AI tool a clean snapshot |
| Facts change over time | Old info gets overwritten | Bi-temporal facts track when it was true AND when the vault learned it |
| Starting a new session | Re-explain who you are | `CRITICAL_FACTS.md` loads your identity in ~120 tokens |
| Reading an X thread | Open X, scroll, screenshot, paste | `/x-read [url]` returns post + thread + sentiment + voices |
| Knowing what to post | Guess what's trending | `/x-pulse` scans X and returns hot themes + gaps + hooks + post ideas |
| Web research | Open 12 tabs, copy quotes manually | `/research [topic]` returns a sourced dossier with recency markers |
| Researching what you already know | Re-research from scratch | `/research-deep` scans vault first, fills only the gaps, flags contradictions |
| YouTube videos | Watch passively, forget | `/youtube [url]` transcript + summary + quotes saved to vault |
| Vault notes for future agent | Notes for human reading | AI-first rule: every note has "For future agent" preamble + recency markers + citations |
## More from the author

*The product is above. This is where it came from and where it goes next.*

<p align="center">
  <strong>From the blog</strong> &middot; <a href="https://theaioperator.io">The AI Operator &rarr;</a>
</p>

<p align="center">
  <strong>Featured:</strong> <a href="https://theaioperator.io/p/huge-update-on-obsidian-second-brain">"HUGE update on obsidian-second-brain: The Architect"</a><br />
  <em><code>/obsidian-architect</code> &middot; document your codebase into your vault &middot; the full before-and-after</em>
</p>

<p align="center">
  <strong>Deep dive:</strong> <a href="https://theaioperator.io/p/i-rebuilt-karpathys-llm-wiki-heres">"I rebuilt Karpathy's LLM Wiki. Here's what's missing from the original."</a><br />
  <em>Why append-only breaks at scale &middot; the AI-First Vault Principle &middot; three bugs in v1</em>
</p>

<p align="center">
  <strong>Origin story:</strong> <a href="https://theaioperator.io/p/i-built-this-for-myself-then-1374">"I built this for myself. Then 1,374 strangers cloned it."</a><br />
  <em>Two disconnected tools &middot; the institutional-amnesia problem &middot; 1,000+ stars in 7 weeks</em>
</p>

<p align="center">
  <em>One post per Tuesday on Obsidian + AI workflows and bringing AI into real work.</em>
</p>

<p align="center">
  <strong>Research toolkit &middot; dual-track</strong><br/>
  <code>/x-read</code> &middot; <code>/x-pulse</code> &middot; <code>/research</code> &middot; <code>/research-deep</code> &middot; <code>/notebooklm</code> &middot; <code>/youtube</code> &middot; <code>/podcast</code>
</p>

<p align="center">
  <em><strong>Open-web track</strong> &middot; <code>/research-deep</code> via Perplexity + Grok. Pulls fresh signal from outside.<br/>
  <strong>Source-grounded track</strong> &middot; <code>/notebooklm</code> via Gemini File Search. Reads your own vault.<br/>
  Run both for high-stakes topics. <strong>Contradictions across the two are where the insight is.</strong></em>
</p>

<p align="center">
  Built by <a href="https://github.com/eugeniughelbur"><strong>Eugeniu Ghelbur</strong></a> &middot; AI Automation Engineer @ Single Grain<br />
  <em>building in public &middot; sharing what works</em>
</p>

<div align="center">

<table>
<tr>
<td align="center" width="700">

### Follow along

*Weekly posts on AI second-brain systems, vault patterns, and what actually works.*

<a href="https://x.com/eugeniu_ghelbur"><img src="https://img.shields.io/badge/Follow_on_X-000?style=for-the-badge&logo=x&logoColor=white" alt="Follow on X" /></a>
<a href="https://www.linkedin.com/in/eugeniu-ghelbur/"><img src="https://img.s

> _README 过长已截断, 完整内容请查看 GitHub 仓库。_
