<div align="center"><pre>
  ██╗  ██╗███████╗ █████╗ ██████╗ ██████╗  ██████╗  ██████╗ ███╗   ███╗
  ██║  ██║██╔════╝██╔══██╗██╔══██╗██╔══██╗██╔═══██╗██╔═══██╗████╗ ████║
  ███████║█████╗  ███████║██║  ██║██████╔╝██║   ██║██║   ██║██╔████╔██║
  ██╔══██║██╔══╝  ██╔══██║██║  ██║██╔══██╗██║   ██║██║   ██║██║╚██╔╝██║
  ██║  ██║███████╗██║  ██║██████╔╝██║  ██║╚██████╔╝╚██████╔╝██║ ╚═╝ ██║
  ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═════╝ ╚═╝  ╚═╝ ╚═════╝  ╚═════╝ ╚═╝     ╚═╝
              The context compression layer for AI agents
</pre></div>

<p align="center"><strong>60–95% fewer tokens (for JSON data), 15-20% fewer tokens (for coding agents) · library · proxy · MCP · content-aware compressors · local-first · reversible</strong></p>

<p align="center">
  <a href="https://github.com/chopratejas/headroom/actions/workflows/ci.yml"><img src="https://github.com/chopratejas/headroom/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://app.codecov.io/gh/chopratejas/headroom"><img src="https://codecov.io/gh/chopratejas/headroom/graph/badge.svg" alt="codecov"></a>
  <a href="https://pypi.org/project/headroom-ai/"><img src="https://img.shields.io/pypi/v/headroom-ai.svg" alt="PyPI"></a>
  <a href="https://www.npmjs.com/package/headroom-ai"><img src="https://img.shields.io/npm/v/headroom-ai.svg" alt="npm"></a>
  <a href="https://huggingface.co/chopratejas/kompress-v2-base"><img src="https://img.shields.io/badge/model-Kompress--v2--base-yellow.svg" alt="Model: Kompress-v2-base"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-Apache%202.0-blue.svg" alt="License: Apache 2.0"></a>
  <a href="https://headroom-docs.vercel.app/docs"><img src="https://img.shields.io/badge/docs-online-blue.svg" alt="Docs"></a>
</p>

<!-- mcp-name: io.github.headroomlabs-ai/headroom -->

<p align="center">
  <a href="https://headroom-docs.vercel.app/docs">Docs</a> ·
  <a href="#get-started-60-seconds">Install</a> ·
  <a href="#proof">Proof</a> ·
  <a href="#agent-compatibility-matrix">Agents</a> ·
  <a href="https://discord.gg/yRmaUNpsPJ">Discord</a> ·
  <a href="llms.txt">llms.txt</a>
</p>

<p align="center"><sub>
  <b>AI agents / LLMs:</b> read <a href="llms.txt"><code>/llms.txt</code></a> here, or fetch <a href="https://headroom-docs.vercel.app/llms.txt">the live index</a> / <a href="https://headroom-docs.vercel.app/llms-full.txt">full docs blob</a>.
</sub></p>

---
<p align="center"><a href="https://trendshift.io/repositories/20881" target="_blank"><img src="https://trendshift.io/api/badge/repositories/20881" alt="chopratejas%2Fheadroom | Trendshift" style="width: 250px; height: 55px;" width="250" height="55"/></a></p>

Headroom compresses everything your AI agent reads — tool outputs, logs, RAG chunks, files, and conversation history — before it reaches the LLM. Same answers, fraction of the tokens.

<p align="center">
  <img src="HeadroomDemo-Fast.gif" alt="Headroom in action" width="820">
  <br/><sub>Live: 10,144 → 1,260 tokens — same FATAL found.</sub>
</p>

## What it does

- **Library** — `compress(messages)` in Python or TypeScript, inline in any app
- **Proxy** — `headroom proxy --port 8787`, zero code changes, any language
- **Agent wrap** — `headroom wrap claude|codex|grok|copilot|cursor|aider|opencode|cline|continue|goose|openhands|openclaw|vibe|omp|zcode` in one command; undo with `headroom unwrap <tool>`
- **MCP server** — `headroom_compress`, `headroom_retrieve`, `headroom_stats` for any MCP client
- **Cross-agent memory** — shared store across Claude, Codex, Gemini, Grok, auto-dedup
- **`headroom learn`** — mines failed sessions, writes corrections to `CLAUDE.local.md` (default, gitignored) or `CLAUDE.md` / `AGENTS.md` / `GEMINI.md` / `GROK.md`
- **Output token reduction** — trims what the model *writes back* (not just what you send): drops ceremony/restated code and skips deep "thinking" on routine steps. See [Output token reduction](#output-token-reduction-cut-what-the-model-writes-back).
- **Reversible (CCR)** — originals are cached for retrieval on demand

## How it works (30 seconds)

```
 Your agent / app
   (Claude Code, Cursor, Codex, LangChain, Agno, Strands, your own code…)
        │   prompts · tool outputs · logs · RAG results · files
        ▼
    ┌────────────────────────────────────────────────────┐
    │  Headroom   (runs locally — your data stays here)  │
    │  ────────────────────────────────────────────────  │
    │  CacheAligner  →  ContentRouter  →  CCR            │
    │                    ├─ SmartCrusher   (JSON)        │
    │                    ├─ CodeCompressor (AST)         │
    │                    └─ Kompress-v2-base (text, HF)  │
    │                                                    │
    │  Cross-agent memory  ·  headroom learn  ·  MCP     │
    └────────────────────────────────────────────────────┘
        │   compressed prompt  +  retrieval tool
        ▼
 LLM provider  (Anthropic · OpenAI · Bedrock · …)
```

- **ContentRouter** — detects content type, selects the right compressor
- **SmartCrusher / CodeCompressor / Kompress-v2-base** — compress JSON, AST, or prose
- **CacheAligner** - detects and warns about volatile content that can bust provider KV cache prefixes; never rewrites prompts
- **CCR** — stores originals locally; LLM calls `headroom_retrieve` if it needs them

→ [Architecture](https://headroom-docs.vercel.app/docs/architecture) · [CCR reversible compression](https://headroom-docs.vercel.app/docs/ccr) · [Kompress-v2-base model card](https://huggingface.co/chopratejas/kompress-v2-base)

## Get started (60 seconds)

```bash
# 1 — Install
uv tool install --python 3.13 "headroom-ai[all]"  # CLI as a global tool in a self-contained virtual env
pip install "headroom-ai[all]"                    # Python — ships the `headroom` CLI
npm install headroom-ai                           # TypeScript SDK only — no `headroom` CLI

# 2 — Pick your mode  (the `headroom` commands below come from the uv or pip install)
headroom deploy                         # turnkey local deployment + agent config
headroom wrap claude                    # wrap a coding agent
headroom proxy --port 8787              # drop-in proxy, zero code changes
# or: from headroom import compress      # inline library

# 3 — Verify setup and see the savings
headroom doctor                         # health check — confirms routing is working
headroom perf
headroom dashboard                      # live savings dashboard (proxy must be running)
```

To use headroom, it is recommended you launch a wrapped agent session each time so that all necessary setup is completed. When wrapping a coding agent, headroom starts a local proxy, installs **Serena** for semantic code navigation, and launches a coding agent session configured to proxy requests through headroom.

Serena is registered at **user scope** (for Claude Code, in `~/.claude.json`), so it stays available in your other projects until you run `headroom unwrap`. To skip it entirely, wrap with `--code-memory none`.

The `headroom` CLI ships **only** via the PyPI package. The npm `headroom-ai` is the TypeScript SDK — a library you import (`import { compress } from 'headroom-ai'`), not a CLI, so it provides no `headroom` command.

Granular extras: `[proxy]`, `[mcp]`, `[ml]`, `[code]`, `[memory]`, `[vector]` (optional HNSW backend — needs a C++ toolchain, not in `[all]`), `[relevance]`, `[image]`, `[agno]`, `[langchain]`, `[evals]`, `[pytorch-mps]` (Apple-GPU memory-embedder offload — set `HEADROOM_EMBEDDER_RUNTIME=pytorch_mps`). Requires **Python 3.10+**.

### Codex / global install

If Codex or another MCP client cannot inherit a shell `PATH` reliably, install Headroom as a persistent uv tool and point the client at the absolute binary path:

```bash
uv tool install "headroom-ai[all]"
command -v headroom
```

Then use the returned path in MCP config:

```toml
[mcp_servers.headroom]
command = "/absolute/path/from/command-v/headroom"
args = ["mcp", "serve"]
```

`command = "headroom"` only works when the client starts with a `PATH` that already includes the uv tool directory.

## Proof

**Savings on real agent workloads:**

| Workload                      | Before | After  | Savings |
|-------------------------------|-------:|-------:|--------:|
| Code search (100 results)     | 17,765 |  1,408 | **92%** |
| SRE incident debugging        | 65,694 |  5,118 | **92%** |
| GitHub issue triage           | 54,174 | 14,761 | **73%** |
| Codebase exploration          | 78,502 | 41,254 | **47%** |

**Accuracy preserved on standard benchmarks:**

| Benchmark  | Category | N   | Baseline | Headroom | Delta      |
|------------|----------|----:|---------:|---------:|------------|
| GSM8K      | Math     | 100 |    0.870 |    0.870 | **±0.000** |
| TruthfulQA | Factual  | 100 |    0.530 |    0.560 | **+0.030** |
| SQuAD v2   | QA       | 100 |        — |  **97%** | 19% compression |
| BFCL       | Tools    | 100 |        — |  **97%** | 32% compression |

Reproduce: `python -m headroom.evals suite --tier 1` · [Full benchmarks & methodology](https://headroom-docs.vercel.app/docs/benchmarks)

## Output token reduction (cut what the model writes back)

Everything above shrinks the prompt you **send**. But you also pay for every
token the model **writes back** — and on Opus-class models output costs 5× input.
A lot of that output is waste: "Great, let me…" preambles, re-printing code you
just showed it, and deep "thinking" on routine steps like reading a file.

Headroom can trim that too, from the proxy, without you changing any code:

- **Verbosity steering** — appends a short "be terse, don't restate context"
  note to the end of the system prompt (so your prompt cache still hits).
- **Effort routing** — when a turn is just the model resuming after a tool result
  (a file read, a passing test), it dials the model's thinking effort down. New
  questions and errors keep full effort.

Applies to Anthropic `/v1/messages` **and** OpenAI-compatible endpoints
(`/v1/chat/completions`, `/v1/responses`). Effort routing uses
`reasoning_effort` on OpenAI, `thinking.budget_tokens` /
`output_config.effort` on Anthropic — same clamp-only invariant on both
paths, same `output_shaper:*` label vocabulary.

Turn it on:

```bash
export HEADROOM_OUTPUT_SHAPER=1     # off by default
headroom proxy --port 8787
```

> **Already running a proxy?** These switches are read *live* on every request,
> so a proxy that `headroom wrap` **reused** (rather than started) would not see
> a value you export afterwards — its environment was snapshotted at launch.
> `headroom wrap` now hot-syncs your current settings to the running proxy via a
> loopback `POST /admin/runtime-env`, so they take effect immediately with **no
> restart** (no cold start, no dropped requests, no lost caches). Set them before
> you `wrap`. On a shared proxy these overrides are global — the last explicit
> setting wins.

**Learn the right terseness for you.** People don't *say* how terse they want
answers — they *show* it (they interrupt long replies, or move on before they
could have read them). `headroom learn --verbosity` reads your past sessions and
picks the level automatically:

```bash
headroom learn --verbosity            # preview what it found (dry run)
headroom learn --verbosity --apply    # save it; the proxy uses it from now on
```

**See how many output tokens you saved.** Output savings are *counterfactual* —
we never see what the model *would* have written — so Headroom reports an honest
**estimate with a confidence range**, never a made-up number:

```bash
headroom output-savings
# Reduction: 31.7%  (95% CI 27.7% … 35.7%)   [estimated]
```

Want a *measured* number instead of an estimate? Leave 10% of conversations
unshaped as a control group: `export HEADROOM_OUTPUT_HOLDOUT=0.1`. The dashboard
shows an **Output Tokens Saved** card next to input compression, labelled
`measured` or `estimated` with the confidence band.

→ Full write-up incl. the measurement methodology: [Output token reduction](https://headroom-docs.vercel.app/docs/savings)

<a href="https://www.star-history.com/?repos=chopratejas%2Fheadroom&type=date&legend=top-left">
 <picture>
   <img alt="Star History Chart" src="https://api.star-history.com/chart?repos=chopratejas/headroom&type=date&legend=top-left" />
 </picture>
</a>

## Agent compatibility matrix

| Agent        | `headroom wrap` | Notes                            |
|--------------|:---------------:|----------------------------------|
| Claude Code  | ✅              | `--memory` · `--code-graph` · `--1m` · `--tool-search` |
| Codex        | ✅              | shares memory with Claude        |
| Grok CLI     | ✅              | routes via `GROK_MODELS_BASE_URL` |
| Cursor       | Manual setup    | starts proxy and prints base URLs for Cursor settings |
| Aider        | ✅              | starts proxy + launches          |
| Copilot CLI  | ✅              | starts proxy + launches          |
| VS Code Copilot | ✅           | transparent proxy; preserves selected model |
| OpenClaw     | ✅              | installs as ContextEngine plugin |
| OpenCode     | ✅              | injects config · starts proxy + launches |
| Cline        | ✅              | starts proxy + injects config    |
| Continue     | ✅              | starts proxy + injects config    |
| Goose        | ✅              | starts proxy + launches          |
| OpenHands    | ✅              | starts proxy + launches          |
| Mistral Vibe | ✅              | starts proxy + launches          |
| Oh My Pi     | ✅              | injects config · starts proxy + launches |
| Cortex Code  | Library only    | 60–65% savings (library mode; no `wrap`) |
| Kimi CLI     | ✅              | OAuth bearer forwarded — log in once |
| ZCode        | ✅              | starts proxy and prints base URLs for ZCode settings |

Any OpenAI-compatible client works via `headroom proxy`. MCP-native: `headroom mcp install`.
Undo durable wrapping with `headroom unwrap <tool>` (supports: `claude`, `copilot`, `codex`, `grok`, `kimi`, `omp`, `opencode`, `openclaw`, `zcode`).
Registry authors can use the canonical [`server.json`](server.json) in the repo root instead of reconstructing the `headroom mcp serve` contract from prose.

### GitHub Copilot CLI subscription mode

Headroom can route GitHub Copilot CLI subscription traffic through the local proxy:

```bash
headroom copilot-auth login
headroom wrap copilot --subscription -- --model gpt-4o
```

This lets Headroom intercept OpenAI-compatible Copilot CLI requests and apply the same proxy compression pipeline before forwarding to GitHub Copilot's hosted API. The wrapper exchanges Headroom's reusable GitHub OAuth token for Copilot's short-lived API token and prints the upstream endpoint as `COPILOT_PROVIDER_API_URL=...` during launch.

`headroom copilot-auth login` stores a Headroom-specific Copilot OAuth token.
This avoids relying on generic GitHub or Copilot CLI tokens that can read
Copilot account metadata but may still be reje

> _README 过长已截断, 完整内容请查看 GitHub 仓库。_
