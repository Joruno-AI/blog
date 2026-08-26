English | [한국어](README.ko.md) | [中文](README.zh.md) | [日本語](README.ja.md) | [Español](README.es.md) | [Tiếng Việt](README.vi.md) | [Português](README.pt.md)

# oh-my-claudecode

[![npm version](https://img.shields.io/npm/v/oh-my-claude-sisyphus?color=cb3837)](https://www.npmjs.com/package/oh-my-claude-sisyphus)
[![npm downloads](https://img.shields.io/npm/dm/oh-my-claude-sisyphus?color=blue)](https://www.npmjs.com/package/oh-my-claude-sisyphus)
[![GitHub stars](https://img.shields.io/github/stars/Yeachan-Heo/oh-my-claudecode?style=flat&color=yellow)](https://github.com/Yeachan-Heo/oh-my-claudecode/stargazers)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![Sponsor](https://img.shields.io/badge/Sponsor-❤️-red?style=flat&logo=github)](https://github.com/sponsors/Yeachan-Heo)
[![Discord](https://img.shields.io/discord/1452487457085063218?color=5865F2&logo=discord&logoColor=white&label=Discord)](https://discord.gg/wSyUQYfhAw)

> **For Codex users:** Check out [oh-my-codex](https://github.com/Yeachan-Heo/oh-my-codex) — the same orchestration experience for OpenAI Codex CLI.

> **Liked OmC but found it a bit overkill? Try [gajae-code](https://github.com/Yeachan-Heo/gajae-code).**
> Keeps Claude OAuth as-is while being faster, cheaper, simpler, and more powerful — with an SDK-based integration path built for OpenClaw, Hermes, Grokbot, and similar agent runtimes.

**Multi-agent orchestration for Claude Code. Zero learning curve.**

_Don't learn Claude Code. Just use OMC._

[Get Started](#quick-start) • [Documentation](https://yeachan-heo.github.io/oh-my-claudecode-website) • [CLI Reference](https://yeachan-heo.github.io/oh-my-claudecode-website/docs/#cli-reference) • [Workflows](https://yeachan-heo.github.io/oh-my-claudecode-website/docs/#workflows) • [Migration Guide](docs/MIGRATION.md) • [Discord](https://discord.gg/wSyUQYfhAw)

---

## Core Maintainers

| Role           | Name        | GitHub                                         |
| -------------- | ----------- | ---------------------------------------------- |
| Creator & Lead | Yeachan Heo | [@Yeachan-Heo](https://github.com/Yeachan-Heo) |

## Ambassadors

| Name       | GitHub                                           |
| ---------- | ------------------------------------------------ |
| Sigrid Jin | [@sigridjineth](https://github.com/sigridjineth) |

## Document Specialists

| Name    | GitHub                                 |
| ------- | -------------------------------------- |
| devswha | [@devswha](https://github.com/devswha) |

## Top Collaborators

| Name           | GitHub                                         | Commits |
| -------------- | ---------------------------------------------- | ------- |
| JunghwanNA     | [@shaun0927](https://github.com/shaun0927)     | 65      |
| riftzen-bit    | [@riftzen-bit](https://github.com/riftzen-bit) | 52      |
| Seunggwan Song | [@Nathan-Song](https://github.com/Nathan-Song) | 20      |
| BLUE           | [@blue-int](https://github.com/blue-int)       | 20      |
| Junho Yeo      | [@junhoyeo](https://github.com/junhoyeo)       | 15      |

## Quick Start

**Step 1: Install**

Marketplace/plugin install (recommended for most Claude Code users).
These are Claude Code slash commands — enter them **one at a time** (pasting both lines at once will fail):

```bash
/plugin marketplace add https://github.com/Yeachan-Heo/oh-my-claudecode
```

Then:

```bash
/plugin install oh-my-claudecode
```

If you prefer the npm CLI/runtime path instead of the marketplace flow:

```bash
npm i -g oh-my-claude-sisyphus@latest
```

> **Known npm warning:** npm may print `deprecated prebuild-install@7.1.3` during the CLI install.
> This currently comes from the upstream `better-sqlite3` native-addon dependency
> (`better-sqlite3 -> prebuild-install`); `prebuild-install@7.1.3` is still the latest
> published version, so there is no safe repo-side dependency bump or override to remove
> the warning yet. The warning is tracked in [#2913](https://github.com/Yeachan-Heo/oh-my-claudecode/issues/2913)
> and does not by itself mean the OMC CLI install failed.

**Step 2: Setup**

```bash
# Inside a Claude Code / OMC session
/omc-setup

# From your terminal
omc setup
```

If you run OMC via `omc --plugin-dir <path>` or `claude --plugin-dir <path>`, add `--plugin-dir-mode` to `omc setup` (or export `OMC_PLUGIN_ROOT` before running it) so the installer doesn't duplicate skills/agents that the plugin already provides at runtime. See the [Plugin directory flags section in REFERENCE.md](./docs/REFERENCE.md#plugin-directory-flags) for a complete decision matrix and all available flags.

**Step 3: Build something**

```bash
# Inside a Claude Code / OMC session
/autopilot "build a REST API for managing tasks"

# Natural-language in-session shortcut
autopilot: build a REST API for managing tasks
```

#### Named autopilot stage profiles (v1)

Select a configured stage profile only through `/autopilot --workflow <name> <task>`:

```text
/autopilot --workflow plan-build-qa "build a REST API for managing tasks"
```

Profiles are configured under `autopilot.workflows` in `.claude/omc.jsonc` (project) or `~/.config/claude-omc/config.jsonc` (user). A v1 profile contains only `version: 1` and `stages`:

```jsonc
{
  "autopilot": {
    "workflows": {
      "plan-build-qa": {
        "version": 1,
        "stages": ["ralplan", "execution", "qa"]
      }
    }
  }
}
```

The admitted sequences are `[ralplan, execution]`, `[ralplan, execution, ralph]`, `[ralplan, execution, qa]`, and `[ralplan, execution, ralph, qa]`. A project profile of the same name wholly replaces the user profile; different names coexist. Environment variables cannot define profiles. Profiles remain within autopilot's existing state, cancel, resume, Stop, and HUD lifecycle; legacy invocations without `--workflow` remain compatible.

Named profiles currently require Linux with the `flock` utility because their transcript evidence boundary uses Linux no-follow file-descriptor traversal and their recoverable mutation lock uses kernel advisory locking. Unsupported environments reject explicit `--workflow` invocation before creating or changing autopilot state; legacy autopilot remains available.

V1 intentionally excludes model fields or routing (`stageModels`), inline execution, dynamic commands/modes/state, arbitrary stages or plugins, and the separate custom-skill frontmatter parser mismatch. See [Named Autopilot Stage Profiles ADR](docs/adr/03487-named-autopilot-stage-profiles.md) and [Reference](docs/REFERENCE.md#named-autopilot-stage-profiles-v1).


That's it. Everything else is automatic.

### CLI Commands vs In-Session Skills

OMC exposes two different surfaces:

- **Terminal CLI commands**: run `omc ...` from your shell after installing the npm/runtime path (`npm i -g oh-my-claude-sisyphus@latest`) or from a local checkout.
- **In-session skills**: run `/...` inside a Claude Code session after installing the plugin/setup flow.

| Feature                                        | Terminal CLI                                  | In-session skill                                                        | Notes                                                                                                                                |
| ---------------------------------------------- | --------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Setup                                          | `omc setup`                                   | `/omc-setup`                                                            | Both are real entrypoints.                                                                                                            |
| Ask providers                                  | `omc ask codex "review this patch"`           | `/ask codex "review this patch"`                                        | Both route through the same advisor flow. Providers: `claude`, `codex`, `gemini`, `antigravity`, `grok`, `cursor`.                                            |
| Team orchestration                             | `omc team 2:codex "review auth flow"`         | `/team 3:executor "fix all TypeScript errors"`                          | Both exist, but they are different runtimes: `omc team` launches tmux CLI workers; `/team` runs the in-session native team workflow. |
| Autopilot / Ralph / Execute / Deep Interview   | —                                             | `/autopilot ...`, `/ralph ...`, `/execute ...`, `/deep-interview ...`   | These are in-session skills. There is no `omc autopilot` / `omc ralph` / `omc execute` CLI subcommand in this repo.                  |
| Autoresearch                                   | `omc autoresearch` (**hard-deprecated shim**) | `/deep-interview --autoresearch ...` + `/oh-my-claudecode:autoresearch` | Setup stays in deep-interview; execution now belongs to the stateful skill.                                                          |

### VS Code, Agent SDK, and automation scope

- **VS Code / IDE extension**: OMC does not ship a VS Code extension and does not document extension-specific install or automation flows. Use the Claude Code plugin or terminal CLI surfaces above; IDE integrations are only an optional way to access Claude Code itself.
- **Agent SDK / programmatic usage**: the npm package exports TypeScript helpers such as `createOmcSession()` and prompt expansion utilities for local Node.js programs using `@anthropic-ai/claude-agent-sdk`. This is a library surface, not a replacement for the Claude Code plugin UI.
- **CI/CD and headless automation**: prefer deterministic terminal commands (`omc setup`, `omc ask`, `omc session search`, repository scripts such as `npm run sync-metadata:verify`) and set `ANTHROPIC_API_KEY` or provider-specific CLI auth in the runner environment. Do not rely on interactive slash commands (`/autopilot`, `/ralph`, `/execute`, `/team`) in CI; they require an active Claude Code session.

### Not Sure Where to Start?

If you're uncertain about requirements, have a vague idea, or want to micromanage the design:

```
/deep-interview "I want to build a task management app"
```

The deep interview uses Socratic questioning to clarify your thinking before any code is written. It exposes hidden assumptions and measures clarity across weighted dimensions, ensuring you know exactly what to build before execution begins.

## Team Mode (Recommended)

Starting in **v4.1.7**, **Team** is the canonical orchestration surface in OMC. The legacy `swarm` keyword/skill has been removed; use `team` directly.

```bash
/team 3:executor "fix all TypeScript errors"
```

Use `/team ...` when you want Claude Code's in-session native team workflow. Use `omc team ...` when you want terminal-launched tmux CLI workers (`claude` / `codex` / `gemini` panes).

Team runs as a staged pipeline:

`team-plan → team-prd → team-exec → team-verify → team-fix (loop)`

Enable Claude Code native teams in `~/.claude/settings.json`:

```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

> If teams are disabled, OMC will warn you and fall back to non-team execution where possible.

### tmux CLI Workers — Codex, Gemini & Antigravity (v4.4.0+)

**v4.4.0 removes the Codex/Gemini MCP servers** (`x`, `g` providers). Use the CLI-first Team runtime (`omc team ...`) to spawn real tmux worker panes:

```bash
omc team 2:codex "review auth module for security issues"
omc team 2:gemini "redesign UI components for accessibility"
omc team 2:antigravity "redesign UI components for accessibility"
omc team 1:claude "implement the payment flow"
omc team 1:cursor "implement the payment flow"
omc team status auth-review
omc team shutdown auth-review
```

For mixed Codex + Antigravity work in one command, run `/ask codex` and `/ask antigravity` and have Claude synthesize the results (Gemini remains available as an enterprise/API-key fallback):

```bash
/ask codex "Review this PR — architecture"
/ask antigravity "Review this PR — UI components"
```

| Surface                         | Workers                       | Best For                                     |
| ------------------------------- | ----------------------------- | -------------------------------------------- |
| `omc team N:codex "..."`        | N Codex CLI panes             | Code review, security analysis, architecture |
| `omc team N:gemini "..."`       | N Gemini CLI panes            | UI/UX design, docs, large-context tasks (enterprise/API-key) |
| `omc team N:antigravity "..."`  | N Antigravity (`agy`) panes   | UI/UX design, docs, large-context tasks                      |
| `omc team N:grok "..."`         | N Grok Build CLI panes        | Code review, analysis cross-check            |
| `omc team N:cursor "..."`       | N Cursor agent panes          | Executor-style implementation tasks          |
| `omc team N:claude "..."`       | N Claude CLI panes            | General tasks via Claude CLI in tmux         |
| `/ask codex` + `/ask antigravity` | Tri-model advisor synthesis | Mixed Codex + Antigravity review in one pass |

Workers spawn on-demand and die when their task completes — no idle resource usage. Requires the selected CLI (`codex`, `gemini`, `agy` (antigravity), `grok`, or `cursor-agent`) installed/authenticated and an active tmux session.

Autopilot can prefer Cursor executor workers during team execution via `.claude/omc.jsonc`:

```jsonc
{
  "autopilot": {
    "execution": "team",
    "team": { "agentTypes": ["cursor"] }
  }
}
```

This config makes the autopilot execution stage use `omc team 1:cursor "..."` or `/team 1:cursor "..."` for executor-style implementation work. Reviewer, critic, security-review, validation verdict, and final approval roles remain native Claude/OMC reviewer roles; Cursor requires an installed/authenticated `cursor-agent`.

Native team worker worktrees are being added behind an opt-in/config gate. See [Native Team Worktree Mode](docs/TEAM-WORKTREE-MODE.md) for the workspace contract, canonical state-root rules, dirty-worktree preservation policy, and verification checklist.

> **Note: Package naming** — The project is branded as **oh-my-claudecode** (repo, plugin, commands), but the npm package is published as [`oh-my-claude-sisyphus`](https://www.npmjs.com/package/oh-my-claude-sisyphus). If you install or upgrade the CLI tools via npm/bun, use `npm i -g oh-my-claude-sisyphus@latest`; the package installs both `oh-my-claudecode` and the short `omc` command aliases.

### Updating

If you installed OMC via npm, upgrade with the published package name:

```bash
npm i -g oh-my-claude-sisyphus@latest
```

> **Package naming note:** the repo, plugin, and commands are branded **oh-my-claudecode**, b

> _README 过长已截断, 完整内容请查看 GitHub 仓库。_
