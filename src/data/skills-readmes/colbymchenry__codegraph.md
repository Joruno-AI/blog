<div align="center">

# CodeGraph

Already installed? Run `codegraph upgrade`

Follow [@getcodegraph](https://x.com/getcodegraph) on X for updates.

### Supercharge Claude Code, Cursor, Codex, OpenCode, Hermes Agent, Gemini, Antigravity, Kiro, and GitHub Copilot with Semantic Code Intelligence

**The fastest complete code graph · surgical context · built for how agents actually work · 100% local**

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/colbymchenry/codegraph/main/assets/rust-logo-dark.svg?v=1">
  <img src="https://raw.githubusercontent.com/colbymchenry/codegraph/main/assets/rust-logo.svg?v=1" height="30" alt="Rust" align="center">
</picture>&nbsp; **Kernel powered by Rust**

### [Documentation & Website →](https://colbymchenry.github.io/codegraph/)

[![npm version](https://img.shields.io/npm/v/@colbymchenry/codegraph.svg)](https://www.npmjs.com/package/@colbymchenry/codegraph)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Self-contained](https://img.shields.io/badge/Node.js-bundled%20%C2%B7%20none%20required-brightgreen.svg)](https://nodejs.org/)
[![npm provenance](https://img.shields.io/badge/npm-provenance-brightgreen.svg)](#verified-releases)
[![Attested builds](https://img.shields.io/badge/releases-signed%20%26%20attested-brightgreen.svg)](#verified-releases)

[![Windows](https://img.shields.io/badge/Windows-supported-blue.svg)](#supported-platforms)
[![macOS](https://img.shields.io/badge/macOS-supported-blue.svg)](#supported-platforms)
[![Linux](https://img.shields.io/badge/Linux-supported-blue.svg)](#supported-platforms)

[![Claude Code](https://img.shields.io/badge/Claude_Code-supported-blueviolet.svg)](#supported-agents)
[![Cursor](https://img.shields.io/badge/Cursor-supported-blueviolet.svg)](#supported-agents)
[![Codex](https://img.shields.io/badge/Codex-supported-blueviolet.svg)](#supported-agents)
[![opencode](https://img.shields.io/badge/opencode-supported-blueviolet.svg)](#supported-agents)
[![Hermes Agent](https://img.shields.io/badge/Hermes_Agent-supported-blueviolet.svg)](#supported-agents)
[![Gemini](https://img.shields.io/badge/Gemini-supported-blueviolet.svg)](#supported-agents)
[![Antigravity](https://img.shields.io/badge/Antigravity-supported-blueviolet.svg)](#supported-agents)
[![Kiro](https://img.shields.io/badge/Kiro-supported-blueviolet.svg)](#supported-agents)
[![GitHub Copilot](https://img.shields.io/badge/GitHub_Copilot-supported-blueviolet.svg)](#supported-agents)

<br>

**The CodeGraph platform is coming** — for every PR, know exactly what to test, what could break, which flows are affected, and whether business logic is compromised.

<a href="https://getcodegraph.com"><img alt="Join the waitlist for early beta access" src="https://raw.githubusercontent.com/colbymchenry/codegraph/main/assets/waitlist.svg?v=2" height="52"></a>

<sub>Get <b>early beta access</b> to the hosted product · <a href="https://getcodegraph.com">getcodegraph.com</a></sub>

</div>

## Contents

- [Get Started](#get-started)
- [Language Support](#language-support)
- [Why CodeGraph?](#why-codegraph)
- [Key Features](#key-features)
- [Framework-aware Routes](#framework-aware-routes)
- [Mixed iOS / React Native / Expo bridging](#mixed-ios--react-native--expo-bridging)
- [Quick Start](#quick-start)
- [How It Works](#how-it-works)
- [CLI Reference](#cli-reference)
- [MCP Tools](#mcp-tools)
- [Library Usage](#library-usage)
- [Configuration](#configuration)
- [Telemetry](#telemetry)
- [Verified releases](#verified-releases)
- [Supported Platforms](#supported-platforms)
- [Supported Agents](#supported-agents)
- [Supported Languages](#supported-languages)
- [Measured cross-file coverage](#measured-cross-file-coverage)
- [Troubleshooting](#troubleshooting)
- [License](#license)

## Get Started

### 1. Install the CLI

**No Node.js required** — one command grabs the right build for your OS:

```bash
# macOS / Linux
curl -fsSL https://raw.githubusercontent.com/colbymchenry/codegraph/main/install.sh | sh

# Windows (PowerShell)
irm https://raw.githubusercontent.com/colbymchenry/codegraph/main/install.ps1 | iex
```

<details>
<summary><b>Already have Node? Use npm instead (works on any version)</b></summary>

```bash
npm i -g @colbymchenry/codegraph
```

<sub>CodeGraph bundles its own runtime — nothing to compile, no native build, works the same everywhere. The installer puts `codegraph` on your PATH but **doesn't change your current shell** — open a new terminal before the next step so the command resolves.</sub>

<sub>**Upgrade any time** with `codegraph upgrade` — it detects how you installed (bundle, npm, or npx) and updates in place. Add `--check` to see if an update is available, or `codegraph upgrade <version>` to pin one.</sub>

</details>

### 2. Wire up your agent(s)

In a **new terminal**, run the installer to connect CodeGraph to the agents you use:

```bash
codegraph install
```

<sub>Detects and auto-configures Claude Code, Cursor, Codex CLI, opencode, Hermes Agent, Gemini CLI, Antigravity IDE, Kiro, and GitHub Copilot (VS Code, Copilot CLI, JetBrains IDEs) — wiring the CodeGraph MCP server into each. **This is the step that connects CodeGraph to your agent;** installing the CLI in step 1 does not do it on its own. It only wires up your agent — it does **not** index any code; building each project's graph is the separate `codegraph init` in step 3. (Shortcut: `npx @colbymchenry/codegraph` downloads and runs this in one go.)</sub>

### 3. Initialize each project

```bash
cd your-project
codegraph init
```

<sub>`codegraph init` creates the local `.codegraph/` directory and builds the full graph in the same step — one command, done.</sub>

<div align="center">

![1_C_VYnhpys0UHrOuOgpgoyw](https://github.com/user-attachments/assets/f168182f-4d9a-44e0-94d7-08d018cc8a3a)

</div>

### 4. No more syncing!

Auto-sync is enabled by default. CodeGraph watches the project and updates the graph on every file change — while your agent edits code, or you add, modify, or delete files. **The index is never stale, and there is nothing to re-run.**

### Uninstall

Changed your mind? One command removes CodeGraph from every agent it configured **and** the CLI itself — every install it finds (standalone bundle, npm global package, launcher link), shown to you before anything is deleted:

```bash
codegraph uninstall
```

Pass `--keep-cli` to remove only the agent configurations and keep the CLI installed.

<sub>Reverses the installer — strips CodeGraph's MCP server config, instructions, and permissions from each configured agent. Your project indexes (`.codegraph/`) are left untouched; remove those per-project with `codegraph uninit`. Use `--target` to remove from specific agents, or `--yes` to run non-interactively.</sub>

---

## Language Support

Every language below gets the same treatment — full structural extraction and cross-file resolution into one graph, no per-language setup:

<p align="center">
  <img src="https://raw.githubusercontent.com/colbymchenry/codegraph/main/assets/languages/typescript.svg?v=1" width="104" height="104" alt="TypeScript" />
  <img src="https://raw.githubusercontent.com/colbymchenry/codegraph/main/assets/languages/javascript.svg?v=1" width="104" height="104" alt="JavaScript" />
  <img src="https://raw.githubusercontent.com/colbymchenry/codegraph/main/assets/languages/arkts.svg?v=1" width="104" height="104" alt="ArkTS" />
  <img src="https://raw.githubusercontent.com/colbymchenry/codegraph/main/assets/languages/python.svg?v=1" width="104" height="104" alt="Python" />
  <img src="https://raw.githubusercontent.com/colbymchenry/codegraph/main/assets/languages/go.svg?v=1" width="104" height="104" alt="Go" />
  <img src="https://raw.githubusercontent.com/colbymchenry/codegraph/main/assets/languages/rust.svg?v=1" width="104" height="104" alt="Rust" />
  <img src="https://raw.githubusercontent.com/colbymchenry/codegraph/main/assets/languages/java.svg?v=1" width="104" height="104" alt="Java" />
  <img src="https://raw.githubusercontent.com/colbymchenry/codegraph/main/assets/languages/csharp.svg?v=1" width="104" height="104" alt="C#" />
  <img src="https://raw.githubusercontent.com/colbymchenry/codegraph/main/assets/languages/php.svg?v=1" width="104" height="104" alt="PHP" />
  <img src="https://raw.githubusercontent.com/colbymchenry/codegraph/main/assets/languages/ruby.svg?v=1" width="104" height="104" alt="Ruby" />
  <img src="https://raw.githubusercontent.com/colbymchenry/codegraph/main/assets/languages/c.svg?v=1" width="104" height="104" alt="C" />
  <img src="https://raw.githubusercontent.com/colbymchenry/codegraph/main/assets/languages/cpp.svg?v=1" width="104" height="104" alt="C++" />
  <img src="https://raw.githubusercontent.com/colbymchenry/codegraph/main/assets/languages/objective-c.svg?v=1" width="104" height="104" alt="Objective-C" />
  <img src="https://raw.githubusercontent.com/colbymchenry/codegraph/main/assets/languages/metal.svg?v=1" width="104" height="104" alt="Metal" />
  <img src="https://raw.githubusercontent.com/colbymchenry/codegraph/main/assets/languages/cuda.svg?v=1" width="104" height="104" alt="CUDA" />
  <img src="https://raw.githubusercontent.com/colbymchenry/codegraph/main/assets/languages/swift.svg?v=1" width="104" height="104" alt="Swift" />
  <img src="https://raw.githubusercontent.com/colbymchenry/codegraph/main/assets/languages/kotlin.svg?v=1" width="104" height="104" alt="Kotlin" />
  <img src="https://raw.githubusercontent.com/colbymchenry/codegraph/main/assets/languages/scala.svg?v=1" width="104" height="104" alt="Scala" />
  <img src="https://raw.githubusercontent.com/colbymchenry/codegraph/main/assets/languages/dart.svg?v=1" width="104" height="104" alt="Dart" />
  <img src="https://raw.githubusercontent.com/colbymchenry/codegraph/main/assets/languages/svelte.svg?v=1" width="104" height="104" alt="Svelte" />
  <img src="https://raw.githubusercontent.com/colbymchenry/codegraph/main/assets/languages/vue.svg?v=1" width="104" height="104" alt="Vue" />
  <img src="https://raw.githubusercontent.com/colbymchenry/codegraph/main/assets/languages/astro.svg?v=1" width="104" height="104" alt="Astro" />
  <img src="https://raw.githubusercontent.com/colbymchenry/codegraph/main/assets/languages/liquid.svg?v=1" width="104" height="104" alt="Liquid" />
  <img src="https://raw.githubusercontent.com/colbymchenry/codegraph/main/assets/languages/delphi.svg?v=1" width="104" height="104" alt="Pascal / Delphi" />
  <img src="https://raw.githubusercontent.com/colbymchenry/codegraph/main/assets/languages/lua.svg?v=1" width="104" height="104" alt="Lua" />
  <img src="https://raw.githubusercontent.com/colbymchenry/codegraph/main/assets/languages/r.svg?v=1" width="104" height="104" alt="R" />
  <img src="https://raw.githubusercontent.com/colbymchenry/codegraph/main/assets/languages/luau.svg?v=1" width="104" height="104" alt="Luau" />
  <img src="https://raw.githubusercontent.com/colbymchenry/codegraph/main/assets/languages/cfml.svg?v=1" width="104" height="104" alt="CFML" />
  <img src="https://raw.githubusercontent.com/colbymchenry/codegraph/main/assets/languages/cobol.svg?v=1" width="104" height="104" alt="COBOL" />
  <img src="https://raw.githubusercontent.com/colbymchenry/codegraph/main/assets/languages/vbnet.svg?v=1" width="104" height="104" alt="Visual Basic .NET" />
  <img src="https://raw.githubusercontent.com/colbymchenry/codegraph/main/assets/languages/erlang.svg?v=1" width="104" height="104" alt="Erlang" />
  <img src="https://raw.githubusercontent.com/colbymchenry/codegraph/main/assets/languages/solidity.svg?v=1" width="104" height="104" alt="Solidity" />
  <img src="https://raw.githubusercontent.com/colbymchenry/codegraph/main/assets/languages/terraform.svg?v=1" width="104" height="104" alt="Terraform / OpenTofu" />
  <img src="https://raw.githubusercontent.com/colbymchenry/codegraph/main/assets/languages/nix.svg?v=1" width="104" height="104" alt="Nix" />
</p>

<sub>Per-language details — extensions, frameworks, and what exactly gets extracted — in [Supported Languages](#supported-languages).</sub>

---

## Why CodeGraph?

When an AI agent needs to understand code — to answer a question or make a change — it discovers structure the slow way: grep, glob, and Read, one file at a time, rebuilding call paths and dependencies by hand. That's a pile of tool calls and round-trips before it even starts the real work.

**CodeGraph hands the agent the exact code it needs in one call.** It's a pre-built knowledge graph of every symbol, call edge, and dependency in your codebase — so instead of crawling files, the agent asks one question and gets back the relevant source, the call paths between those symbols (including dynamic-dispatch hops grep can't follow), and the blast radius of a change. **Surgical context, not a file-by-file search** — which means fewer tool calls and faster answers on every codebase, large or small.

<img width="1536" height="1024" alt="token-cost-savings-scale" src="https://github.com/user-attachments/assets/eb74a11a-a3ab-4b01-80a6-19f78352ae8e" />

> **A note on cost:** CodeGraph's win on *every* codebase is precision — the agent stops crawling files and answers from the graph. On current models that precision is also a large direct saving: the 2026-08 re-measurement, on a harness that blocks the CLI in both arms, put it at **44% lower cost and 62% fewer tokens on average** across the seven benchmark repos, because a strong model *without* the graph burns its budget re-deriving structure. Cost tracks how much *discovery* a question demands more than raw repo size: 57–78% on questions the file-reading agent needed 28–43 tool calls to answer, near-even where it got there in 7.

> **A note on context:** the numbers above measure *throughput* — tokens processed, tools called, dollars spent to reach one answer. They don't measure what is still sitting in your context window afterward, and on that axis CodeGraph costs **more**, not less. Across the same seven repos in multi-turn sessions, CodeGraph's responses leave about **80% more retrieval context resident** at the end of a session than a file-reading agent's do — on VS Code, 67k tokens against 18k. The mechanism is the same one that makes it fast: CodeGraph returns one dense, verbatim payload that answers the question and then stays in the window, where a grep-and-read agent churns through many small results that get evicted. Fewer tokens *processed* and a larger persistent *footprint* are both real at once. If you run long sessions in a small window, budget for it. Measured per-repo: [`docs/benchmarks/residual-context-occupancy.md`](docs/benchmarks/residual-context-occupancy.md).

### Benchmark Results

Tested across **7 real-world open-source codebases** spanning 7 languages, comparing an agent (Claude Code, headless) answering one architecture question **with** and **without** CodeGraph, at t

> _README 过长已截断, 完整内容请查看 GitHub 仓库。_
