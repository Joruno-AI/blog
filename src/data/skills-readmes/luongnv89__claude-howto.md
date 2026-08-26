<picture>
  <source media="(prefers-color-scheme: dark)" srcset="resources/logos/claude-howto-logo-dark.svg">
  <img alt="Claude How To" src="resources/logos/claude-howto-logo.svg">
</picture>

<p align="center">
  <a href="https://github.com/trending">
    <img src="https://img.shields.io/badge/GitHub-🔥%20%231%20Trending-purple?style=for-the-badge&logo=github"/>
  </a>
</p>

[![GitHub Stars](https://img.shields.io/github/stars/luongnv89/claude-howto?style=flat&color=gold)](https://github.com/luongnv89/claude-howto/stargazers)
[![GitHub Forks](https://img.shields.io/github/forks/luongnv89/claude-howto?style=flat)](https://github.com/luongnv89/claude-howto/network/members)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-2.1.235-brightgreen)](CHANGELOG.md)
[![Claude Code](https://img.shields.io/badge/Claude_Code-2.1+-purple)](https://code.claude.com)

🌐 **Language / Ngôn ngữ / 语言 / Мова:** [English](README.md) | [Tiếng Việt](vi/README.md) | [中文](zh/README.md) | [Українська](uk/README.md) | [日本語](ja/README.md)

# Master Claude Code in a Weekend

Go from typing `claude` to orchestrating agents, hooks, skills, and MCP servers — with visual tutorials, copy-paste templates, and a guided learning path.

**[Get Started in 15 Minutes](#get-started-in-15-minutes)** | **[Find Your Level](#not-sure-where-to-start)** | **[Browse the Feature Catalog](CATALOG.md)**

---

## Table of Contents

- [The Problem](#the-problem)
- [How Claude How To Fixes This](#how-claude-how-to-fixes-this)
- [How It Works](#how-it-works)
- [Not Sure Where to Start?](#not-sure-where-to-start)
- [Get Started in 15 Minutes](#get-started-in-15-minutes)
- [What Can You Build With This?](#what-can-you-build-with-this)
- [FAQ](#faq)
- [Contributing](#contributing)
- [License](#license)

---

## The Problem

You installed Claude Code. You ran a few prompts. Now what?

- **The official docs describe features — but don't show you how to combine them.** You know slash commands exist, but not how to chain them with hooks, memory, and subagents into a workflow that actually saves hours.
- **There's no clear learning path.** Should you learn MCP before hooks? Skills before subagents? You end up skimming everything and mastering nothing.
- **Examples are too basic.** A "hello world" slash command doesn't help you build a production code review pipeline that uses memory, delegates to specialized agents, and runs security scans automatically.

You're leaving 90% of Claude Code's power on the table — and you don't know what you don't know.

---

## How Claude How To Fixes This

This isn't another feature reference. It's a **structured, visual, example-driven guide** that teaches you to use every Claude Code feature with real-world templates you can copy into your project today.

| | Official Docs | This Guide |
|--|---------------|------------|
| **Format** | Reference documentation | Visual tutorials with Mermaid diagrams |
| **Depth** | Feature descriptions | How it works under the hood |
| **Examples** | Basic snippets | Production-ready templates you use immediately |
| **Structure** | Feature-organized | Progressive learning path (beginner to advanced) |
| **Onboarding** | Self-directed | Guided roadmap with time estimates |
| **Self-Assessment** | None | Interactive quizzes to find your gaps and build a personalized path |

### What you get:

- **10 tutorial modules** covering every Claude Code feature — from slash commands to custom agent teams
- **Copy-paste configs** — slash commands, CLAUDE.md templates, hook scripts, MCP configs, subagent definitions, and full plugin bundles
- **Mermaid diagrams** showing how each feature works internally, so you understand *why*, not just *how*
- **A guided learning path** that takes you from beginner to power user in 11-13 hours
- **Built-in self-assessment** — run `/self-assessment` or `/lesson-quiz hooks` directly in Claude Code to identify gaps

**[Start the Learning Path  ->](LEARNING-ROADMAP.md)**

---

## How It Works

### 1. Find your level

Take the [self-assessment quiz](LEARNING-ROADMAP.md#-find-your-level) or run `/self-assessment` in Claude Code. Get a personalized roadmap based on what you already know.

### 2. Follow the guided path

Work through 10 modules in order — each builds on the last. Copy templates directly into your project as you learn.

### 3. Combine features into workflows

The real power is in combining features. Learn to wire slash commands + memory + subagents + hooks into automated pipelines that handle code reviews, deployments, and documentation generation.

### 4. Test your understanding

Run `/lesson-quiz [topic]` after each module. The quiz pinpoints what you missed so you can fill gaps fast.

**[Get Started in 15 Minutes](#get-started-in-15-minutes)**

---

## Trusted by Developers

- **GitHub stars** from developers who use Claude Code daily
- **Forks** from teams adapting this guide for their own workflows
- **Actively maintained** — synced with every Claude Code release (latest: v2.1.245, August 2026)
- **Community-driven** — contributions from developers who share their real-world configurations

[![Star History Chart](https://api.star-history.com/svg?repos=luongnv89/claude-howto&type=Date)](https://star-history.com/#luongnv89/claude-howto&Date)

---

## Not Sure Where to Start?

Take the self-assessment or pick your level:

| Level | You can... | Start here | Time |
|-------|-----------|------------|------|
| **Beginner** | Start Claude Code and chat | [Slash Commands](01-slash-commands/) | ~2.5 hours |
| **Intermediate** | Use CLAUDE.md and custom commands | [Skills](03-skills/) | ~3.5 hours |
| **Advanced** | Configure MCP servers and hooks | [Advanced Features](09-advanced-features/) | ~5 hours |

**Full learning path with all 10 modules:**

| Order | Module | Level | Time |
|-------|--------|-------|------|
| 1 | [Slash Commands](01-slash-commands/) | Beginner | 30 min |
| 2 | [Memory](02-memory/) | Beginner+ | 45 min |
| 3 | [Checkpoints](08-checkpoints/) | Intermediate | 45 min |
| 4 | [CLI Basics](10-cli/) | Beginner+ | 30 min |
| 5 | [Skills](03-skills/) | Intermediate | 1 hour |
| 6 | [Hooks](06-hooks/) | Intermediate | 1 hour |
| 7 | [MCP](05-mcp/) | Intermediate+ | 1 hour |
| 8 | [Subagents](04-subagents/) | Intermediate+ | 1.5 hours |
| 9 | [Advanced Features](09-advanced-features/) | Advanced | 2-3 hours |
| 10 | [Plugins](07-plugins/) | Advanced | 2 hours |

**[Complete Learning Roadmap ->](LEARNING-ROADMAP.md)**

---

## Get Started in 15 Minutes

> **Installation note**: Starting in v2.1.113, Claude Code ships as a native per-platform binary (macOS/Linux/Windows). `npm install -g @anthropic-ai/claude-code` still works — the native binary is downloaded as an optional dep on first use. As of v2.1.116, downloads come from `https://downloads.claude.ai/claude-code-releases` — corporate proxies must allowlist this host.

```bash
# 1. Clone the guide
git clone https://github.com/luongnv89/claude-howto.git
cd claude-howto

# 2. Copy your first slash command
mkdir -p /path/to/your-project/.claude/commands
cp 01-slash-commands/optimize.md /path/to/your-project/.claude/commands/

# 3. Try it — in Claude Code, type:
# /optimize

# 4. Ready for more? Set up project memory:
cp 02-memory/project-CLAUDE.md /path/to/your-project/CLAUDE.md

# 5. Install a skill:
cp -r 03-skills/code-review-specialist ~/.claude/skills/
```

Want the full setup? Here's the **1-hour essential setup**:

```bash
# Slash commands (15 min)
cp 01-slash-commands/*.md .claude/commands/

# Project memory (15 min)
cp 02-memory/project-CLAUDE.md ./CLAUDE.md

# Install a skill (15 min)
cp -r 03-skills/code-review-specialist ~/.claude/skills/

# Weekend goal: add hooks, subagents, MCP, and plugins
# Follow the learning path for guided setup
```

**[View the Full Installation Reference](#get-started-in-15-minutes)**

---

## What Can You Build With This?

| Use Case | Features You'll Combine |
|----------|------------------------|
| **Automated Code Review** | Slash Commands + Subagents + Memory + MCP |
| **Team Onboarding** | Memory + Slash Commands + Plugins |
| **CI/CD Automation** | CLI Reference + Hooks + Background Tasks |
| **Documentation Generation** | Skills + Subagents + Plugins |
| **Security Audits** | Subagents + Skills + Hooks (read-only mode) |
| **DevOps Pipelines** | Plugins + MCP + Hooks + Background Tasks |
| **Complex Refactoring** | Checkpoints + Planning Mode + Hooks |

---

## FAQ

**Is this free?**
Yes. MIT licensed, free forever. Use it in personal projects, at work, in your team — no restrictions beyond including the license notice.

**Is this maintained?**
Actively. The guide is synced with every Claude Code release. Current version: v2.1.245 (August 2026), compatible with Claude Code 2.1+.

**How is this different from the official docs?**
The official docs are a feature reference. This guide is a tutorial with diagrams, production-ready templates, and a progressive learning path. They complement each other — start here to learn, reference the docs when you need specifics.

**How long does it take to go through everything?**
11-13 hours for the full path. But you'll get immediate value in 15 minutes — just copy a slash command template and try it.

**Can I use this with Claude Sonnet / Haiku / Opus?**
Yes. All templates work with Claude Opus 5, Claude Sonnet 5, Claude Sonnet 4.6, Claude Opus 4.8, and Claude Haiku 4.5.

**Can I contribute?**
Absolutely. See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines. We welcome new examples, bug fixes, documentation improvements, and community templates.

**Can I read this offline?**
Yes. Run `uv run scripts/build_epub.py` to generate an EPUB ebook with all content and rendered diagrams.

---

## Start Mastering Claude Code Today

You already have Claude Code installed. The only thing between you and 10x productivity is knowing how to use it. This guide gives you the structured path, the visual explanations, and the copy-paste templates to get there.

MIT licensed. Free forever. Clone it, fork it, make it yours.

**[Start the Learning Path ->](LEARNING-ROADMAP.md)** | **[Browse the Feature Catalog](CATALOG.md)** | **[Get Started in 15 Minutes](#get-started-in-15-minutes)**

---

<details>
<summary>Quick Navigation — All Features</summary>

| Feature | Description | Folder |
|---------|-------------|--------|
| **Feature Catalog** | Complete reference with installation commands | [CATALOG.md](CATALOG.md) |
| **Slash Commands** | User-invoked shortcuts | [01-slash-commands/](01-slash-commands/) |
| **Memory** | Persistent context | [02-memory/](02-memory/) |
| **Skills** | Reusable capabilities | [03-skills/](03-skills/) |
| **Subagents** | Specialized AI assistants | [04-subagents/](04-subagents/) |
| **MCP Protocol** | External tool access | [05-mcp/](05-mcp/) |
| **Hooks** | Event-driven automation | [06-hooks/](06-hooks/) |
| **Plugins** | Bundled features | [07-plugins/](07-plugins/) |
| **Checkpoints** | Session snapshots & rewind | [08-checkpoints/](08-checkpoints/) |
| **Advanced Features** | Planning, thinking, background tasks | [09-advanced-features/](09-advanced-features/) |
| **CLI Reference** | Commands, flags, and options | [10-cli/](10-cli/) |
| **Blog Posts** | Real-world usage examples | [Blog Posts](https://medium.com/@luongnv89) |

</details>

<details>
<summary>Feature Comparison</summary>

| Feature | Invocation | Persistence | Best For |
|---------|-----------|------------|----------|
| **Slash Commands** | Manual (`/cmd`) | Session only | Quick shortcuts |
| **Memory** | Auto-loaded | Cross-session | Long-term learning |
| **Skills** | Auto-invoked | Filesystem | Automated workflows |
| **Subagents** | Auto-delegated | Isolated context | Task distribution |
| **MCP Protocol** | Auto-queried | Real-time | Live data access |
| **Hooks** | Event-triggered | Configured | Automation & validation |
| **Plugins** | One command | All features | Complete solutions |
| **Checkpoints** | Manual/Auto | Session-based | Safe experimentation |
| **Planning Mode** | Manual/Auto | Plan phase | Complex implementations |
| **Background Tasks** | Manual | Task duration | Long-running operations |
| **CLI Reference** | Terminal commands | Session/Script | Automation & scripting |

</details>

<details>
<summary>Installation Quick Reference</summary>

```bash
# Slash Commands
cp 01-slash-commands/*.md .claude/commands/

# Memory
cp 02-memory/project-CLAUDE.md ./CLAUDE.md

# Skills
cp -r 03-skills/code-review-specialist ~/.claude/skills/

# Subagents
cp 04-subagents/*.md .claude/agents/

# MCP
export GITHUB_TOKEN="token"
claude mcp add github -- npx -y @modelcontextprotocol/server-github

# Hooks
mkdir -p ~/.claude/hooks
cp 06-hooks/*.sh ~/.claude/hooks/
chmod +x ~/.claude/hooks/*.sh

# Plugins
/plugin install pr-review

# Checkpoints (auto-enabled, configure in settings)
# See 08-checkpoints/README.md

# Advanced Features (configure in settings)
# See 09-advanced-features/config-examples.json

# CLI Reference (no installation needed)
# See 10-cli/README.md for usage examples
```

</details>

<details>
<summary>01. Slash Commands</summary>

**Location**: [01-slash-commands/](01-slash-commands/)

**What**: User-invoked shortcuts stored as Markdown files

**Examples**:
- `optimize.md` - Code optimization analysis
- `pr.md` - Pull request preparation
- `generate-api-docs.md` - API documentation generator

**Installation**:
```bash
cp 01-slash-commands/*.md /path/to/project/.claude/commands/
```

**Usage**:
```
/optimize
/pr
/generate-api-docs
```

**Learn More**: [Discovering Claude Code Slash Commands](https://medium.com/@luongnv89/discovering-claude-code-slash-commands-cdc17f0dfb29)

</details>

<details>
<summary>02. Memory</summary>

**Location**: [02-memory/](02-memory/)

**What**: Persistent context across sessions

**Examples**:
- `project-CLAUDE.md` - Team-wide project standards
- `directory-api-CLAUDE.md` - Directory-specific rules
- `personal-CLAUDE.md` - Personal preferences

**Installation**:
```bash
# Project memory
cp 02-memory/project-CLAUDE.md /path/to/project/CLAUDE.md

# Directory memory
cp 02-memory/directory-api-CLAUDE.md /path/to/project/src/api/CLAUDE.md

# Personal memory
cp 02-memory/personal-CLAUDE.md ~/.claude/CLAUDE.md
```

**Usage**: Automatically loaded by Claude

</details>

<details>
<summary>03. Skills</summary>

**Location**: [03-skills/](03-skills/)

**What**: Reusable, auto-invoked capabilities with instructions and scripts

**Examples**:
- `code-review-specialist/` - Comprehensive code review with scripts
- `brand-voice/` - Brand voice consistency checker
- `doc-generator/` - API documentation generator

**Installation**:
```bash
# Personal skills
cp -r 03-skills/code-review-specialist ~/.claude/skills/

# Project skills
cp -r 03-skills/code-review-specialist /path/to/project/.claude/skills/
```

**Usage**: Automatically invoked when

> _README 过长已截断, 完整内容请查看 GitHub 仓库。_
