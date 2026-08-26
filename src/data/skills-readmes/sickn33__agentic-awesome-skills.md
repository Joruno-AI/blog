<!-- registry-sync: version=16.1.0; skills=2028; stars=45378; updated_at=2026-08-25T17:54:41+00:00 -->
# AAS Core — Agentic Awesome Skills

> **Local, agent-owned skill stacks for coding agents—from complete catalog access to a reproducible, reviewable plan.**

**Current release: V16.1.0.** This release includes AAS Core for complete local catalog search, agent-owned selection, manifest validation, planning, and diagnosis. Apply and recovery remain experimental and outside the supported preview path.

Codex or Claude inspects your project and chooses exact skills from the complete local AAS catalog. AAS Core does not rank or recommend them: its read-only `compose_stack` tool validates the agent-owned selection in memory, and a client or the `aas` CLI can persist it as `aas-stack.json` and produce an immutable plan before any target change.

**[Read the AAS Core preview guide →](https://github.com/sickn33/agentic-awesome-skills/blob/v16.1.0/docs/users/aas-core.md)**

```text
Project
  -> inspected by Codex or Claude (not by AAS)
  -> agent searches and reads the complete local catalog
  -> AAS MCP (local stdio, read-only)
  -> Codex or Claude chooses exact skill IDs
  -> compose_stack validates the selection in memory (read-only)
  -> client or AAS CLI persists aas-stack.json and optional evidence
  -> AAS CLI validate + immutable plan preview
  -> human review (optionally in Workbench)
```

The reusable `SKILL.md` playbooks, specialized plugins, bundles, workflows, and direct installers remain important. They are the content, curation, distribution, and compatibility layers around AAS Core—not competing primary products.

This is an independent community project. It is not affiliated with, sponsored by, endorsed by, or authorized by Google. Google, Antigravity, Gemini, and related product names are referenced only to describe compatibility and install targets. The GitHub repository is canonical; the hosted catalog and browser-local Workbench are companion discovery and review surfaces, not a hosted control plane.

[![GitHub stars](https://img.shields.io/badge/⭐%2045%2C000%2B%20Stars-gold?style=for-the-badge)](https://github.com/sickn33/agentic-awesome-skills/stargazers)
[![Follow @AASkills_ on X](https://img.shields.io/badge/Follow-%40AASkills__-black?style=for-the-badge&logo=x)](https://x.com/AASkills_)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-Anthropic-purple)](https://claude.ai)
[![Cursor](https://img.shields.io/badge/Cursor-AI%20IDE-orange)](https://cursor.sh)
[![Codex CLI](https://img.shields.io/badge/Codex%20CLI-OpenAI-green)](https://github.com/openai/codex)
[![Autohand Code](https://img.shields.io/badge/Autohand%20Code-CLI-blue)](https://github.com/autohandai/code-cli)
[![Gemini CLI](https://img.shields.io/badge/Gemini%20CLI-Google-blue)](https://github.com/google-gemini/gemini-cli)
[![Latest Release](https://img.shields.io/github/v/release/sickn33/agentic-awesome-skills?display_name=tag&style=for-the-badge)](https://github.com/sickn33/agentic-awesome-skills/releases/latest)
[![Direct skill distribution](https://img.shields.io/badge/Direct%20skills-npx%20agentic--awesome--skills-black?style=for-the-badge&logo=npm)](#installation)
[![Kiro](https://img.shields.io/badge/Kiro-AWS-orange?style=for-the-badge)](https://kiro.dev)
[![Copilot](https://img.shields.io/badge/Copilot-GitHub-lightblue?style=for-the-badge)](https://github.com/features/copilot)
[![OpenCode](https://img.shields.io/badge/OpenCode-CLI-gray?style=for-the-badge)](https://github.com/opencode-ai/opencode)
[![Antigravity](https://img.shields.io/badge/Antigravity-AI%20IDE-red?style=for-the-badge)](https://github.com/sickn33/agentic-awesome-skills)

## AAS Core: Agent-First Preview

> **The agent composes. You control. AAS keeps the stack reproducible.**

AAS Core gives the repository one product model:

- **Let the agent choose.** The local MCP preserves `search_skills`, `get_skill`, `compose_stack`, `inspect_stack`, and `diff_stack`, and adds read-only `export_selection_evidence` and `inspect_selection_evidence`; Core does not rank, recommend, exclude, or hide skills.
- **Guide capability coverage.** MCP session instructions require the agent to evaluate the full project surface—from architecture, domain behavior, data and integrations through testing, security, UX, deployment, and maintenance—then search each applicable capability, compare multiple candidates, cover it with a non-redundant skill or report a catalog gap, and avoid stopping at a minimal shortlist. Core records and validates the resulting selection, but it does not certify semantic completeness.
- **Keep the chosen stack and evidence reviewable.** A client or the CLI can persist `aas-stack.json` and the separate `aas-selection-evidence.json` sidecar in an `artifact-dir`; the manifest preserves exact agent-selected IDs, while evidence records factual process trace and the agent-declared capability ledger.
- **Validate and preview through the CLI.** `aas stack validate` checks the proposal, while `aas stack plan` produces an immutable, per-target plan without applying it.
- **Review in Workbench.** The hosted Workbench imports and reviews stack/plan JSON in browser memory; it does not access your filesystem or install anything.
- **Retain every useful distribution path.** Direct installs, plugins, bundles, workflows, and the full catalog remain available as payload and compatibility surfaces.

> [!IMPORTANT]
> Structural and identity validity does not certify semantic fit, compatibility, setup correctness, operational safety, or safety to apply.

| Surface | Current status |
| --- | --- |
| Published package | Current npm release; AAS Core status is `agent-first-preview` |
| Catalog search and inspection | Supported preview; local and read-only |
| Agent-owned composition | Supported preview; Core validates IDs and structure, not semantic suitability; manifests have a technical maximum of 128 skills |
| Stack validation and plan preview | Supported preview; no target skill changes |
| Workbench | Browser-local review of stack and plan artifacts |
| Selection evidence | Exported and inspected through MCP/CLI contracts; not yet reviewed in Workbench |
| Apply and recovery | Experimental, explicit opt-in, outside the supported safety claim |
| Semantic suitability certification | Not provided |

Read the [AAS Core guide](https://github.com/sickn33/agentic-awesome-skills/blob/v16.1.0/docs/users/aas-core.md) for the exact trust boundaries, current preview status, Codex/Claude setup model, and CLI lifecycle.

## Why This Repo

- **Agent-first, locally controlled**: Codex or Claude inspects the project and chooses from the complete local catalog without uploading your repository to AAS.
- **Complete and inspectable**: every catalog skill is searchable, readable, and available for agent selection; Core does not certify suitability, compatibility, or operational safety, and metadata is informational rather than an eligibility gate.
- **Approval before writes**: the durable artifacts are an approved stack and immutable plan, not an opaque one-shot install.
- **Installable, not just inspirational**: use the compatible legacy installer or plugin distributions when direct delivery is the right path.
- **Built for major agent workflows**: Claude Code, Cursor, Codex CLI, Autohand Code, Gemini CLI, Antigravity, Kiro, OpenCode, Copilot, and more.
- **Broad coverage with real utility**: 2,028+ skills across development, testing, security, infrastructure, product, and marketing.
- **Inspect before installing**: the hosted [Skill Workbench](https://sickn33.github.io/agentic-awesome-skills/workbench) reviews agent-produced stack manifests and immutable plans without browser-side installation.
- **Focused delivery remains available**: specialized plugins package proven sets for web, security, data, docs, DevOps, QA, OSS, or agent/MCP workflows.
- **Useful whether you want breadth or curation**: install the full catalog, choose a specialized plugin, start with bundles, or compare alternatives before installing.

### Why not just search the skills directory?

Direct file search can find candidate prose, but it leaves the result in the conversation. AAS Core adds verified catalog identity, explicit target binding, durable desired state, optional selection evidence, deterministic validation, immutable planning, and dedicated review surfaces. Its value is not choosing better than the coding agent; it is turning the agent's choice into reproducible, inspectable state.

## Table of Contents

- [AAS Core: Agent-First Preview](#aas-core-agent-first-preview)
- [Why This Repo](#why-this-repo)
- [Installation](#installation)
- [Recommended Specialized Plugins](#recommended-specialized-plugins)
- [Choose Your Tool](#choose-your-tool)
- [Quick FAQ](#quick-faq)
- [Bundles & Workflows](#bundles--workflows)
- [Browse 2,028+ Skills](#browse-2028-skills)
- [Troubleshooting](#troubleshooting)
- [Stable Skills Manifest v1](#stable-skills-manifest-v1)
- [Support the Project](#support-the-project)
- [Contributing](#contributing)
- [Community](#community)
- [Credits & Sources](#credits--sources)
- [Repo Contributors](#repo-contributors)
- [Star History](#star-history)
- [License](#license)

## Installation

For Codex and Claude, start with the [AAS Core guide](https://github.com/sickn33/agentic-awesome-skills/blob/v16.1.0/docs/users/aas-core.md): configure the local MCP, ask the agent to inspect the project and choose exact IDs from the full catalog, review the proposed `aas-stack.json`, then run CLI validation and planning. The MCP and validation are read-only. Planning writes only the requested plan artifact; it does not materialize skill payloads or AAS managed state in the target.

Use direct installation when your host does not yet have a native AAS Core adapter, when you already know the exact skill IDs, or when you deliberately prefer manual selection:

- **Specialized plugins** when the job has a clear domain.
- **Full library install** when you want every skill available in a local skills directory.
- **Bundles and workflows** when you want role-based recommendations or ordered execution playbooks.

### Direct skill install

```bash
# Antigravity: preview an exact, agent-selected set before writing.
npx agentic-awesome-skills --antigravity --skills brainstorming,systematic-debugging --dry-run

# Antigravity CLI slash commands (agy): ~/.gemini/antigravity-cli/skills/<skill>/SKILL.md
npx agentic-awesome-skills --agy
```

The npm installer uses a shallow, release-pinned clone by default and verifies the cloned commit against the immutable `gitHead` recorded for that exact npm package version. If the GitHub tag moved or npm identity metadata is unavailable, installation stops before copying content. Use `--tag main` only when you intentionally accept a mutable, explicitly unverified repository ref.

Antigravity watches `~/.agents/skills` and may load enough installed instructions
to exhaust its context, slow startup, trigger truncation errors, or enter a crash
loop. For that target, the installer stops before cloning or writing unless you
provide `--skills`, a metadata filter, or the explicit `--all` override. The bare
`npx agentic-awesome-skills` command uses the same protected Antigravity target.

The recommended flow is to ask Codex or Claude with the read-only AAS Core MCP
configured to inspect the project, search the complete catalog, and choose exact
skill IDs. AAS MCP selects and validates IDs but does not install them; the agent
or user then previews the direct installation with the command above and repeats
it without `--dry-run` after review.

Other direct-install targets retain the legacy-compatible full-catalog behavior
when no selectors are supplied. The CLI prints the catalog's risk summary first:
a full install includes `critical` and authorized-use-only `offensive`
instructions. Installation copies files; it does not execute their commands,
but an agent may act on an installed skill later. Prefer an exact reviewed set:

```bash
npx agentic-awesome-skills audit --skills brainstorming,backend-dev-guidelines
npx agentic-awesome-skills --skills brainstorming,backend-dev-guidelines --dry-run
```

If you deliberately accept the context and crash-loop risk, the complete
Antigravity catalog remains available through explicit consent:

```bash
npx agentic-awesome-skills --antigravity --all
```

The audit reads the selected skill directories without executing them and
reports command, network, credential, filesystem, privileged, destructive,
symlink, and binary signals. It is a review aid, not a safety certificate. See
[Security, trust, and antivirus alerts](docs/users/security-and-antivirus.md).

### Focused single-skill install with GitHub CLI (preview)

GitHub CLI can preview and install one exact skill for Copilot and other supported hosts. Use an exact `SKILL.md` path in this large, mirrored repository so the selected source is unambiguous and discovery stays fast:

```bash
gh skill preview sickn33/agentic-awesome-skills skills/brainstorming/SKILL.md
gh skill install sickn33/agentic-awesome-skills skills/brainstorming/SKILL.md \
  --agent github-copilot --scope user --pin v14.2.0
```

`gh skill` support is currently a GitHub CLI preview and may change. Install a focused skill or plugin surface for the job; do not use `--all` unless you intentionally want every discovered canonical and mirrored skill.

### Verify the install

```bash
test -d ~/.agents/skills && echo "Skills installed in ~/.agents/skills"
```

### Run your first skill

```text
Use @brainstorming to plan a SaaS MVP.
```

### Prefer plugins for Claude Code, Codex, or another compatible client?

- Use a specialized plugin when you want a focused marketplace-style distribution.
- Use the full-library plugin only when you want the widest plugin-safe catalog.
- Read [Plugins for compatible agent clients](docs/users/plugins.md) for host-specific installs, portable Agent Plugins bundles, and direct skills installs.

## Recommended Specialized Plugins

Do not install everything first if you already know the work. Start with the focused plugin for your job, then add more only when the task expands.

All specialized plugins are generated as Claude Code and Codex plugin bundles. Bundles with flat, cross-host-safe skill layouts also receive a standard Agent Plugins 1.0 root manifest. For Antigravity, use the same `SKILL.md` content through the installer or supported skills paths.

| Plugin | Skills | Best for |
| --- | ---: | --- |
| AAS Web App Builder | 10 | Frontend and full-stack developers shipping modern web apps. |
| AAS Product Design Studio | 10 | Product UI, brand, portfolio, accessibility, and richer visual work. |
| AAS Security Engineer | 10 | Authorized security testing, audit, and hardening. |
| AAS Secure App Builder | 10 | Developers who want sec

> _README 过长已截断, 完整内容请查看 GitHub 仓库。_
