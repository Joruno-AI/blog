<div align="center">

# <img src="https://raw.githubusercontent.com/omnigent-ai/omnigent/main/docs/images/omnigent-logo.svg" alt="" height="38" valign="middle" /> Omnigent

### The open-source meta-harness for all your AI agents.

Omnigent is an open-source **meta-harness** that gives you a common orchestration layer over Claude Code, Codex, Cursor, OpenCode, Hermes, Pi, and the agents you write yourself: swap or combine harnesses without rewriting, enforce policies and sandboxing, and collaborate in real time from any device — terminal, browser, phone, or the native desktop app.

[![PyPI version](https://img.shields.io/pypi/v/omnigent.svg)](https://pypi.org/project/omnigent/)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://github.com/omnigent-ai/omnigent/blob/main/LICENSE)
[![Discord](https://img.shields.io/badge/Discord-join-5865F2?logo=discord&logoColor=white)](https://discord.gg/omnigent)
![Status: alpha](https://img.shields.io/badge/status-alpha-orange.svg)

[omnigent.ai](https://omnigent.ai) · **[⬇️ Download the macOS desktop app](https://omnigent.ai/download/mac)**

</div>

<p align="center">
  <img src="https://raw.githubusercontent.com/omnigent-ai/omnigent/main/docs/images/omnigent-desktop.png" alt="The Omnigent desktop app: starting a new session, with pinned and project-grouped sessions in the sidebar" width="720" />
</p>

---

## Why Omnigent?

Omnigent lets you:

- **📱 Work with agents from any device, including your phone.** Sessions
  follow you: start in your terminal, continue in the browser, pick it up on
  your phone. Messages, sub-agents, terminals, and files stay in sync.

- **🤖 Supervise multiple agents.** Mix Claude Code, Codex, Cursor, OpenCode,
  Hermes, Pi, and custom agents (defined in YAML) together in the same
  session. Ask one agent to review another's work, or split a task across
  agents that are each good at different things.

- **🔌 Use any model.** A first-party API key, a Claude/ChatGPT subscription,
  or any compatible gateway. All first-class.

- **🤝 Collaborate.** Share a session so teammates can chat with your agent
  and watch it work live, co-drive it on your machine, or fork the
  conversation to continue on their own.

- **☁️ Run agents in cloud sandboxes.** No laptop required: run sessions in
  disposable [Modal](https://modal.com), [Daytona](https://www.daytona.io),
  [Blaxel](https://blaxel.ai),
  [Islo](https://islo.dev), [E2B](https://e2b.dev),
  [CoreWeave](https://docs.coreweave.com/products/sandboxes),
  [Kubernetes](https://kubernetes.io), [OpenShell](https://github.com/NVIDIA/OpenShell),
  [Boxlite](https://github.com/boxlite-ai/boxlite), or
  [Databricks](https://www.databricks.com) sandboxes, launched from the
  CLI or provisioned by the server per session (*managed hosts*).

- **🛡️ Govern your agents.** Create
  [policies](#6-govern-your-agents-with-policies) to pause for your approval
  before risky actions, cap spend, or limit which tools an agent reaches.
  They apply to the whole server, one agent, or a single chat.

---

## Quick start

### 1. Install

One command installs Omnigent and everything it needs:

```bash
curl -fsSL https://raw.githubusercontent.com/omnigent-ai/omnigent/main/scripts/install_oss.sh | sh
```

<details>
<summary>Optional integrations and extras</summary>

Need an optional integration? Pass one or more extras to the installer:

```bash
curl -fsSL https://raw.githubusercontent.com/omnigent-ai/omnigent/main/scripts/install_oss.sh | sh -s -- --extra databricks
curl -fsSL https://raw.githubusercontent.com/omnigent-ai/omnigent/main/scripts/install_oss.sh | sh -s -- --extra modal,e2b
```

Available user-facing extras include:

- **Model providers:** `databricks`, `bedrock`, `vertex`
- **Sandbox providers:** `modal`, `daytona`, `blaxel`, `boxlite`, `cwsandbox`, `e2b`,
  `openshell`, `kubernetes`
- **SDK harnesses:** `antigravity`, `copilot`, `cursor`, `agents-sdk`
- **Storage and memory:** `s3`, `hindsight`

</details>

<details>
<summary>Prefer to install manually?</summary>

Omnigent needs **Python 3.12+**. Install the `omnigent` package:

```bash
uv tool install omnigent        # or: pip install "omnigent"
```

Manual installs use the same extras syntax, for example:

```bash
uv tool install "omnigent[databricks,modal]"
```

Or with [Homebrew](https://github.com/omnigent-ai/homebrew-tap):

```bash
brew install omnigent-ai/tap/omnigent
```

Or install straight from the repo:

```bash
uv tool install -q --python 3.12 git+https://github.com/omnigent-ai/omnigent.git
```

</details>

<details>
<summary>Toolchain and prerequisites (if the installer reports a missing tool)</summary>

- **`uv`** (required). https://docs.astral.sh/uv/getting-started/installation/
  The installer offers to set this up for you.
- **`git`** (required).
- **Node.js 22 LTS or newer** with **`npm`** (for the coding-harness CLIs
  installed by `omnigent run`) and **`pnpm`** (for the web UI). You can get
  both from a single Node install; pnpm is available via
  `corepack enable` or `npm install -g pnpm`.
- **Kiro CLI** (optional), for `omnigent kiro`: install with
  `curl -fsSL https://cli.kiro.dev/install | bash`, then sign in with Kiro.
  Kiro tool approvals stay answerable in the embedded Terminal; supported
  one-time approvals also appear as Chat cards. See
  `docs/kiro-native-elicitation.md`.
- **`tmux`**, required by the native `omnigent <harness>` terminal wrappers
  (`claude`, `codex`, `cursor`, `hermes`, `kiro`, `pi`)
  (`brew install tmux` / `apt install tmux`; the installer offers
  to install it for you).
- **`bubblewrap`** (`bwrap`), **Linux only**. The native `omnigent <harness>`
  terminal wrappers and the `pi` harness wrap each agent
  terminal in a `bwrap` OS-sandbox; on Linux that isolation is mandatory, so a
  missing `bwrap` binary makes those terminals fail to start
  (`apt install bubblewrap`; the installer offers to install it for you). macOS
  uses the built-in `seatbelt` sandbox and needs nothing extra.
- **Databricks** (optional). To use a Databricks workspace as your model
  provider, install Omnigent with the `databricks` extra:
  `uv tool install "omnigent[databricks]"` — or pass it to the bootstrap
  installer with `... | sh -s -- --extra databricks`. Signing in to the
  workspace also uses the [Databricks CLI](https://docs.databricks.com/aws/en/dev-tools/cli/install).

</details>

<details>
<summary>Windows (native)</summary>

Omnigent runs natively on Windows in a degraded mode. The `install_oss.sh`
bootstrap is POSIX-only, so install with `uv` directly:

```powershell
uv tool install --python 3.12 omnigent
# or from the repo:
uv tool install --python 3.12 git+https://github.com/omnigent-ai/omnigent.git
```

What works on Windows: `omnigent server`, the web UI, and the SDK-based
harnesses (`omnigent run <agent.yaml>` with the claude-sdk / cursor / codex
harnesses). Agents run under a Windows **Job Object** for process-tree
containment.

What is **not** available on Windows (use Linux/macOS, or WSL, for these):

- the native `omnigent claude` / `omnigent codex` / `omnigent cursor`
  tmux/PTY terminal wrappers (run an SDK harness or the web UI instead);
- `bwrap`/`seatbelt` filesystem & network sandboxing and the L7 egress proxy
  — the Job Object backend contains the process tree and enforces resource
  limits but does **not** isolate the filesystem or network.

</details>

<details>
<summary>Updating to a new release</summary>

When a newer release is on PyPI, Omnigent shows a one-line notice (once per
release) pointing here. To update:

```bash
omni upgrade            # detects how you installed, drains & stops the local
                        # server, then runs the matching upgrade command
omni upgrade --check    # just report whether a newer release is available
```

`omni upgrade` waits for in-flight agent sessions to finish before stopping the
local server (pass `--force` to stop them immediately); the next `omni` command
brings the server back up on the new version. Source checkouts update with
`git pull` instead. Silence the notice with `OMNIGENT_NO_UPDATE_CHECK=1`.

The check queries your configured package index — honoring `UV_INDEX_URL` /
`PIP_INDEX_URL` and your `uv.toml` / `pip.conf` (default PyPI), so private
mirrors work out of the box; override with `OMNIGENT_INDEX_URL` if needed.

</details>

<details>
<summary>Uninstalling Omnigent</summary>

Preview the CLI/profile cleanup that would run by default:

```bash
omnigent uninstall
```

Remove the CLI and installer-managed PATH entries while keeping your local
history, credentials, and projects:

```bash
omnigent uninstall --yes
```

To also remove Omnigent state under `~/.omnigent`, pass `--purge`; Omnigent
backs it up outside the target before deletion. Your `~/omnigent` workspace is
kept unless you explicitly add `--purge-workspace`.

```bash
omnigent uninstall --purge --yes
```

If the installed wheel is broken or `omnigent` is not on `PATH`, run the
standalone script instead:

```bash
curl -fsSL https://raw.githubusercontent.com/omnigent-ai/omnigent/main/scripts/uninstall_oss.sh | sh
```

Add `--yes` to the standalone script to perform the previewed CLI cleanup.

</details>

### 2. Start your first agent

`omnigent` picks a model with you and starts a session in your terminal. It
also launches a local web UI at `http://localhost:6767` that shows the same
session in the browser, or on a phone on your network (step 4). The
[desktop app](https://omnigent.ai/docs/interact/desktop) wraps that same UI
in a native window and adds OS notifications (with a configurable sound) and a dock badge —
[download it for macOS](https://omnigent.ai/download/mac).

> [!NOTE]
> The install puts two names for the same CLI on your PATH: `omnigent` and
> the shorter `omni`. They're interchangeable.

> [!TIP]
> On first run, Omnigent picks up model credentials already in your
> environment (an `ANTHROPIC_API_KEY` / `OPENAI_API_KEY`, or a `claude` /
> `codex` CLI you're logged into) and offers one as the default.

```bash
omnigent
```

Or launch a specific agent runtime:

```bash
omnigent claude                      # Claude Code, in a session your team can join
omnigent codex                       # Codex
omnigent cursor                      # Cursor
omnigent agy                         # Antigravity
omnigent opencode                    # OpenCode
omnigent hermes                      # Hermes Agent (Nous Research)
omnigent pi                          # Pi
```

Using OpenClaw? See the [OpenClaw integration guide](docs/openclaw.md) to import
its coding agents or drive a live OpenClaw Gateway session over ACP.

<details>
<summary>Grok Build and Devin</summary>

Two more coding agents are built in but have no `omnigent <name>` launcher of
their own, because each ships a CLI that holds its own login. Install the vendor
CLI, log in with it, then name the harness:

```bash
# Grok Build (xAI)
curl -fsSL https://x.ai/cli/install.sh | bash
grok login --device-auth              # xAI OAuth
omnigent run --harness grok           # 'grok-build' also works

# Devin (Cognition)
curl -fsSL https://cli.devin.ai/install.sh | bash
devin auth login
omnigent run --harness devin
```

Both speak the [Agent Client Protocol](https://agentclientprotocol.com) over
stdio, and Omnigent stores no credential for either — each CLI reads back the
login it wrote to disk. That also means `--model` is refused rather than
silently dropped: both run their account-default model. To pin one, configure an
`acp:` agent whose command passes the vendor's own model flag.

Use the vendor login rather than an API key. A builtin ACP row has no
`env_passthrough` of its own, and `XAI_API_KEY` is not in the host-to-runner
credential allowlist, so exporting it in your shell does not reach the agent.
If you need the key route, pass it explicitly with
`OMNIGENT_RUNNER_ENV_PASSTHROUGH=XAI_API_KEY`, or configure an `acp:` agent that
declares the passthrough.

</details>

#### 🐙 Polly and 🟠🔵 Debby

Two example agents ship with the repo, and they make good first sessions:

```bash
omnigent run examples/polly/
omnigent run examples/debby/
omnigent run examples/deep-research/

# ...or on a different harness (sub-agents keep their own):
omnigent run examples/polly/ --harness <harness>
omnigent run examples/debby/ --harness <harness>
```

**🐙 Polly** is a multi-agent coding orchestrator who writes no code herself.
She's the tech lead: she plans, delegates the work to coding sub-agents
(Claude Code, Codex, or Pi) in parallel git worktrees, then routes each diff
to a reviewer from a different vendor than the one that wrote it. You merge.

**🟠🔵 Debby** is a brainstorming partner with two heads, one Claude and one GPT.
Every question you ask goes to both heads, and she lays the two answers out
side by side. Type `/debate` and the heads critique each other for a few
rounds before converging. (She needs both a Claude and an OpenAI credential;
see step 3.)

**🔎 Deep Research** is a single agent that answers a question with a cited,
cross-checked report. It plans sub-queries, searches the live web and reads
full pages through an MCP search server, and verifies each claim across
independent sources. It's also the simplest example to copy from: one agent
plus one `tools/mcp/*.yaml` server, no sub-agents.

**Prefer the browser?** One command starts the local server and registers this
machine as a host:

```bash
omnigent start   # starts the local server and registers this machine as a host
```

Open the server URL it prints, hit **New Chat**, pick your machine, and go.
Check status with `omnigent server status`; stop everything with
`omnigent stop`.

### 3. Choose & switch models

```bash
omnigent setup
```

Add a credential, set a default, or remove one, grouped by agent. Omnigent
works with four kinds of credentials:

| | Kind | What it is |
|---|---|---|
| 🔑 | **API key** | A first-party vendor key for Anthropic, OpenAI, and similar providers |
| 🎟️ | **Subscription** | A Claude Pro/Max or ChatGPT plan, via the official `claude` / `codex` CLIs |
| 🌐 | **Gateway** | Any OpenAI- or Anthropic-compatible `base_url` and key (OpenRouter, LiteLLM, Ollama, vLLM, Azure) |
| 🧱 | **Databricks** | A Databricks workspace profile (requires the `databricks` extra) |

Defaults are per agent, so a Claude default and a Codex default coexist. You
can also switch models in the middle of a session with the `/model` command.

<details>
<summary>Gateway base URLs (OpenRouter, Ollama)</summary>

When you add a **Gateway** credential, `omnigent setup` asks for a base URL
and a key. The base URL depends on which agent you point it at:

| Provider | For | Base URL | Key |
|---|---|---|---|
| **OpenRouter** | Claude Code | `https://openrouter.ai/api` | your OpenRouter key (`sk-or-…`) |
| **OpenRouter** | Codex / OpenAI agents | `https://openrouter.ai/api/v1` | your OpenRouter key (`sk-or-…`) |
| **Ollama** (local) | Codex / Op

> _README 过长已截断, 完整内容请查看 GitHub 仓库。_
