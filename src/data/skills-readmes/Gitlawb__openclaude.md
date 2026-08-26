<div align="center">
  <img src="docs/assets/openclaude-wordmark.png" alt="OpenClaude — Open terminal for any LLM" width="830">

  <p>
    <a href="https://trendshift.io/repositories/25807?utm_source=trendshift-badge&amp;utm_medium=badge&amp;utm_campaign=badge-trendshift-25807" target="_blank" rel="noopener noreferrer"><img src="https://trendshift.io/api/badge/trendshift/repositories/25807/daily?language=TypeScript" alt="Gitlawb%2Fopenclaude | Trendshift" width="250" height="55"/></a>
    <a href="https://trendshift.io/repositories/25807?utm_source=trendshift-badge&amp;utm_medium=badge&amp;utm_campaign=badge-trendshift-25807" target="_blank" rel="noopener noreferrer"><img src="https://trendshift.io/api/badge/trendshift/repositories/25807/monthly?language=TypeScript" alt="Gitlawb%2Fopenclaude | Trendshift" width="250" height="55"/></a>
    <a href="https://trendshift.io/repositories/25807?utm_source=repository-badge&amp;utm_medium=badge&amp;utm_campaign=badge-repository-25807" target="_blank" rel="noopener noreferrer"><img src="https://trendshift.io/api/badge/repositories/25807" alt="Gitlawb%2Fopenclaude | Trendshift" width="250" height="55"/></a>
  </p>
</div>

OpenClaude is an open-source coding-agent CLI for cloud and local model providers.

Use OpenAI-compatible APIs, Gemini, GitHub Models, Codex OAuth, Codex, Ollama, Atomic Chat, and other supported backends while keeping one terminal-first workflow: prompts, tools, agents, MCP, slash commands, and streaming output.

[![PR Checks](https://github.com/Gitlawb/openclaude/actions/workflows/pr-checks.yml/badge.svg?branch=main)](https://github.com/Gitlawb/openclaude/actions/workflows/pr-checks.yml)
[![Release](https://img.shields.io/github/v/tag/Gitlawb/openclaude?label=release&color=0ea5e9)](https://github.com/Gitlawb/openclaude/tags)
[![npm downloads](https://img.shields.io/npm/dm/@gitlawb/openclaude)](https://www.npmjs.com/package/@gitlawb/openclaude)
[![Discussions](https://img.shields.io/badge/discussions-open-7c3aed)](https://github.com/Gitlawb/openclaude/discussions)
[![Discord](https://img.shields.io/badge/Discord-join-5865F2?logo=discord&logoColor=white)](https://discord.gg/k68zFR6AcB)
[![X](https://img.shields.io/badge/X-@gitlawb-000000?logo=x&logoColor=white)](https://x.com/gitlawb)
[![Security Policy](https://img.shields.io/badge/security-policy-0f766e)](SECURITY.md)
[![License](https://img.shields.io/badge/license-MIT-2563eb)](LICENSE)

OpenClaude is also mirrored to GitLawb:
[gitlawb.com/node/repos/z6MkqDnb/openclaude](https://gitlawb.com/node/repos/z6MkqDnb/openclaude)

[Quick Start](#quick-start) | [Setup Guides](#setup-guides) | [Providers](#supported-providers) | [Development](#development) | [VS Code Extension](#vs-code-extension) | [Partners](#partners) | [Community](#community)

## Partners

<table align="center">
  <tr>
    <td align="center" width="150" height="80">
      <a href="https://gitlawb.com">
        <img src="https://gitlawb.com/logo.png" alt="GitLawb logo" width="72">
      </a>
    </td>
    <td align="center" width="150" height="80">
      <a href="https://bankr.bot">
        <img src="https://bankr.bot/favicon.svg" alt="Bankr.bot logo" width="72">
      </a>
    </td>
    <td align="center" width="150" height="80">
      <a href="https://atomic.chat/">
        <img src="docs/assets/atomic-chat-logo.png" alt="Atomic Chat logo" width="72">
      </a>
    </td>
    <td align="center" width="150" height="80">
      <a href="https://mimo.mi.com">
        <img src="https://mimo.xiaomi.com/mimo-v2-pro/assets/logo.svg" alt="Xiaomi MiMo logo" width="136">
      </a>
    </td>
    <td align="center" width="150" height="80">
      <a href="https://www.atlascloud.ai/">
        <img src="docs/assets/atlas-cloud-banner.png" alt="Atlas Cloud logo" width="136">
      </a>
    </td>
  </tr>
  <tr>
    <td align="center"><a href="https://gitlawb.com"><strong>GitLawb</strong></a></td>
    <td align="center"><a href="https://bankr.bot"><strong>Bankr.bot</strong></a></td>
    <td align="center"><a href="https://atomic.chat/"><strong>Atomic Chat</strong></a></td>
    <td align="center"><a href="https://mimo.mi.com"><strong>Xiaomi MiMo</strong></a></td>
    <td align="center"><a href="https://www.atlascloud.ai/"><strong>Atlas Cloud</strong></a></td>
  </tr>
  <tr>
    <td align="center" width="150" height="80">
      <a href="https://aimlapi.com/">
        <picture>
          <source media="(prefers-color-scheme: dark)" srcset="docs/assets/aimlapi-logo-dark.svg">
          <img src="docs/assets/aimlapi-logo.svg" alt="AI/ML API logo" width="136">
        </picture>
      </a>
    </td>
    <td align="center" width="150" height="80">
      <a href="https://novita.ai/">
        <picture>
          <source media="(prefers-color-scheme: dark)" srcset="docs/assets/novita-logo-dark.svg">
          <img src="docs/assets/novita-logo.svg" alt="Novita AI logo" width="136">
        </picture>
      </a>
    </td>
    <td align="center" width="150" height="80">
      <a href="https://www.apismart.ai">
        <picture>
          <source media="(prefers-color-scheme: dark)" srcset="docs/assets/apismart-logo-dark.png">
          <img src="docs/assets/apismart-logo.png" alt="ApiSmart logo" width="120">
        </picture>
      </a>
    </td>
    <td align="center" width="150" height="80">
      <a href="https://concentrate.ai/">
        <picture>
          <source media="(prefers-color-scheme: dark)" srcset="docs/assets/concentrate-logo-dark.svg">
          <img src="docs/assets/concentrate-logo.svg" alt="Concentrate logo" width="64">
        </picture>
      </a>
    </td>
    <td align="center" width="150" height="80">
      <a href="https://exa.ai/">
        <picture>
          <source media="(prefers-color-scheme: dark)" srcset="docs/assets/exa-logo-dark.svg">
          <img src="docs/assets/exa-logo.svg" alt="Exa logo" width="110">
        </picture>
      </a>
    </td>
  </tr>
  <tr>
    <td align="center"><a href="https://aimlapi.com/"><strong>AI/ML API</strong></a></td>
    <td align="center"><a href="https://novita.ai/"><strong>Novita AI</strong></a></td>
    <td align="center"><a href="https://www.apismart.ai"><strong>ApiSmart</strong></a></td>
    <td align="center"><a href="https://concentrate.ai/"><strong>Concentrate</strong></a></td>
    <td align="center"><a href="https://exa.ai/"><strong>Exa</strong></a></td>
  </tr>
</table>

## Why OpenClaude

- One CLI across cloud APIs and local model backends — no per-provider tooling
- Guided provider setup and saved profiles with `/provider`
- Coding-agent workflows in one place: bash, file tools, grep, glob, agents, tasks, MCP, and web tools
- A bundled VS Code extension for launch integration and theme support
- A pixel-art hero companion who fires an arrow every time you press Enter (really — see [Meet your buddy](#meet-your-buddy))

## Quick Start

### Install

OpenClaude requires Node.js `>=22.0.0` for npm installs and runtime. Bun is
only needed for source builds and local development.

```bash
npm install -g @gitlawb/openclaude@latest
```

If you're on Arch Linux, you can install OpenClaude from the community-maintained [AUR package](https://aur.archlinux.org/packages/openclaude):
```bash
paru -S openclaude
```

If the install later reports `ripgrep not found`, install ripgrep system-wide and confirm `rg --version` works in the same terminal before starting OpenClaude.

**Verify / troubleshoot installed version:**

```bash
openclaude --version
npm view @gitlawb/openclaude dist-tags
npm install -g @gitlawb/openclaude@latest
```

### Start

```bash
openclaude
```

Inside OpenClaude:

- run `/provider` for guided provider setup and saved profiles
- run `/onboard-github` for GitHub Models onboarding

> **Note:** OpenClaude does not automatically load project `.env` files. We recommend using the `/provider` command for setup, which saves provider profiles and credentials in `.openclaude-profile.json`. If you prefer environment variables, export them explicitly or run `openclaude --provider-env-file .env` for provider/setup variables. Export runtime/debug knobs from your shell or launcher.

### Resume or fork a conversation

Resume an existing conversation by session ID, or continue the most recent
conversation in the current directory:

```bash
openclaude --resume <session-id>
openclaude --continue
```

Add `--fork-session` to branch the conversation history into a new session ID
instead of reusing the original transcript:

```bash
openclaude --resume <session-id> --fork-session
openclaude --continue --fork-session
```

Forking is conversation branching only. It does not create filesystem isolation,
copy your working tree, or create a git worktree branch.

### Background sessions

Run long non-interactive prompts detached from the current terminal:

```bash
openclaude --bg "fix failing tests"
openclaude --bg --name auth-refactor "refactor auth middleware"
openclaude ps
openclaude logs auth-refactor
openclaude logs auth-refactor -f
openclaude kill auth-refactor
```

Background sessions are local child processes. OpenClaude does not start a daemon
or network service, and permission/provider/model/settings flags are passed to
the child process the same way they are for a foreground `--print` run. Session
metadata and logs are stored under the resolved OpenClaude config directory,
usually `~/.openclaude/bg-sessions/`; `OPENCLAUDE_CONFIG_DIR` can point
OpenClaude somewhere else. `CLAUDE_CONFIG_DIR` is ignored for OpenClaude
background-session storage. Session names can be reused after older sessions
reach a terminal state; use the session ID to inspect older logs with the same
name. A naturally finished session is recorded as `exited` when its process
returns zero and `failed` when it returns nonzero or handles a termination
signal. `stale` remains the conservative result when the process disappears
without an observed outcome; an explicit successful `openclaude kill` is
recorded as `killed`, and `killed` takes precedence over a natural `exited` or
`failed` outcome for the same process. Terminal outcomes are stored separately
under `bg-sessions/terminal/`; deleting that directory makes finished sessions
fall back to liveness-derived status. OpenClaude does not infer POSIX signal
names on Windows.
Unobservable force termination, host crashes, and power loss remain `stale` on
every platform.

`openclaude attach <id-or-name>` currently reports the matching session and
points to `openclaude logs <id> -f`; full terminal reattach is not implemented
for local background sessions yet.

### OpenClaude config cutover

OpenClaude stores its own config under `~/.openclaude` and `~/.openclaude.json`
by default. It does not read `~/.claude`, project `.claude/` directories, or
`CLAUDE_CONFIG_DIR`; new users can start with an empty OpenClaude config and do
not need Claude Code installed.

If you previously used OpenClaude with `.claude` paths, migrate intentionally:
copy only the settings, commands, agents, skills, scheduled tasks, or other files
you personally created for OpenClaude into the matching `.openclaude` location.
Do not blanket-copy `.claude`, and do not copy Claude Code credentials or auth
files. For provider authentication, prefer running OpenClaude's provider setup
again or exporting provider-specific environment variables.

### Fastest OpenAI setup

macOS / Linux:

```bash
export CLAUDE_CODE_USE_OPENAI=1
export OPENAI_API_KEY=sk-your-key-here
export OPENAI_MODEL=gpt-4o

openclaude
```

Windows PowerShell:

```powershell
$env:CLAUDE_CODE_USE_OPENAI="1"
$env:OPENAI_API_KEY="sk-your-key-here"
$env:OPENAI_MODEL="gpt-4o"

openclaude
```

### Fastest local Ollama setup

macOS / Linux:

```bash
export CLAUDE_CODE_USE_OPENAI=1
export OPENAI_BASE_URL=http://localhost:11434/v1
export OPENAI_MODEL=qwen2.5-coder:7b

openclaude
```

Windows PowerShell:

```powershell
$env:CLAUDE_CODE_USE_OPENAI="1"
$env:OPENAI_BASE_URL="http://localhost:11434/v1"
$env:OPENAI_MODEL="qwen2.5-coder:7b"

openclaude
```

For Ollama, OpenClaude uses Ollama's native chat API and requests a 32768-token
context window on each chat request so same-session history is not silently
truncated by Ollama's OpenAI-compatible shim. Set `OPENCLAUDE_OLLAMA_NUM_CTX`
or `OLLAMA_CONTEXT_LENGTH` if you need a different request-level context size.
See [Advanced Setup](docs/advanced-setup.md#ollama-context-length) for
verification with `ollama ps`.

## Setup Guides

Beginner-friendly guides:

- [Non-Technical Setup](docs/non-technical-setup.md)
- [Windows Quick Start](docs/quick-start-windows.md)
- [macOS / Linux Quick Start](docs/quick-start-mac-linux.md)

Advanced and source-build guides:

- [Advanced Setup](docs/advanced-setup.md)
- [Smart Auto-Routing](docs/smart-routing.md)
- [Agent Routing and Step Limits](docs/agent-routing.md)
- [Headless gRPC Server](docs/grpc-server.md)
- [Repo Map (codebase intelligence)](docs/repo-map.md)
- [Android Install](ANDROID_INSTALL.md)

## Supported Providers

| Provider | Setup Path | Notes |
| --- | --- | --- |
| OpenAI-compatible | `/provider` or env vars | Works with OpenAI, OpenRouter, DeepSeek, Groq, Mistral, LM Studio, and other compatible `/v1` servers |
| Z.AI GLM Coding Plan | `/provider` or OpenAI-compatible env vars | Uses `OPENAI_API_KEY` at `https://api.z.ai/api/coding/paas/v4` and defaults to `glm-5.2` |
| AI/ML API | `/provider` or `AIMLAPI_API_KEY` ([setup guide](docs/aimlapi-setup.md)) | Uses `https://api.aimlapi.com/v1`, auto-detects the OpenAI-compatible route from `AIMLAPI_API_KEY`, sends OpenClaude attribution headers, and discovers chat-capable models from the public `/models` catalog |
| Concentrate | `/provider` or `CONCENTRATE_API_KEY` | Unified OpenAI-compatible gateway at `https://api.concentrate.ai/v1`; defaults to `deepseek-v4-flash` and auto-discovers the chat model catalog |
| LLMTR | `/provider` or OpenAI-compatible env vars | Multi-model gateway at `https://llmtr.com/v1`; `/provider` and `--provider llmtr` default to `deepseek/deepseek-v4-flash`, while raw env setup must set `OPENAI_BASE_URL=https://llmtr.com/v1` and `OPENAI_MODEL`; accepts `LLMTR_API_KEY` or `OPENAI_API_KEY` after the route is selected and discovers tool-capable Chat Completions models from the public catalog |
| ApiSmart | `/provider` or `APISMART_API_KEY` | Uses `https://gw.apismart.ai/v1`, defaults to `DEEPSEEK_V4_FLASH`, and supports optional `APISMART_MODEL` plus authenticated model discovery |
| Hicap | `/provider` or OpenAI-compatible env vars | Uses `api-key` auth, discovers models from unauthenticated `/models`, and supports Responses mode for `gpt-` models |
| Fireworks AI | `/provider` or env vars | First-class provider with 276 curated models (DeepSeek, Qwen, Llama, Gemma, and more); uses `FIREWORKS_API_KEY` |
| LongCat | `/provider` or env vars | Meituan LongCat OpenAI-compatible API at `https://api.longcat.chat/openai/v1`; uses `LONGCAT_API_KEY` and defaults to `LongCat-2.0` |
| ClinePass | `/provider` or env var

> _README 过长已截断, 完整内容请查看 GitHub 仓库。_
