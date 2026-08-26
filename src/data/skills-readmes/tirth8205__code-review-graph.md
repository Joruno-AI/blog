<h1 align="center">code-review-graph</h1>

<p align="center">
  <a href="https://trendshift.io/repositories/23329?utm_source=repository-badge&amp;utm_medium=badge&amp;utm_campaign=badge-repository-23329"
     target="_blank"
     rel="noopener noreferrer">
    <img src="https://trendshift.io/api/badge/repositories/23329"
         alt="tirth8205%2Fcode-review-graph | Trendshift"
         width="250"
         height="55" />
  </a>
</p>

<p align="center">
  <strong>Stop burning tokens. Start reviewing smarter.</strong>
</p>
<p align="center">
  <a href="README.md">English</a> |
  <a href="README.zh-CN.md">简体中文</a> |
  <a href="README.ja-JP.md">日本語</a> |
  <a href="README.ko-KR.md">한국어</a> |
  <a href="README.hi-IN.md">हिन्दी</a>
</p>

<p align="center">
  <a href="https://pypi.org/project/code-review-graph/"><img src="https://img.shields.io/pypi/v/code-review-graph?style=flat-square&color=blue" alt="PyPI"></a>
  <a href="https://pepy.tech/project/code-review-graph"><img src="https://img.shields.io/pepy/dt/code-review-graph?style=flat-square" alt="Downloads"></a>
  <a href="https://github.com/tirth8205/code-review-graph/stargazers"><img src="https://img.shields.io/github/stars/tirth8205/code-review-graph?style=flat-square" alt="Stars"></a>
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square" alt="MIT Licence"></a>
  <a href="https://github.com/tirth8205/code-review-graph/actions/workflows/ci.yml"><img src="https://github.com/tirth8205/code-review-graph/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://www.python.org/"><img src="https://img.shields.io/badge/python-3.10%2B-blue.svg?style=flat-square" alt="Python 3.10+"></a>
  <a href="https://modelcontextprotocol.io/"><img src="https://img.shields.io/badge/MCP-compatible-green.svg?style=flat-square" alt="MCP"></a>
  <a href="https://code-review-graph.com"><img src="https://img.shields.io/badge/website-code--review--graph.com-blue?style=flat-square" alt="Website"></a>
  <a href="https://discord.gg/3p58KXqGFN"><img src="https://img.shields.io/badge/discord-join-5865F2?style=flat-square&logo=discord&logoColor=white" alt="Discord"></a>
</p>

<p align="center">
  <a href="docs/USAGE.md">Usage</a> ·
  <a href="docs/COMMANDS.md">Commands</a> ·
  <a href="docs/FAQ.md">FAQ</a> ·
  <a href="docs/TROUBLESHOOTING.md">Troubleshooting</a> ·
  <a href="docs/GITHUB_ACTION.md">GitHub Action</a> ·
  <a href="docs/REPRODUCING.md">Reproducing the benchmarks</a> ·
  <a href="docs/ROADMAP.md">Roadmap</a>
</p>

<br>

AI coding tools can end up re-reading large parts of your codebase on review tasks. `code-review-graph` fixes that. It builds a structural map of your code with [Tree-sitter](https://tree-sitter.github.io/tree-sitter/), tracks changes incrementally, and gives your AI assistant precise context via [MCP](https://modelcontextprotocol.io/) so it reads only what matters.

<p align="center">
  <img src="diagrams/diagram1_before_vs_after.png" alt="The Token Problem: reading flask's whole corpus costs 143,594 tokens, a graph answer costs 2,196 — 71.0x fewer" width="85%" />
</p>

---

## Quick Start

```bash
pip install code-review-graph                     # or: pipx install code-review-graph
code-review-graph install          # auto-detects and configures all supported platforms
code-review-graph build            # parse your codebase
```

One command sets up everything. `install` detects which AI coding tools you have, writes the correct MCP configuration for each one, installs platform-native hooks/skills where supported, and injects graph-aware instructions into your platform rules. It auto-detects whether you installed via `uvx` or `pip`/`pipx` and generates the right config. Restart your editor/tool after installing.

<p align="center">
  <img src="diagrams/diagram8_supported_platforms.png" alt="One Install, Every Platform: auto-detects Codex, Claude Code, CodeBuddy Code, Cursor, Windsurf, Zed, Continue, OpenCode, Antigravity, Gemini CLI, Qwen, Qoder, Kiro, GitHub Copilot, and GitHub Copilot CLI" width="85%" />
</p>

To target a specific platform:

```bash
code-review-graph install --platform codex       # configure only Codex
code-review-graph install --platform cursor      # configure only Cursor
code-review-graph install --platform claude-code  # configure only Claude Code
code-review-graph install --platform gemini-cli   # configure only Gemini CLI
code-review-graph install --platform antigravity   # configure only Antigravity
code-review-graph install --platform windsurf     # configure only Windsurf
code-review-graph install --platform zed          # configure only Zed
code-review-graph install --platform continue     # configure only Continue
code-review-graph install --platform opencode     # configure only OpenCode
code-review-graph install --platform qwen         # configure only Qwen
code-review-graph install --platform qoder        # configure only Qoder
code-review-graph install --platform kiro         # configure only Kiro
code-review-graph install --platform copilot      # configure only GitHub Copilot (VS Code)
code-review-graph install --platform copilot-cli  # configure only GitHub Copilot CLI
code-review-graph install --platform codebuddy    # configure only CodeBuddy Code
code-review-graph install --platform hermes       # configure only Hermes Agent
```

Requires Python 3.10+. For the best experience, install [uv](https://docs.astral.sh/uv/) (the MCP config will use `uvx` if available, otherwise falls back to the `code-review-graph` command directly).

To remove CRG from a Git or SVN project, use the symmetric uninstall command
from anywhere inside its working tree. The target is normalized to the working
tree root, and non-repository directories are refused. It removes only
CRG-owned files and entries; unrelated MCP servers, hooks, skills, and JSONC
comments remain untouched. Shared configuration changes use atomic replacement
so a failed write leaves the original file intact.

```bash
code-review-graph uninstall --dry-run    # preview every action; write nothing
code-review-graph uninstall              # preview, ask for confirmation, then apply
code-review-graph uninstall --yes        # apply without prompting
code-review-graph uninstall --all-repos  # also clean every registered repository
code-review-graph uninstall --keep-data  # remove integrations but keep graph databases
code-review-graph uninstall --keep-user-configs --repo .  # clean this project only
```

Then open your project and ask your AI assistant:

```
Build the code review graph for this project
```

The initial build takes ~10 seconds for a 500-file project. After that, watch mode and supported hooks can keep the graph updated automatically.


## How It Works

<p align="center">
  <img src="diagrams/diagram7_mcp_integration_flow.png" alt="How your AI assistant uses the graph: User asks for review, AI checks MCP tools, graph returns blast radius and risk scores, AI reads only what matters" width="80%" />
</p>

Your repository is parsed into an AST with Tree-sitter, stored as a graph of nodes (functions, classes, imports) and edges (calls, inheritance, test coverage), then queried at review time to compute the minimal set of files your AI assistant needs to read.

<p align="center">
  <img src="diagrams/diagram2_architecture_pipeline.png" alt="Architecture pipeline: Repository to Tree-sitter Parser to SQLite Graph to Blast Radius to Minimal Review Set" width="100%" />
</p>

### Blast-radius analysis

When a file changes, the graph traces every caller, dependent, and test that could be affected. This is the "blast radius" of the change. Your AI reads only these files instead of scanning the whole project.

<p align="center">
  <img src="diagrams/diagram3_blast_radius.png" alt="Blast radius visualization showing how a change to login() propagates to callers, dependents, and tests" width="70%" />
</p>

### Incremental updates in seconds

When hooks or watch mode are enabled, file saves and supported commit hooks trigger incremental updates. The graph diffs changed files, finds their dependents through the graph's own import and call edges, and re-parses only the files whose SHA-256 hash actually changed. On a ~3,000-file project (django) a two-file edit re-indexes in about 2.5 seconds on the path the hooks use, of which ~1.4 s is process start-up; a no-op update costs only that start-up. See [Incremental update latency](docs/REPRODUCING.md#incremental-update-latency) for the full measurement.

<p align="center">
  <img src="diagrams/diagram4_incremental_update.png" alt="Incremental update flow: a supported hook or watch update triggers a git diff, dependents are found through graph edges, and only files whose SHA-256 hash changed are re-parsed" width="90%" />
</p>

### Whole codebase or targeted answer?

The bigger the repository, the more token waste hurts. Instead of feeding a whole corpus to the model, the graph returns an answer-shaped slice of it: on this repository, 208,821 source tokens become ~3,190 tokens per question.

<p align="center">
  <img src="diagrams/diagram6_monorepo_funnel.png" alt="code-review-graph repo: 208,821 source tokens funnel down to ~3,190 token graph responses — 68x fewer tokens per question" width="80%" />
</p>

### Broad language coverage + Jupyter notebooks

<p align="center">
  <img src="diagrams/diagram9_language_coverage.png" alt="Language coverage organized by category: Web, Backend, Systems, Mobile, Scripting, Shells, Domain, and Other, plus Jupyter and Databricks notebook support" width="90%" />
</p>

Parser support covers functions, classes, imports, call sites, inheritance, and test detection across the current parser surface, using Tree-sitter where available and targeted fallbacks where needed. Current support includes Python, JavaScript/TypeScript/TSX, Go, Rust, Java, C/C++, C#, VB.NET, Ruby, Kotlin, Swift, PHP, Scala, Solidity, Dart, R, Perl, Lua/Luau, Objective-C, shell scripts, Elixir, Zig, PowerShell, Julia, ReScript, GDScript, Nix, Verilog/SystemVerilog, SQL, Terraform/OpenTofu structure (`.tf`; generic `.hcl` files are recognized as file nodes), Ansible playbooks/roles/tasks, Vue/Svelte SFCs, Astro files parsed through the TypeScript parser, Jupyter/Databricks notebooks (`.ipynb`), and Perl XS files (`.xs`). Generic YAML is not treated as source code.

PHP projects additionally get repository-bounded Composer PSR-4 resolution,
Blade template references, and Laravel Route/Eloquent semantic edges when the
source includes explicit framework imports, model inheritance, and receiver
evidence.

### Add your own language (no fork needed)

If your repo uses a language the parser does not cover yet, drop a `languages.toml` into `.code-review-graph/` mapping file extensions to any grammar bundled in `tree_sitter_language_pack`, plus the tree-sitter node types for functions, classes, imports, and calls:

```toml
[languages.erlang]
extensions = [".erl"]
grammar = "erlang"
function_node_types = ["function_clause"]
class_node_types = ["record_decl"]
import_node_types = ["import_attribute"]
call_node_types = ["call"]
```

The generic tree-sitter walker handles extraction from there — no code changes, and built-in languages can never be overridden. See [docs/CUSTOM_LANGUAGES.md](docs/CUSTOM_LANGUAGES.md) for the schema reference, validation rules, and a worked end-to-end example.

### Risk-scored PR reviews in CI (GitHub Action)

The same analysis runs as a composite GitHub Action — and it stays local-first: the knowledge graph is built and queried entirely on your CI runner, with no source code sent to any external service. On each pull request the action posts a single sticky comment with risk-scored functions, affected execution flows, and test gaps, updated in place on every push. An optional `fail-on-risk` input turns the review into a merge gate.

```yaml
# .github/workflows/code-review-graph.yml
on:
  pull_request:

permissions:
  contents: read
  pull-requests: write

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: tirth8205/code-review-graph@v2.3.6
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

See [docs/GITHUB_ACTION.md](docs/GITHUB_ACTION.md) for inputs, risk levels, and caching details, or the dogfood workflow this repo runs on itself in [`.github/workflows/pr-review.yml`](.github/workflows/pr-review.yml).

---

## Benchmarks

<p align="center">
  <img src="diagrams/diagram5_benchmark_board.png" alt="Benchmarks across 6 real repositories: ~65x median per-question token reduction (376x max), 0.69 average impact F1 against graph-derived ground truth" width="85%" />
</p>

**Headline number: the median per-question token reduction across the 6 repos is ~65x** (whole-corpus baseline vs graph query). The **376x maximum** is a single best-case repo (fastapi, the largest corpus) — not the typical result.

All numbers come from the automated evaluation runner against 6 real open-source repositories (13 commits total). Every config pins an upstream SHA, the Leiden community detector runs with a fixed seed, and embeddings are deterministic on CPU — so two runs on different machines produce identical numbers. The full reproduction recipe with expected outputs is in [`docs/REPRODUCING.md`](docs/REPRODUCING.md). A weekly report-only run on the two smallest configs lives in [`.github/workflows/eval.yml`](.github/workflows/eval.yml).

<details>
<summary><strong>Token efficiency: ~65x median per-question reduction (range 36x – 376x; whole-corpus vs graph query)</strong></summary>
<br>

For a typical agent question (`"how does authentication work"`, `"what is the main entry point"`, etc.), the graph returns ~2,000–3,500 tokens of targeted search hits + neighbor edges instead of forcing the agent to read every source file. The table below averages over the 5 sample questions defined in `code_review_graph/token_benchmark.py`.

| Repo | Snapshot SHA | naive_corpus_tokens | avg graph_tokens | Reduction |
|------|---|-----------------:|----------------:|----------:|
| fastapi | `22381558` | 948,793 | 2,653 | **375.6x** |
| flask | `a29f88ce` | 143,594 | 2,196 | **71.0x** |
| code-review-graph | `84bde354` | 208,821 | 3,190 | **68.1x** |
| gin | `5c00df8a` | 166,868 | 2,766 | **61.9x** |
| httpx | `b55d4635` | 142,356 | 2,661 | **60.6x** |
| express | `b4ab7d65` | 136,052 | 3,936 | **36.0x** |

Median per-question reduction across the 6 repos: **~65x**. The range is 36x – 376x, where **376x is the best case** (fastapi, the largest corpus), not the headline.

> Re-captured 2026-08-02 from clean clones at the pinned SHAs (crg 2.3.7, local `all-MiniLM-L6-v2` embeddings). These numbers are lower than the 2026-05-25 capture they replace: the graph response grew as node embedding text became richer, so `avg graph_tokens` rose across every repo. fastapi is now measured at its current pin `22381558` rather 

> _README 过长已截断, 完整内容请查看 GitHub 仓库。_
