# SkillSpector

**Security scanner for AI agent skills.** Detect vulnerabilities, malicious patterns, and security risks before installing agent skills.

[![Python 3.12+](https://img.shields.io/badge/python-3.12+-blue.svg)](https://www.python.org/downloads/)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://www.apache.org/licenses/LICENSE-2.0)
[![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/NVIDIA/SkillSpector/badge)](https://scorecard.dev/viewer/?uri=github.com/NVIDIA/SkillSpector)

## Overview

AI agent skills (used by Claude Code, Codex CLI, Gemini CLI, etc.) execute with implicit trust and minimal vetting. Research shows that **26.1% of skills contain vulnerabilities** and **5.2% show likely malicious intent**.

SkillSpector helps you answer: **"Is this skill safe to install?"**

SkillSpector is part of the [NVIDIA Verified Skills pipeline](https://docs.nvidia.com/skills/), which scans, evaluates, and signs agent skills before publication. Skills that pass are published to the [NVIDIA skills catalog](https://github.com/NVIDIA/skills).

## Documentation

- **[Scan agent skills before installation](https://docs.nvidia.com/skills/scanning-agent-skills)** — Hosted guide: when to scan, how to read a report, and how to gate installs.
- **[Development guide](docs/DEVELOPMENT.md)** — Architecture, package layout, and how to extend the analyzer pipeline.
- **[Analysis resource bounds](docs/ANALYSIS_RESOURCE_BOUNDS.md)** — Fail-closed bundle, parser, nested-artifact, ledger, and finding ceilings.
- **[Pi extension](docs/PI_EXTENSION.md)** — Install SkillSpector as a Pi tool for scanning skills from inside agent sessions.

## Features

- **Multi-format input**: Scan Git repos, URLs, zip files, directories, or single files
- **71 vulnerability patterns** across 17 categories: prompt injection, data exfiltration, privilege escalation, supply chain, excessive agency, output handling, system prompt leakage, memory poisoning, tool misuse, rogue agent, anti-refusal, trigger abuse, dangerous code (AST), taint tracking, YARA signatures, MCP least privilege, and MCP tool poisoning
- **Two-stage analysis**: Fast static analysis + optional LLM semantic evaluation
- **Live vulnerability lookups**: SC4 queries [OSV.dev](https://osv.dev) for real-time CVE data with automatic offline fallback
- **Multiple output formats**: Terminal, JSON, Markdown, and SARIF reports
- **Risk scoring**: 0-100 score with severity labels and clear recommendations
- **Baseline / false-positive suppression**: Accept known findings via a glob-rule or fingerprint baseline so re-scans surface only *new* issues ([docs](docs/SUPPRESSION.md))

## Quick Start

### Installation

> **Open-source software notice:** This project will download and install additional third-party open source software projects. Review the license terms of these open source projects before use.

Create and activate a virtual environment first (all `make` targets assume the venv is active). Use **uv** or **pip**; the Makefile uses `uv` if available, otherwise `pip`.

**Quick install with uv (CLI-only):**

```bash
uv tool install git+https://github.com/NVIDIA/skillspector.git
# Update later: uv tool update skillspector
```

If you plan to run `skillspector mcp`, install the MCP extra at install time:

```bash
uv tool install 'skillspector[mcp] @ git+https://github.com/NVIDIA/skillspector.git'
```

**From source:**

```bash
# Clone the repository
git clone https://github.com/NVIDIA/skillspector.git
cd skillspector

# Create and activate virtual environment
uv venv .venv && source .venv/bin/activate
# or: python3 -m venv .venv && source .venv/bin/activate

# Install for production use
make install

# Or install with development dependencies
make install-dev
```

### Docker (no Python required)

Run SkillSpector without installing Python by building it locally from the included [Dockerfile](Dockerfile). The image is based on the Docker Official Python `3.12-slim-bookworm` image.

**Build the image:**

```bash
make docker-build
# or: docker build -t skillspector .
```

**Scan a local directory** by mounting your current directory into `/scan`, the container's working directory:

```bash
docker run --rm -v "$PWD:/scan" skillspector scan ./my-skill/ --no-llm
```

**Scan with LLM analysis** by passing credentials with a local `.env` file:

```bash
cat > .env <<'EOF'
SKILLSPECTOR_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
EOF
```

```bash
docker run --rm \
  -v "$PWD:/scan" \
  --env-file .env \
  skillspector scan ./my-skill/
```

Or pass credentials directly from your shell environment:

```bash
docker run --rm \
  -v "$PWD:/scan" \
  -e SKILLSPECTOR_PROVIDER=anthropic \
  -e ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY" \
  skillspector scan ./my-skill/
```

**Write a report to the host filesystem** by writing to the mounted directory:

```bash
docker run --rm \
  -v "$PWD:/scan" \
  skillspector scan ./my-skill/ --no-llm --format json --output report.json
```

**Optional alias** for repeated static scans:

```bash
alias skillspector-docker='docker run --rm -v "$PWD:/scan" skillspector'
skillspector-docker scan ./my-skill/ --no-llm
```

### Basic Usage

```bash
# Scan a local skill directory
skillspector scan ./my-skill/

# Scan a single SKILL.md file
skillspector scan ./SKILL.md

# Scan a Git repository
skillspector scan https://github.com/user/my-skill

# Scan a zip file
skillspector scan ./my-skill.zip
```

#### Size limits

SkillSpector enforces two independent caps on remote and archive inputs to bound the impact of oversized downloads and zip bombs:

- **Per-ingest cap**: `INGEST_MAX_BYTES` (100 MiB) — applied to streamed URL downloads, total uncompressed size of zip archives, and post-clone disk usage of Git repos.
- **Zip member cap**: `INGEST_MAX_ZIP_MEMBERS` (10,000) — caps the number of entries in a single zip.

Note that the per-file 1 MB analysis cap (`MAX_FILE_BYTES`) is a separate, downstream limit: it bounds what individual analyzers will read out of an already-ingested directory. The ingest caps above bound how much content can land on disk in the first place. A breach of either ingest cap fails closed with an `IngestLimitExceededError`.

### Output Formats

```bash
# Terminal output (default) - pretty formatted
skillspector scan ./my-skill/

# JSON output - machine readable
skillspector scan ./my-skill/ --format json --output report.json

# Markdown output - for documentation
skillspector scan ./my-skill/ --format markdown --output report.md

# SARIF output - for CI/CD integration and IDE tooling
skillspector scan ./my-skill/ --format sarif --output report.sarif
```

### Batch Scanning

Scan entire directories of skills in parallel from `contrib/batch_scan/`:

```bash
python -m contrib.batch_scan.batch_scan ./my-skills/ --no-llm
python -m contrib.batch_scan.batch_scan ./my-skills/ --workers 20 -f json -o report.json
python -m contrib.batch_scan.batch_scan ./tests/fixtures/ -f terminal --workers 20
```

Supports multilingual detection (zh/ja/ko) and terminal/JSON/Markdown output.

For LLM scans with higher concurrency, configure multiple API keys following
[`.env.example`](contrib/batch_scan/.env.example) — the pool improves throughput
and resilience, provided the keys don't share an account-level rate limit.

See the [contrib guide](contrib/batch_scan/docs/) for details.

> **Note on LLM support:** The default configuration targets DeepSeek as the
> cheapest public option. DeepSeek-Chat is
> [expected to sunset](https://api-docs.deepseek.com/), and the contributor
> does not have hardware to test against local models. The batch scanner was
> originally tested with OpenAI-compatible endpoints — DeepSeek's lack of
> structured-output support required manual JSON-parsing patches. If you can
> contribute a more universal backend (Ollama, vLLM, or a different provider),
> PRs are very welcome.

### Suppressing False Positives (baseline)

Suppress known/accepted findings so the risk score reflects only un-triaged
issues and re-scans surface only *new* findings. See the
[suppression guide](docs/SUPPRESSION.md) for the full reference.

```bash
# Accept all current findings into a baseline (run once), then commit it.
skillspector baseline ./my-skill/ -o .skillspector-baseline.yaml

# Scan against the baseline — only NEW findings are reported and scored.
skillspector scan ./my-skill/ --baseline .skillspector-baseline.yaml

# Review what was suppressed (still excluded from the score).
skillspector scan ./my-skill/ --baseline .skillspector-baseline.yaml --show-suppressed
```

A baseline can also use drift-tolerant glob rules (by rule id, file path, or
message) — see [`.skillspector-baseline.example.yaml`](.skillspector-baseline.example.yaml).
Exact fingerprint baselines are evidence-bound: changing the scanned source or
SkillSpector version keeps the finding active until it is reviewed again.
When a selected baseline or baseline output is stored inside the skill
directory, SkillSpector excludes that exact file from content analysis so its
suppression text cannot create findings or enter regenerated fingerprints;
sibling files remain in normal scan scope.

### LLM Analysis

For the best results, configure an OpenAI-compatible LLM endpoint for
semantic analysis. Pick a provider with `SKILLSPECTOR_PROVIDER`; hosted providers ship bundled default models, while CLI providers fall back to the local runtime's default model unless `SKILLSPECTOR_MODEL` is set. SkillSpector also works against
local OpenAI-compatible servers (Ollama, vLLM, llama.cpp) and managed
inference gateways.

| Provider (`SKILLSPECTOR_PROVIDER`) | Credential env var | Endpoint | Default model |
| ---------- | ---- | ---- | ---- |
| `openai` | `OPENAI_API_KEY` (+ optional `OPENAI_BASE_URL`) | api.openai.com (or any OpenAI-compatible URL) | `gpt-5.4` |
| `anthropic` | `ANTHROPIC_API_KEY` | api.anthropic.com | `claude-opus-4-6` |
| `anthropic_proxy` | `ANTHROPIC_PROXY_API_KEY` + `ANTHROPIC_PROXY_ENDPOINT_URL` | Any Vertex-style raw-predict proxy | `claude-sonnet-4-6` |
| `bedrock` | `AWS_PROFILE` (optional) + `AWS_REGION` — SigV4 via boto3 | AWS Bedrock Runtime | `us.anthropic.claude-sonnet-4-6-20250915-v1:0` |
| `nv_build` | `NVIDIA_INFERENCE_KEY` | build.nvidia.com | `deepseek-ai/deepseek-v4-flash` |
| `claude_cli` | _(none — uses local CLI auth)_ | local `claude` binary | local Claude runtime fallback, or `SKILLSPECTOR_MODEL` |
| `codex_cli` | _(none — uses local CLI auth)_ | local `codex` binary | local Codex runtime fallback, or `SKILLSPECTOR_MODEL` |

```bash
# Stock OpenAI
export SKILLSPECTOR_PROVIDER=openai
export OPENAI_API_KEY=sk-...
skillspector scan ./my-skill/

# Anthropic
export SKILLSPECTOR_PROVIDER=anthropic
export ANTHROPIC_API_KEY=sk-ant-...
skillspector scan ./my-skill/

# Anthropic via Vertex-style proxy (corporate gateways, GCP Vertex AI)
export SKILLSPECTOR_PROVIDER=anthropic_proxy
export ANTHROPIC_PROXY_ENDPOINT_URL=https://my-gateway.example.com/models/claude-sonnet-4-6:streamRawPredict
export ANTHROPIC_PROXY_API_KEY=your-bearer-token
export SKILLSPECTOR_MODEL=claude-sonnet-4-6
skillspector scan ./my-skill/

# AWS Bedrock (Claude via SigV4)
export SKILLSPECTOR_PROVIDER=bedrock
# Optional: select an AWS named profile. When unset, the standard
# boto3 credential chain (env vars, instance metadata, SSO, etc.) resolves.
# export AWS_PROFILE=my-profile
export AWS_REGION=us-west-2  # default if unset
# Default model: us.anthropic.claude-sonnet-4-6-20250915-v1:0
# Override with any Bedrock model ID, cross-region inference-profile
# ID, or your own application-inference-profile ARN:
# export SKILLSPECTOR_MODEL=us.anthropic.claude-opus-4-6-20250915-v1:0
skillspector scan ./my-skill/

# NVIDIA build.nvidia.com
export SKILLSPECTOR_PROVIDER=nv_build
export NVIDIA_INFERENCE_KEY=nvapi-...
skillspector scan ./my-skill/

# Local Claude CLI — no API key; uses your existing `claude auth login` session
# Requires: claude CLI installed and authenticated (claude auth login)
export SKILLSPECTOR_PROVIDER=claude_cli
# Uses the local Claude CLI runtime fallback unless SKILLSPECTOR_MODEL is set.
# export SKILLSPECTOR_MODEL=claude-sonnet-4-6
skillspector scan ./my-skill/

# Local Codex CLI — no API key; uses your existing `codex login` session
# Requires: codex CLI installed and authenticated
export SKILLSPECTOR_PROVIDER=codex_cli
skillspector scan ./my-skill/

# Local Ollama or any OpenAI-compatible endpoint
export SKILLSPECTOR_PROVIDER=openai
export OPENAI_API_KEY=ollama
export OPENAI_BASE_URL=http://localhost:11434/v1
export SKILLSPECTOR_MODEL=llama3.1:8b
skillspector scan ./my-skill/

# Override the provider's default model
export SKILLSPECTOR_MODEL=gpt-5.2
skillspector scan ./my-skill/

# Skip LLM analysis (faster, static analysis only)
skillspector scan ./my-skill/ --no-llm
```

### MCP Server

Run SkillSpector as a [Model Context Protocol](https://modelcontextprotocol.io)
server so any MCP-capable agent (Claude Code, Codex CLI, Gemini CLI) or remote
runtime can call scanning as a tool and **gate skill/MCP installs on the
result** — turning SkillSpector into a runtime guardrail instead of an
out-of-band audit step.

`skillspector mcp` requires `skillspector[mcp]`.

```bash
# Install, or reinstall if you already used the CLI-only path
uv tool install --force 'skillspector[mcp] @ git+https://github.com/NVIDIA/skillspector.git'

# FastMCP stdio transport for local CLI agents
skillspector mcp

# streamable HTTP/SSE transport for remote / A2A callers
skillspector mcp --transport http --host 127.0.0.1 --port 8000
```

The stdio transport is the current FastMCP path for local CLI agents, and the
initialize hang reported in issue #199 still applies there.

The server exposes a single tool:

- **`scan_skill(target, use_llm=true, output_format="json")`** — scans a Git
  URL, file URL, `.zip`, `.md` file, or directory and returns a structured
  verdict: `risk_score` (0-100), `severity`, `recommendation`,
  `safe_to_install`, and `findings`. It also reports `llm_used` / `scan_mode`
  so a low score from a static-only scan is never mistaken for a clean full
  scan.

Register it with Claude Code via:

```bash
claude mcp add skillspector -- skillspector mcp
```

> **Security — HTTP transport trust model**
>
> The HTTP transport ships **without authentication**. Any caller that can
> reach the port can invoke `scan_skill`. Over stdio or `127.0.0.1` this is
> the same trust boundary as the CLI. If you bind to a routable interface:
>
> - Sit the server behind an authenticating reverse proxy (e.g. nginx + mTLS)
>   before exposing it externally.
> - Local paths and `file://` URLs are **automatically rejected** over HTTP to
>   prevent unauthenticated callers from reading arbitrary host files. Only
>   remote Git and `.zip` URLs are accepted.

## Vulnerability Patterns

SkillSpector detects **71 vulnerability patterns** across 17 categories:

### Prompt Injection (6 patterns)

| ID | 

> _README 过长已截断, 完整内容请查看 GitHub 仓库。_
