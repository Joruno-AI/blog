# Auto-claude-code-research-in-sleep (ARIS ⚔️🌙)

<p align="center">
  <a href="https://huggingface.co/papers/2605.03042">
    <img src="docs/hf_daily_paper_1.svg" alt="Hugging Face Daily Paper · #1 Paper of the Day" width="360">
  </a>
</p>

[![Technical Report](https://img.shields.io/badge/Technical%20Report-arXiv%3A2605.03042-b31b1b?style=flat&logo=arxiv)](https://huggingface.co/papers/2605.03042) · [![ARIS Intro (HTML)](https://img.shields.io/badge/ARIS%20Intro-HTML%20%C2%B7%20by%20%2Frender--html-1a4a8c?style=flat&logo=html5&logoColor=white)](https://wanshuiyin.github.io/Auto-claude-code-research-in-sleep/ARIS_INTRO.html) · [![ARIS Intro Slides — VALSE 2026](https://img.shields.io/badge/Slides%20%40%20VALSE%202026-PDF%20%C2%B7%20by%20%2Fpaper--talk-EC1C24?style=flat&logo=adobeacrobatreader&logoColor=white)](docs/aris_intro_slides.pdf) · [![AI Agents](https://img.shields.io/badge/AI%20Agents-AGENT__GUIDE.md-4B2E83?style=flat&logo=readthedocs&logoColor=white)](AGENT_GUIDE.md) · [![Featured on PaperWeekly](https://img.shields.io/badge/Featured%20on-PaperWeekly-red?style=flat)](https://mp.weixin.qq.com/s/tDniVryVGjDkkkWl-5sTkQ) · [![Featured in awesome-agent-skills](https://img.shields.io/badge/Featured%20in-awesome--agent--skills-blue?style=flat&logo=github)](https://github.com/VoltAgent/awesome-agent-skills) · [![AI Digital Crew - Project of the Day](https://img.shields.io/badge/AI%20Digital%20Crew-Project%20of%20the%20Day%20(2026.03.14)-orange?style=flat)](https://aidigitalcrew.com) · [![GitHub stars](https://img.shields.io/github/stars/wanshuiyin/Auto-claude-code-research-in-sleep?style=flat&logo=github&logoColor=white&color=gold&label=Stars)](https://github.com/wanshuiyin/Auto-claude-code-research-in-sleep/stargazers) · [💬 Join Community](#community) · [![Cite](https://img.shields.io/badge/📖_Cite_Us-BibTeX-green?style=flat)](#citation)

💡 *Use ARIS as a skill-based workflow in [Claude Code](https://docs.anthropic.com/en/docs/claude-code) / [Codex CLI](skills/skills-codex/) / [Cursor](docs/CURSOR_ADAPTATION.md) / [Trae](docs/TRAE_ARIS_RUNBOOK_EN.md) / [Antigravity](docs/ANTIGRAVITY_ADAPTATION.md) / [GitHub Copilot CLI](docs/COPILOT_CLI_ADAPTATION.md) / [OpenClaw](docs/OPENCLAW_ADAPTATION.md) / [DeepSeek Harness](https://github.com/wanshuiyin/Auto-claude-code-research-in-sleep/tree/dsh-aris#readme), or get the full experience with the standalone **[ARIS-Code](docs/ARIS-Code-README_EN.md)** CLI — enjoy any way you like!*

🐋 **On DeepSeek Harness it installs as one plugin:** `dsh plugin --profile web add dsh-aris` (fetches from npm by itself — no separate install step, but `pnpm` must be on `PATH`) — all 82 skills unchanged, Codex still the independent reviewer. Setup and limits on the [`dsh-aris` branch](https://github.com/wanshuiyin/Auto-claude-code-research-in-sleep/tree/dsh-aris#readme).

🌱 *ARIS is a methodology, not a platform. What matters is the research workflow — take it wherever you go.*

🤖 **AI agents:** Read [`AGENT_GUIDE.md`](AGENT_GUIDE.md) instead — structured for LLM consumption, not human browsing.

🛡️ **ARIS audits its own output → now [Anti-Autoresearch](https://github.com/wanshuiyin/Anti-Autoresearch) audits everyone's.** 61 signals — 46 integrity hack-patterns in 8 families, 13 AI-style impressions, 2 advisory — checked end-to-end into a deterministic, reviewer-ready report.
*Self-consistency + fabrication forensics, **not** an AI-text detector.*

<p align="center"><em>The field has put up with unreliable autoresearch long enough —<br>Anti-Autoresearch is the read that finally catches it.</em></p>

🧱 **ARIS's reviewer is good — and it also proposed hashes nobody reads → [HERO](https://github.com/wanshuiyin/HERO-Anti-OverDefense) is the contract that stops that.** **H**ashing, **E**dge cases, **R**ubrics, **O**verbuild — the four shapes agents over-defend in, as a ~550-token block for `CLAUDE.md` / `AGENTS.md`.
*It bounds what the agent **proposes**, never what it **looks for**.*

🎬 **ARIS goes multimodal → [ARIS-Movie-Director](https://github.com/wanshuiyin/ARIS-Movie-Director)** — hand it a rough story and get back a movie told in still frames, checked scene by scene (the reference run has 19 scenes).
Long stories usually break when the model forgets earlier details or judges its own work — so ARIS keeps a research-wiki for memory and has other models check every frame.

<details>
<summary>🗺️ <b>Method figure</b> — story brief → authored source of truth → per-panel audited spiral → assembly &amp; release, on one canvas</summary>

<p align="center">
  <a href="https://github.com/wanshuiyin/ARIS-Movie-Director">
    <img src="docs/aris-movie-director-method.png" alt="ARIS-Movie-Director method — the audited spiral: authored source of truth (asset library · outline · storyboard · comic.json) → per-panel image_gen + cross-model panel_gate (blind token-diff, single-vote veto) → research-wiki audit trace → assembly + release" width="100%">
  </a>
</p>

</details>

> 🧭 *The same loop also makes clean method / flow diagrams — the figure above was made with it. Entry points in **[ARIS-Movie-Director](https://github.com/wanshuiyin/ARIS-Movie-Director)**: [`/movie-pipeline`](https://github.com/wanshuiyin/ARIS-Movie-Director/blob/main/skills/movie-pipeline/SKILL.md) and [`/method-figure`](https://github.com/wanshuiyin/ARIS-Movie-Director/blob/main/skills/method-figure/SKILL.md), the skill that made this figure.*

<details>
<summary>🎞️ <i>A few frames from the reference movie — the story's own integrity beat: a run that <b>reported <code>+6.2</code></b> but <b>really moved <code>+1.4</code></b>.</i> &nbsp;<b><a href="https://wanshuiyin.github.io/ARIS-Movie-Director/comic/">▶ watch all 19 scenes →</a></b></summary>

<table><tr>
<td width="33%"><a href="https://wanshuiyin.github.io/ARIS-Movie-Director/comic/"><img src="https://raw.githubusercontent.com/wanshuiyin/ARIS-Movie-Director/main/docs/preview_audit.webp" alt="ARIS-Movie-Director frame — the evaluator-integrity audit page" width="100%"></a></td>
<td width="33%"><a href="https://wanshuiyin.github.io/ARIS-Movie-Director/comic/"><img src="https://raw.githubusercontent.com/wanshuiyin/ARIS-Movie-Director/main/docs/preview_panels.webp" alt="ARIS-Movie-Director frame — a multi-panel scene" width="100%"></a></td>
<td width="33%"><a href="https://wanshuiyin.github.io/ARIS-Movie-Director/comic/"><img src="https://raw.githubusercontent.com/wanshuiyin/ARIS-Movie-Director/main/docs/preview_fix.webp" alt="ARIS-Movie-Director frame — the integrity beat (reported +6.2, really moved +1.4)" width="100%"></a></td>
</tr></table>

</details>

🎯 **准备 2026 AI 秋招？** → [**🌐 ARIS-in-AI-Offer**](https://wanshuiyin.github.io/ARIS-in-AI-Offer/) · [GitHub repo](https://github.com/wanshuiyin/ARIS-in-AI-Offer) · [中文 README](https://github.com/wanshuiyin/ARIS-in-AI-Offer/blob/main/README_CN.md) —— 23 篇双语 ML / LLM / 多模态 / 生成式 / Agent 面试 cheat sheet，每篇 = 公式推导 + 从零 PyTorch + 25 高频面试题（L1 / L2 / L3），全部由 ARIS 的 `/render-html` 自动生成。**希望大家秋招轻松一点 🌱**

<details>
<summary><b>🖼️ Preview</b> — the three-pillar cheat-sheet strip (① Foundations · ② Interview Q&amp;A · ③ From-Scratch Code)</summary>

<p align="center">
  <a href="https://github.com/wanshuiyin/ARIS-in-AI-Offer">
    <img src="https://raw.githubusercontent.com/wanshuiyin/ARIS-in-AI-Offer/main/assets/preview_strip.jpg" alt="ARIS-in-AI-Offer preview — ① Foundations + ② Interview Q&A + ③ From-Scratch Code, three columns from a representative cheat sheet" width="100%">
  </a>
</p>

</details>

> 📝 *Three long-form blogs, cross-model collaborative writing via `/render-html` — [Continuous DLM — a representation-perspective survey (2026 H1)](https://wanshuiyin.github.io/ARIS-in-AI-Offer/blogs/continuous_dlm_representation_perspective.html) · [Cosmos 3 — understanding + generation in one Transformer (MoT)](https://wanshuiyin.github.io/ARIS-in-AI-Offer/blogs/cosmos3_mot_guide.html) · [Diffusion × representation × manifold learning](https://wanshuiyin.github.io/ARIS-in-AI-Offer/blogs/diffusion_representation_manifold.html).*

🛰 **Keep an eye on your agent windows** — [Claude Fleet](https://github.com/tianyilt/claude-fleet) (by [@tianyilt](https://github.com/tianyilt); local read-only dashboard for many parallel Claude Code / Codex windows, full-text transcript search — worth a ⭐), or the lighter built-in [ARIS-Monitor](aris-monitor/) (a tiny always-on-top macOS widget that lights up 🔴 when a session waits for your approval; click to jump there).

<details>
<summary><b>🖼️ Preview</b> — Claude Fleet dashboard (full web) &amp; ARIS-Monitor widget (minimal, built-in)</summary>

<table align="center" width="100%">
<tr>
<td width="66%" align="center" valign="top">
<a href="https://github.com/tianyilt/claude-fleet"><img src="assets/claude-fleet-preview.png" width="100%" alt="Claude Fleet — full local web dashboard for many concurrent Claude Code / Codex windows (triage, Focus, full-text search, skill/memory analytics)"></a>
</td>
<td width="34%" align="center" valign="top">
<a href="aris-monitor/"><img src="aris-monitor/assets/screenshot.png" width="100%" alt="ARIS-Monitor — minimal always-on-top floating widget showing which Claude Code sessions need approval (calm all-clear vs red ATTENTION)"></a>
</td>
</tr>
<tr>
<td align="center"><b><a href="https://github.com/tianyilt/claude-fleet">Claude Fleet</a></b> · 全功能网页看板</td>
<td align="center"><b><a href="aris-monitor/">ARIS-Monitor</a></b> · 极简悬浮小窗(自带)</td>
</tr>
</table>

</details>

<details>
<summary><b>Run either in seconds</b> — ARIS-Monitor (5s) / Claude Fleet (30s)</summary>

**ARIS-Monitor** — built-in, no clone / no pip / no browser:

```bash
cd aris-monitor && ./run.sh
# a borderless panel floats top-right; click a row to jump to that terminal
```

**Claude Fleet** — full web dashboard:

```bash
git clone https://github.com/tianyilt/claude-fleet
cd claude-fleet && bash run.sh
# open http://127.0.0.1:7878 in your browser
```

</details>

🚀 **Beyond 科研 → 任何 "研究"**：[**ARIS-Anything**](https://github.com/wanshuiyin/ARIS-Anything) 把 ARIS 的五步 loop（plan / draft / 对抗审 / 迭代 / 持久化）推广到非学术的结构化研究——投资尽调 / 法律研究 / 市场研究 / 自驱学习 / 调查新闻 / 工程复盘等。

🔥 [**ARIS-Code CLI — 独立安装版**](docs/ARIS-Code-README_CN.md) · [English](docs/ARIS-Code-README_EN.md) | [⬇️ Download](https://github.com/wanshuiyin/Auto-claude-code-research-in-sleep/releases/latest) · [![Downloads](https://img.shields.io/github/downloads/wanshuiyin/Auto-claude-code-research-in-sleep/total?style=flat-square&color=brightgreen)](https://github.com/wanshuiyin/Auto-claude-code-research-in-sleep/releases)

<table>
<tr>
<td valign="top" width="60%">

📰 **ARIS-Code v0.4.24** (2026-08) — latest is the **Claude 5 model refresh** ([#392](https://github.com/wanshuiyin/Auto-claude-code-research-in-sleep/issues/392)): first-class **Claude Opus 5** (new default, same $5/$25 tier) and **Claude Fable 5** (Mythos-class flagship, correct $10/$50 pricing) — `/model` picker + `fable`/`opus`/`sonnet` aliases + an ordered availability chain (Opus 5 → 4.8 → 4.7) so accounts without Claude 5 access keep working untouched. Recent headliners: **v0.4.23 — output folding** (tool output folds to a few lines, `ARIS_TOOL_OUTPUT_LINES=0` restores full dumps; **81 bundled skills** incl. the [Anti-Autoresearch](https://github.com/wanshuiyin/Anti-Autoresearch) `/integrity-forensics` launcher) and **v0.4.17 — the MCP release** (cross-model review needs no OpenAI API key — `aris setup` wires your **ChatGPT subscription** in as reviewer via *Codex MCP*). Caps a 20-release run (v0.4.5 → v0.4.24); per-release detail below. Credits: [@GetIT-Sunday](https://github.com/GetIT-Sunday), [@Anduin9527](https://github.com/Anduin9527), [@GO-player-hhy](https://github.com/GO-player-hhy), [@Jxy-yxJ](https://github.com/Jxy-yxJ), [@screw-44](https://github.com/screw-44), [@StevenUST](https://github.com/StevenUST), [@opposj](https://github.com/opposj), [@ShijunLei-cn](https://github.com/ShijunLei-cn), [@algojogacor](https://github.com/algojogacor), [@YukinoshitaLove](https://github.com/YukinoshitaLove).

</td>
<td valign="top" width="40%">

<img src="docs/aris-code-banner.png" width="100%" alt="ARIS-Code CLI terminal — Auto Research in Sleep">

</td>
</tr>
</table>

> <details><summary>Per-release details (v0.4.5 → v0.4.24)</summary>
>
> **v0.4.24** (2026-08-09) — **the Claude 5 model refresh** ([#392](https://github.com/wanshuiyin/Auto-claude-code-research-in-sleep/issues/392), requested by [@YukinoshitaLove](https://github.com/YukinoshitaLove)). Explicit `--model claude-opus-5` / `claude-fable-5` already passed through on every platform — this release makes them first-class. **Default → `claude-opus-5`** (main session, subagents, `aris setup`; same $5/$25 tier as Opus 4.8); the v0.4.18 availability fallback becomes an ordered **chain walk** (Opus 5 → Opus 4.8 → Opus 4.7, one step per precise `404 not_found_error`, explicit choices never silently change) — the naive constant swap would have stranded 4.7-only accounts and configs saved by v0.4.23's setup, a regression the cross-model review caught and an end-to-end mock-404 chain test now locks. `/model` picker adds Fable 5 / Opus 5 / Sonnet 5; new `fable` alias. **New Mythos-class pricing tier** (`fable`/`mythos` = $10/$50, cache write $12.50 / read $1, verified 2026-08 — previously fell to the conservative $15/$75 unknown-model tier, a 1.5× over-estimate); Opus 5 / Sonnet 5 pinned on their existing branches. Tests: api 41 / aris-cli 213 + 4 e2e / runtime 226 / tools 70 / commands 5, all green; live smoke on claude-opus-5, claude-fable-5 and the fable alias. Codex MCP (gpt-5.6-sol xhigh) implementation gate: NO-GO → NO-GO → GO.
>
> **v0.4.23** (2026-08-02) — **the output-folding release** (top real-user complaint: "aris dumps thinking and the full content of documents it reads onto the screen"). **🧹 Tool-output folding, display layer ONLY**: the disk-verified culprits were format_read_result appending the ENTIRE read payload, bash pushing full stdout/stderr, grep dumping its full content blob, and the edit preview capping line counts but not line LENGTH. Now Read/Grep show the first 6 lines, Bash shows first 4 + last 4 per stream (stderr keeps its red), each kept line capped at 240 chars (the minified-single-line case), then one dim "… (+N more lines — set ARIS_TOOL_OUTPUT_LINES=0 for full output)" hint. ONE env knob: unset = defaults, a positive integer overrides every tool, 0 = the exact old display; the session, model context, `--output-format json` and `/export` are untouched and always complete. Thinking was verified to never print (Anthropic deltas only accumulate; Kimi reasoning_content only feeds the replay cache — the "thinking dump" perception came from the document dumps); two end-to-end sentinel tests (real binary vs mock SSE server) lock that thinking/reasoning never reaches the terminal. Interactive expand/collapse was deliberately rejected as over-engineering. **🐛 Bash timeout now kills the command**: a timed-ou

> _README 过长已截断, 完整内容请查看 GitHub 仓库。_
