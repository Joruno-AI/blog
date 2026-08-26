<div align="center">
<img src="media/v3-banner-1400.jpg" alt="planning-with-files: task_plan.md, findings.md, and progress.md as three stone tablets" width="100%">
</div>

<h1 align="center">Planning with Files</h1>

<p align="center">
  <strong>The planning skill your agent cannot ignore.</strong><br>
  Not a prompt it might follow. A hook that fires every turn, a plan on disk that survives <code>/clear</code>, and 3 out of 3 blind A/B wins to show it works.
</p>

<p align="center">
  <em>Your agent's context window dies. The plan does not.</em>
</p>

<p align="center">
Persistent file-based planning for AI coding agents and long-running agent tasks: the skill keeps <code>task_plan.md</code>, <code>findings.md</code>, and <code>progress.md</code> on disk and re-injects them every turn, so the plan survives context loss, <code>/clear</code>, crashes, and compaction. Manus-style working memory on disk, with an opt-in completion gate. Installs across 60+ agents via the Agent Skills standard.
</p>

<p align="center">
  <a href="https://github.com/OthmanAdi/planning-with-files/stargazers"><img src="https://img.shields.io/github/stars/OthmanAdi/planning-with-files?style=flat&color=yellow" alt="Stars"></a>
  <a href="https://github.com/OthmanAdi/planning-with-files/releases"><img src="https://img.shields.io/github/v/release/OthmanAdi/planning-with-files?style=flat&label=release" alt="Latest release"></a>
  <a href="https://skillsplayground.com/skills/othmanadi-planning-with-files-planning-with-files/"><img src="https://skillsplayground.com/badges/installs/othmanadi-planning-with-files-planning-with-files.svg" alt="Skills Playground installs"></a>
  <a href="https://skill-history.com/othmanadi/planning-with-files"><img src="https://skill-history.com/badge/othmanadi/planning-with-files.svg" alt="Downloads"></a>
</p>

<p align="center">
  <a href="docs/evals.md"><img src="https://img.shields.io/badge/benchmark-96.7%25_pass_(29%2F30)-2da44e?style=flat" alt="Benchmark: 96.7 percent assertion pass rate with skill"></a>
  <a href="docs/evals.md"><img src="https://img.shields.io/badge/blind_A%2FB-3%2F3_wins-2da44e?style=flat" alt="Blind A/B: 3 of 3 wins"></a>
  <a href="LICENSE"><img src="https://img.shields.io/github/license/OthmanAdi/planning-with-files?style=flat" alt="MIT license"></a>
</p>

<p align="center">
  <a href="#before-and-after-clear"><strong>See it survive /clear</strong></a> ·
  <a href="#the-solution-3-file-pattern">The 3 files</a> ·
  <a href="#why-this-skill">Why it works</a> ·
  <a href="#benchmark-results">The numbers</a> ·
  <a href="#quick-install"><strong>Install</strong></a>
</p>

<p align="center">
  <sub>Everything technical is <a href="#reference">further down</a> · <a href="docs/installation.md">Full install guide</a></sub>
</p>

---

## Before and after /clear

Every coding agent loses its working memory when the context window resets. The plan does not have to die with it.

### Without planning files

<img src="media/terminal-without-plan.svg" alt="Terminal after /clear without planning files: the user types continue, the agent replies that it has no context from an earlier session and asks the user to describe the task and where they left off" width="560">

The agent re-reads the repo, asks you to restate the goal, and rediscovers work it already finished.

---

### With planning-with-files

<img src="media/terminal-with-plan.svg" alt="Terminal after /clear with planning-with-files: the hook injects a plan data block showing Phase 2 complete and Phase 3 in progress, and the agent resumes Phase 3 by adding the expiry edge-case tests" width="560">

The transcript is illustrative; the `===BEGIN PLAN DATA===` block is the skill's real injection format, written into context by the `UserPromptSubmit` hook from `task_plan.md` on disk. In the project's internal recovery benchmark, a fresh session with the files on disk resumed in 5.0 turns on average against 13.3 for a raw agent (internal v1, author-run; method and limits in [docs/evals.md](docs/evals.md)).

| At a glance | |
|---|---:|
| Plan files | **3** |
| Agents covered | **60+** |
| Pass rate (with skill) | **96.7%** |
| Test suite | **417 green** |
| Survives `/clear` | **yes** |

## The Problem

Claude Code and most AI agents suffer from:

- **Volatile memory**: the TodoWrite list disappears on context reset
- **Goal drift**: after 50+ tool calls, the original goals get crowded out
- **Hidden errors**: failures are not tracked, so the same mistakes repeat
- **Context stuffing**: everything crammed into the window instead of stored

## The Solution: 3-File Pattern

For every complex task, create THREE files:

```
task_plan.md      → Track phases and progress
findings.md       → Store research and findings
progress.md       → Session log and test results
```

### The Core Principle

```
Context Window = RAM (volatile, limited)
Filesystem = Disk (persistent, unlimited)

→ Anything important gets written to disk.
```

In your project, exactly this lands on disk and nothing else:

```
your-project/
├── task_plan.md   ← phases + checkboxes; the resume point after /clear
├── findings.md    ← research notes and decisions, appended as you go
└── progress.md    ← session log and test results
```

Parallel tasks get isolated directories instead: `.planning/YYYY-MM-DD-slug/` with the same three files, selected via `.active_plan` (v2.36.0+). Plain markdown, gitignored by default, no runtime state anywhere else.

## Why This Skill?

On December 29, 2025, [Meta acquired Manus for $2 billion](https://techcrunch.com/2025/12/29/meta-just-bought-manus-an-ai-startup-everyone-has-been-talking-about/). In just 8 months, Manus went from launch to $100M+ revenue. Their secret? **Context engineering.**

> "Markdown is my 'working memory' on disk. Since I process information iteratively and my active context has limits, Markdown files serve as scratch pads for notes, checkpoints for progress, building blocks for final deliverables."
> — Manus AI

This skill packages that exact pattern for your coding agent.

### The Manus Principles

| Principle | Implementation |
|-----------|----------------|
| Filesystem as memory | Store in files, not context |
| Attention manipulation | Re-read plan before decisions (hooks) |
| Error persistence | Log failures in plan file |
| Goal tracking | Checkboxes show progress |
| Completion verification | Stop hook checks all phases |

## Benchmark Results

> **Methodology note:** the 96.7% figure comes from the v2.21.0 evaluation run on `claude-sonnet-4-6` (2026-03-06). It measures file-pattern fidelity (does the agent create and maintain the 3-file structure), not goal-drift over long autonomous runs. Newer models and the autonomous-mode work are not yet covered by this number. Full methodology, dataset, and assertion list: [docs/evals.md](docs/evals.md).

Evaluated with Anthropic's [skill-creator](https://github.com/anthropics/skills/tree/main/skills/skill-creator) framework: skill v2.21.0, model `claude-sonnet-4-6`, 2026-03-06. 10 parallel subagents, 5 task types, 30 objectively verifiable assertions, 3 blind A/B comparisons.

<p align="center">
  <img src="media/benchmark-skill-vs-baseline.svg" width="860" alt="Eval results, with skill vs without: assertions passed 29 of 30 vs 2 of 30, 3-file pattern followed 5 of 5 vs 0 of 5, blind A/B wins 3 of 3 vs 0 of 3, average rubric score 10.0 vs 6.8">
</p>

| Test | with_skill | without_skill |
|------|-----------|---------------|
| Pass rate (30 assertions) | **96.7%** (29/30) | 6.7% (2/30) |
| 3-file pattern followed | 5/5 evals | 0/5 evals |
| Blind A/B wins | **3/3 (100%)** | 0/3 |
| Avg rubric score | **10.0/10** | 6.8/10 |

### Recovery after a context wipe

> **Internal benchmark, v1 (2026-07-06).** Author-run against v3.4.0, harness-authored tasks, deterministic grading, no LLM grades anything. Treat it as the project's own measurement, not an independent comparison. Full method, arms, disclosed limits, and grader validation: [docs/evals.md](docs/evals.md#test-5-competitive-benchmark-v1-seven-planning-methods-head-to-head-2026-07-06-internal).

Protocol: the session is hard-stopped at roughly half done, and a fresh session is told only "Continue the work in this directory." Every graded run across every arm ended pytest-green (77/77), so the difference is re-orientation cost, not correctness.

<p align="center">
  <img src="media/recovery-turns.svg" width="860" alt="Turns to resume after a context wipe, internal benchmark v1: 5.0 with planning-with-files, 13.3 for a raw agent with no planning method">
</p>

**With the planning files on disk, a resume took 5.0 turns on average; a raw agent took 13.3.** Session catchup plus hook injection put phase state in front of the model before its first tool call, and the same run found no correctness penalty anywhere. An animated summary lives at [docs/benchmark/index.html](docs/benchmark/index.html) ([rendered view](https://htmlpreview.github.io/?https://github.com/OthmanAdi/planning-with-files/blob/master/docs/benchmark/index.html)).

[Full methodology and results](docs/evals.md) · [Technical write-up](docs/article.md)

## Quick Install

**Claude Code, plugin route** (ships everything: skill, hooks, slash commands):

```
/plugin marketplace add OthmanAdi/planning-with-files
/plugin install planning-with-files@planning-with-files
```

**Every other agent**, one line, 60+ agents via the [Agent Skills](https://agentskills.io) standard:

```bash
npx skills add OthmanAdi/planning-with-files --skill planning-with-files -g
```

**npm**, to pin an exact version into a project or vendor it:

```bash
npm install planning-with-files
```

The package carries `SKILL.md`, `scripts/` and `templates/`, so this is the route for locking a version into a repo's dependencies or copying the skill in yourself. It does not register hooks on its own.

**Pi Coding Agent**, same npm package, wired up for you (skill, extension, status bar):

```bash
pi install npm:planning-with-files
```

Under a minute. Safe to re-run. Trigger it by typing `/plan` (plugin) or asking the agent to "plan this task"; the skill also self-triggers on multi-step tasks.

What each route actually ships:

| Route | Skill + scripts + templates | Slash commands | Hooks |
|---|---|---|---|
| Claude Code plugin | yes | **yes** | **yes** |
| `npx skills add` | yes | no | frontmatter hooks, see note |
| `npm install` | yes, under `node_modules/` | no | no, copy the skill in yourself |
| `pi install npm:` | yes | **yes**, Pi commands | **yes**, via the Pi extension |
| ClawHub / manual copy | yes | no | frontmatter hooks, see note |

Skill-route installs can end up silently hook-less (project trust not accepted, or frontmatter hooks not registering on project-level installs). The hooks are the differentiating mechanism, so if they matter to you, use the plugin route, then verify with `/plan-doctor`. Full matrix and the two silent killers: [docs/installation.md](docs/installation.md#what-each-install-route-actually-ships).

Install acting up? Open your agent and say: *"Read docs/installation.md and docs/troubleshooting.md from OthmanAdi/planning-with-files and fix my install."* Then run `/plan-doctor`.

<details>
<summary><strong>🌐 Available in 5 other languages</strong></summary>

**🇸🇦 العربية / Arabic**
```bash
npx skills add OthmanAdi/planning-with-files --skill planning-with-files-ar -g
```

**🇩🇪 Deutsch / German**
```bash
npx skills add OthmanAdi/planning-with-files --skill planning-with-files-de -g
```

**🇪🇸 Español / Spanish**
```bash
npx skills add OthmanAdi/planning-with-files --skill planning-with-files-es -g
```

**🇨🇳 中文版 / Chinese (Simplified)**
```bash
npx skills add OthmanAdi/planning-with-files --skill planning-with-files-zh -g
```

**🇹🇼 正體中文版 / Chinese (Traditional)**
```bash
npx skills add OthmanAdi/planning-with-files --skill planning-with-files-zht -g
```

These are real translations, not an English body with a translated description: the SKILL.md prose, the templates, and the user-facing output of `check-complete`, `init-session` and `session-catchup` are all localized. The status tokens stay literal English (`**Status:** complete`) on purpose, because `check-complete.sh` matches them with `grep -F`, so translating them would disable the completion gate.

Since v3.10.0 the variants also ship the full script surface: attestation, the Stop gate, the ledger, phase status and plan-doctor used to be canonical-only, which quietly made every non-English install a subset install. Full details, including what changed on the plugin route in v3.11.0, are in [docs/languages.md](docs/languages.md).

They live under `skills/i18n/`, one directory deeper than the canonical skill. The install commands above are unchanged, because `npx skills add` resolves `--skill` by skill name across the whole repository. The Claude Code plugin scan reads `skills/*/SKILL.md` without recursing, so the plugin route registers the canonical skill alone and no longer carries five extra descriptions in every session's system prompt. On that route the `/plan-ar`, `/plan-de`, `/plan-es`, `/plan-zh` and `/plan-zht` commands read the translated skill from disk instead of invoking it by name.

</details>

<details>
<summary><strong>Prefer <code>/planning-with-files</code> with no prefix?</strong></summary>

Copy the skill to your local folder:

**macOS/Linux:**
```bash
cp -r ~/.claude/plugins/cache/planning-with-files/planning-with-files/*/skills/planning-with-files ~/.claude/skills/
```

**Windows (PowerShell):**
```powershell
Copy-Item -Recurse -Path "$env:USERPROFILE\.claude\plugins\cache\planning-with-files\planning-with-files\*\skills\planning-with-files" -Destination "$env:USERPROFILE\.claude\skills\"
```

</details>

All install methods: [docs/installation.md](docs/installation.md).


---

<a id="reference"></a>

## Reference

Everything below is the technical half: how the hooks fire, every command, every supported platform, and the release history.

| | |
|---|---|
| [How It Works](#how-it-works) | The hook loop, injection, and session recovery |
| [Commands](#commands) | All 13 slash commands |
| [Works across 18+ platforms](#works-across-18-platforms) | Per-IDE setup and discovery paths |
| [v3 Long-Running Agent Features](#v3-long-running-agent-features) | Modes, the completion gate, attestation, env vars |
| [Key Rules](#key-rules) · [When to Use](#when-to-use) | The four rules, and when the pattern pays off |
| [File Structure](#file-structure) | What lands in your project, and the repository layout |
| [FAQ](#faq) | Context rot, plan mode, agent memory tools |
| [Releases](#releases) · [Community](#community) | Version history and community forks |
| [Documentation](#documentation) | Every guide in `docs/` |

## How It Works

The agent stops at the first rung that applies:

```
1. Task needs 3+ steps or 5+ tool calls?  → create the three files first
2. Learned something?                     → append

> _README 过长已截断, 完整内容请查看 GitHub 仓库。_
