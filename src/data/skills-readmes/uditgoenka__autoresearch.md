<div align="center">

# Autoresearch

**Turn [Claude Code](https://docs.anthropic.com/en/docs/claude-code), [OpenCode](https://opencode.ai), or [OpenAI Codex](https://developers.openai.com/codex) into a relentless improvement engine.**

Based on [Karpathy's autoresearch](https://github.com/karpathy/autoresearch) — constraint + mechanical metric + autonomous iteration = compounding gains.

[![Claude Code Skill](https://img.shields.io/badge/Claude_Code-Skill-blue?logo=anthropic&logoColor=white)](https://docs.anthropic.com/en/docs/claude-code)
[![OpenCode](https://img.shields.io/badge/OpenCode-Skill-purple)](https://opencode.ai)
[![Codex](https://img.shields.io/badge/Codex-Skill-green?logo=openai&logoColor=white)](https://developers.openai.com/codex)
[![Version](https://img.shields.io/badge/version-2.2.2-blue.svg)](https://github.com/uditgoenka/autoresearch/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

[![Based on](https://img.shields.io/badge/Based_on-Karpathy's_Autoresearch-orange)](https://github.com/karpathy/autoresearch)
[![Follow @iuditg](https://img.shields.io/badge/Follow-@iuditg-000000?style=flat&logo=x&logoColor=white)](https://x.com/intent/follow?screen_name=iuditg)
[![Support](https://img.shields.io/badge/Support-PayPal-00457C?style=flat&logo=paypal&logoColor=white)](https://paypal.me/uditgoenka)

<br>

*"Set the GOAL → The agent runs the LOOP → You wake up to results"*

*You don't need AGI. You need a goal, a metric, and a loop that never quits.*

**Supports Claude Code, OpenCode, and OpenAI Codex for the core skill, bundled runtime, installation, and verification surface. Hook guardrails are Claude Code-only.**

> **v2.2.0 — Autonomous Orchestrator:** Type a plain-language goal to `/autoresearch` and it classifies your goal, derives a Success predicate, confirms it once, then loops across subcommands until done. No manual chaining required. `Metric:`/`Verify:` invocations run the classic loop unchanged. See [guide/autoresearch-orchestrator.md](guide/autoresearch-orchestrator.md).

<br>

[How It Works](#how-it-works) · [Commands](#commands) · [Quick Start](#quick-start) · [Guides](guide/) · [FAQ](#faq)

</div>

---

```
     PLAN             LOOP            DEBUG             FIX             SECURE            SHIP
 ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
 │   Goal   │     │  Modify  │     │   Find   │     │   Fix    │     │  STRIDE  │     │  Stage   │
 │  Metric  │────▶│  Verify  │────▶│   Bugs   │────▶│  Errors  │────▶│  OWASP   │────▶│  Deploy  │
 │  Scope   │     │Keep/Drop │     │  Trace   │     │  Repair  │     │ Red Team │     │ Release  │
 └──────────┘     └──────────┘     └──────────┘     └──────────┘     └──────────┘     └──────────┘
 /autoresearch:   /autoresearch    /autoresearch:   /autoresearch:   /autoresearch:   /autoresearch:
   plan                              debug            fix              security         ship

 ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
 │  Probe   │     │ Scenario │     │ Predict  │     │  Reason  │
 │ Require- │     │   Edge   │     │ 5-Expert │     │  Debate  │
 │  ments   │     │  Cases   │     │  Swarm   │     │ Converge │
 └──────────┘     └──────────┘     └──────────┘     └──────────┘
 /autoresearch:   /autoresearch:   /autoresearch:   /autoresearch:
   probe            scenario         predict          reason

 ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
 │  Learn   │     │ Improve  │     │   Eval   │     │ Baseline │
 │   Docs   │     │ Research │     │ Analyze  │     │   Diff   │
 │   Gen    │     │   PRDs   │     │ Results  │     │ Verdict  │
 └──────────┘     └──────────┘     └──────────┘     └──────────┘
 /autoresearch:   /autoresearch:   /autoresearch:   /autoresearch:
   learn            improve          evals            regression
```

---

## Why This Exists

[Karpathy's autoresearch](https://github.com/karpathy/autoresearch) demonstrated that a 630-line Python script could autonomously improve ML models overnight — **100 experiments per night** — by following simple principles: one metric, constrained scope, fast verification, automatic rollback, git as memory.

**Claude Autoresearch generalizes these principles to ANY domain.** Not just ML — code, content, marketing, sales, HR, DevOps, or anything with a number you can measure.

**v2.1.0 is a major architecture rebuild.** The monolithic SKILL.md (813 lines, ~100K tokens per invocation) is replaced with a thin 41-line routing file and 12 self-contained command files (94–120 lines each, ~5–8K tokens per invocation). That is a **95% token reduction** with the same capability surface.

---

## How It Works

```
LOOP (N iterations or until done):
  1. Review current state + git history + results log
  2. Pick the next change (based on what worked, what failed, what's untried)
  3. Make ONE focused change
  4. Git commit (before verification)
  5. Run mechanical verification (tests, benchmarks, scores)
  6. If improved → keep. If worse → git revert. If crashed → fix or skip.
  7. Log the result
  8. Repeat until N iterations complete or goal is met.
```

Every improvement stacks. Every failure auto-reverts. Progress is logged in TSV format.

### The Setup Phase

Before looping, Claude performs a one-time setup:

1. **Read context** — reads all in-scope files
2. **Define goal** — extracts or asks for a mechanical metric
3. **Define scope** — which files can be modified vs read-only
4. **Establish baseline** — runs verification on current state (iteration #0)
5. **Confirm and go** — shows setup, then begins the loop

### 8 Critical Rules

| # | Rule |
|---|------|
| 1 | **Bounded by default** — every command has a default iteration count; unlimited is opt-in via `Iterations: unlimited` |
| 2 | **Read before write** — understand full context before modifying |
| 3 | **One change per iteration** — atomic changes; if it breaks, you know why |
| 4 | **Mechanical verification only** — no subjective "looks good"; use metrics |
| 5 | **Automatic rollback** — failed changes revert instantly |
| 6 | **Simplicity wins** — equal results + less code = keep |
| 7 | **Git is memory** — experiments committed with `experiment:` prefix; agent reads `git log` + `git diff` before each iteration |
| 8 | **When stuck, think harder** — re-read, combine near-misses, try radical changes |

---

## Hooks & Safety

Hooks are defense-in-depth guardrails, not a security sandbox. Claude Code ships the hook surface; OpenCode and Codex ship the core skill/runtime/install surface without hook parity.

### What's Protected

| Hook | What it does | Event |
|------|-------------|-------|
| **scout-block** | Blocks node_modules/, .git/, __pycache__/, etc. from filling your context | PreToolUse |
| **privacy-block** | Blocks .env, SSH keys, credentials from being read in sessions | PreToolUse |
| **dangerous-cmd-block** | Blocks force-push, `rm -rf`, `git reset --hard` | PreToolUse |
| **iteration-context** | Injects recent TSV iteration data after context compaction | UserPromptSubmit |
| **subagent-context** | Gives subagents awareness of active loop state | SubagentStart |
| **dev-rules-reminder** | Re-injects plan path and code standards after compaction | UserPromptSubmit |
| **simplify-gate** | Warns at 400 LOC, blocks at 800 LOC before shipping | UserPromptSubmit |
| **session-init** | Sets up project context at session start | SessionStart |
| **stop-notify** | Terminal notification + optional webhook on session end | SessionEnd |

### Configuration

All hooks are **on by default**. Disable individually only for troubleshooting:

```bash
# Disable a specific hook
export AR_DISABLE_SCOUT_BLOCK=1
export AR_DISABLE_PRIVACY_BLOCK=1
export AR_DISABLE_DANGEROUS_CMD_BLOCK=1
# ... etc for each hook name
```

Optional webhook for session completion notifications:

```bash
export AR_NOTIFY_WEBHOOK=https://hooks.slack.com/services/...
```

Customize blocked directories with a `.ckignore` file (gitignore syntax) at your project root.

See [guide/hooks.md](guide/hooks.md) for full reference.

Release preparation and contributor verification live in [scripts/release.md](scripts/release.md).

---

## Commands

| Command | What it does | Default Iterations |
|---------|--------------|--------------------|
| `/autoresearch` | **Classic:** Core iterate loop: modify → verify → keep/discard · **Orchestrator:** free-form goal → auto-select pipeline → loop until predicate met | 25 / goal-bounded |
| `/autoresearch:plan` | Convert goal into validated config | one-shot |
| `/autoresearch:debug` | Hunt bugs via hypothesis iteration | 15 |
| `/autoresearch:fix` | Crush errors one-by-one to zero | 20 |
| `/autoresearch:security` | STRIDE + OWASP audit with red-team | 15 |
| `/autoresearch:ship` | Ship through 8 phases | linear |
| `/autoresearch:scenario` | Generate edge cases across 12 dimensions | 20 |
| `/autoresearch:predict` | 5 expert personas debate | one-shot |
| `/autoresearch:learn` | Scout → generate docs → validate → fix | 10 |
| `/autoresearch:reason` | Adversarial debate with blind judges | 8 |
| `/autoresearch:probe` | 8 personas interrogate requirements | 15 |
| `/autoresearch:improve` | Research ICP, discover improvements, generate PRDs | 15 |
| `/autoresearch:evals` | Analyze iteration results: trends, plateaus | one-shot |
| `/autoresearch:regression` | Stability gate: baseline vs candidate, verdict STABLE/UNSTABLE | one-shot |

**Universal flags:** `Iterations: N`, `Iterations: unlimited`, `--evals`, `--evals-interval N`, `--chain <targets>`, `--<subcommand>` shorthand.

**All commands use interactive setup when invoked without arguments.** Just type the command — the agent asks for what it needs with smart defaults based on your codebase.

> **OpenCode users:** Commands use underscore naming (`/autoresearch_debug`, `/autoresearch_fix`, etc.). All 14 commands available.
>
> **Codex users:** Invoke via `$autoresearch` mention syntax. Subcommands are keywords: `$autoresearch debug`, `$autoresearch plan`, etc.

### Quick Decision Guide

| I want to... | Use |
|--------------|-----|
| Give a plain-language goal, let it self-orchestrate | `/autoresearch <goal>` (bare, no Metric/Verify) |
| Improve test coverage / reduce bundle size / any metric | `/autoresearch` |
| Run bounded iterations | Add `Iterations: N` to any command |
| Don't know what metric to use | `/autoresearch:plan` |
| Run a security audit | `/autoresearch:security` |
| Ship a PR / deployment / release | `/autoresearch:ship` |
| Optimize without breaking existing tests | Add `Guard: npm test` |
| Hunt all bugs in a codebase | `/autoresearch:debug` |
| Fix all errors (tests, types, lint) | `/autoresearch:fix` |
| Debug then auto-fix | `/autoresearch:debug --fix` |
| Check if something is ready to ship | `/autoresearch:ship --checklist-only` |
| Explore edge cases for a feature | `/autoresearch:scenario` |
| Generate test scenarios | `/autoresearch:scenario --format test-scenarios` |
| Get expert opinions before starting | `/autoresearch:predict` |
| Analyze from multiple angles then debug | `/autoresearch:predict --chain debug` |
| Generate docs for a new codebase | `/autoresearch:learn --mode init` |
| Update existing docs after changes | `/autoresearch:learn --mode update` |
| Debate an architecture decision | `/autoresearch:reason --domain software` |
| Surface hidden constraints before starting | `/autoresearch:probe` |
| Pre-flight a fuzzy goal then loop | `/autoresearch:probe --chain plan,autoresearch` |
| Discover what to build next for your ICP | `/autoresearch:improve` |
| Research competitors and generate PRDs | `/autoresearch:improve --depth deep` |
| Probe requirements then research improvements | `/autoresearch:probe --improve` |
| Analyze trends and plateaus across past runs | `/autoresearch:evals` |
| Check if a run has stalled | `/autoresearch:evals --file *-results.tsv` |
| Verify a change won't regress before pushing | `/autoresearch:regression` |
| Gate a PR: predict, fix, re-gate, then ship | `/autoresearch:regression --predict --fix --ship` |

---

## Quick Start

### Claude Code

**Option A — npx install (recommended):**

```bash
npx skills add uditgoenka/autoresearch
```

All 14 commands are available after restarting Claude Code.

**Option B — Plugin install:**

```
/plugin marketplace add uditgoenka/autoresearch
/plugin install autoresearch@autoresearch
```

> **Note:** Start a new Claude Code session after installing. Reference files aren't resolvable in the same session where installation happened — this is a Claude Code platform limitation.

**Updating (no reinstall needed):**
```
/plugin update autoresearch
```

Run `/reload-plugins` to activate. No need to uninstall or re-clone.

**Option C — Manual copy:**
```bash
git clone https://github.com/uditgoenka/autoresearch.git

# Copy skill + subcommands to your project
cp -r autoresearch/.claude/skills/autoresearch .claude/skills/autoresearch
cp -r autoresearch/.claude/commands/autoresearch .claude/commands/autoresearch
cp autoresearch/.claude/commands/autoresearch.md .claude/commands/autoresearch.md
```

Or install globally:
```bash
cp -r autoresearch/.claude/skills/autoresearch ~/.claude/skills/autoresearch
cp -r autoresearch/.claude/commands/autoresearch ~/.claude/commands/autoresearch
cp autoresearch/.claude/commands/autoresearch.md ~/.claude/commands/autoresearch.md
```

**Option D — Guided installer:**
```bash
git clone https://github.com/uditgoenka/autoresearch.git
cd autoresearch
./scripts/install.sh --claude --global
```

### OpenCode Quick Start

**Option A — Guided installer (recommended):**
```bash
git clone https://github.com/uditgoenka/autoresearch.git
cd autoresearch
./scripts/install.sh --opencode --global
```

**Option B — Manual copy:**
```bash
git clone https://github.com/uditgoenka/autoresearch.git

cp -r autoresearch/.opencode/skills/autoresearch .opencode/skills/autoresearch
cp autoresearch/.opencode/commands/autoresearch*.md .opencode/commands/
```

Or globally:
```bash
cp -r autoresearch/.opencode/skills/autoresearch ~/.config/opencode/skills/autoresearch
cp autoresearch/.opencode/commands/autoresearch*.md ~/.config/opencode/commands/
```

> All 14 commands available as `/autoresearch_debug`, `/autoresearch_fix`, `/autoresearch_improve`, etc.

### Codex Quick Start

**Option A — Guided installer (recommended):**
```bash
git clone https://github.com/uditgoenka/autoresearch.git
cd autoresearch
./scripts/install.sh --codex --global
```

**Option B — Manual copy:**
```bash
git clone https://github.com/uditgoenka/autoresearch.git
cp -r autoresearch/.agents/skills/autoresearch ~/.codex/skills/autoresearch
```

> Invoke via `$autoresearch` mention syntax. Subcommands are keywords: `$autoresearch plan`, `$autoresearch debug`, `$autoresearch evals`, etc.
> The installed Codex package includes the bundled orchestrator and regression helpers under `

> _README 过长已截断, 完整内容请查看 GitHub 仓库。_
