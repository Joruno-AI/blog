# Agent Skills for Context Engineering

A comprehensive, open collection of Agent Skills focused on context engineering and harness engineering principles for building production-grade AI agent systems. These skills teach the art and science of curating context, designing agent operating loops, and evaluating agent behavior across any agent platform.

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/muratcankoylan/Agent-Skills-for-Context-Engineering)

## What is Context Engineering?

Context engineering is the discipline of managing the language model's context window. Unlike prompt engineering, which focuses on crafting effective instructions, context engineering addresses the holistic curation of all information that enters the model's limited attention budget: system prompts, tool definitions, retrieved documents, message history, and tool outputs.

The fundamental challenge is that context windows are constrained not by raw token capacity but by attention mechanics. As context length increases, models exhibit predictable degradation patterns: the "lost-in-the-middle" phenomenon, U-shaped attention curves, and attention scarcity. Effective context engineering means finding the smallest possible set of high-signal tokens that maximize the likelihood of desired outcomes.

## Recognition

This repository is cited in academic research as foundational work on static skill architecture:

> "While static skills are well-recognized [Anthropic, 2025b; Muratcan Koylan, 2025], MCE is among the first to dynamically evolve them, bridging manual skill engineering and autonomous self-improvement."
1. [Meta Context Engineering via Agentic Skill Evolution](https://arxiv.org/pdf/2601.21557), Peking University State Key Laboratory of General Artificial Intelligence (2025)
2. [Agent Harness Engineering: A Survey](https://openreview.net/pdf/f358711a95aaaf61fdeffd4ef3fc60fba9b8da57.pdf), CMU, Yale, JHU, NEU, Tulane, UAB, OSU, Virginia Tech, and Amazon (2026)

## Skills Overview

### Foundational Skills

These skills establish the foundational understanding required for all subsequent context engineering work.

| Skill | Description |
|-------|-------------|
| [context-fundamentals](skills/context-fundamentals/) | Understand what context is, why it matters, and the anatomy of context in agent systems |
| [context-degradation](skills/context-degradation/) | Recognize patterns of context failure: lost-in-middle, poisoning, distraction, and clash |
| [context-compression](skills/context-compression/) | Design and evaluate compression strategies for long-running sessions |

### Architectural Skills

These skills cover the patterns and structures for building effective agent systems.

| Skill | Description |
|-------|-------------|
| [multi-agent-patterns](skills/multi-agent-patterns/) | Master orchestrator, peer-to-peer, and hierarchical multi-agent architectures |
| [long-horizon-prompting](skills/long-horizon-prompting/) | **NEW** Write pseudo-formal task briefs for long-running autonomous agents and parallel orchestrations: exact success predicates, non-counting outcomes, audit-gated return conditions, effort floors, and diversity policies, modeled on the published GPT-5.6 Sol Ultra Cycle Double Cover prompt |
| [memory-systems](skills/memory-systems/) | Design short-term, long-term, and graph-based memory architectures |
| [tool-design](skills/tool-design/) | Build tools that agents can use effectively |
| [filesystem-context](skills/filesystem-context/) | Use filesystems for dynamic context discovery, tool output offloading, and plan persistence |
| [hosted-agents](skills/hosted-agents/) | **NEW** Build background coding agents with sandboxed VMs, pre-built images, multiplayer support, and multi-client interfaces |

### Operational Skills

These skills address the ongoing operation and optimization of agent systems.

| Skill | Description |
|-------|-------------|
| [context-optimization](skills/context-optimization/) | Apply compaction, masking, and caching strategies |
| [latent-briefing](skills/latent-briefing/) | Share task-relevant orchestrator state with workers via task-guided KV cache compaction when the worker runtime is controllable |
| [evaluation](skills/evaluation/) | Build evaluation frameworks for agent systems |
| [advanced-evaluation](skills/advanced-evaluation/) | Master LLM-as-a-Judge techniques: direct scoring, pairwise comparison, rubric generation, and bias mitigation |
| [harness-engineering](skills/harness-engineering/) | Design autonomous agent harnesses with locked metrics, durable logs, novelty gates, rollback, and human approval boundaries |
| [self-improvement-loops](skills/self-improvement-loops/) | **NEW** Build loops where the harness itself is the optimization target: RSI, meta-harness search, failure-driven self-edits, evolutionary scaffold search, and acceptance gates for self-modifying systems |

### Development Methodology

These skills cover the meta-level practices for building LLM-powered projects.

| Skill | Description |
|-------|-------------|
| [project-development](skills/project-development/) | Design and build LLM projects from ideation through deployment, including task-model fit analysis, pipeline architecture, and structured output design |

### Cognitive Architecture Skills

These skills cover formal cognitive modeling for rational agent systems.

| Skill | Description |
|-------|-------------|
| [bdi-mental-states](skills/bdi-mental-states/) | **NEW** Transform external RDF context into agent mental states (beliefs, desires, intentions) using formal BDI ontology patterns for deliberative reasoning and explainability |

## Design Philosophy

### Progressive Disclosure

Each skill is structured for efficient context use. At startup, agents load only skill names and descriptions. Full content loads only when a skill is activated for relevant tasks.

### Platform Agnosticism

These skills focus on transferable principles rather than vendor-specific implementations. The patterns work across Claude Code, Cursor, and any agent platform that supports skills or allows custom instructions.

### Conceptual Foundation with Practical Examples

Scripts and examples demonstrate concepts using Python pseudocode that works across environments without requiring specific dependency installations.

## Usage

### Usage with Claude Code

This repository is a **Claude Code Plugin Marketplace** containing context engineering skills that Claude automatically discovers and activates based on your task context.

### Installation

**Step 1: Add the Marketplace**

Run this command in Claude Code to register this repository as a plugin source:

```
/plugin marketplace add muratcankoylan/Agent-Skills-for-Context-Engineering
```

**Step 2: Install the Plugin**

Option A - Browse and install:
1. Select `Browse and install plugins`
2. Select `context-engineering-marketplace`
3. Select `context-engineering`
4. Select `Install now`

Option B - Direct install via command:

```
/plugin install context-engineering@context-engineering-marketplace
```

This installs all published skills in a single plugin. Skills are activated automatically based on your task context.

### Skill Activation Scenarios

| Skill | Activate When |
|-------|---------------|
| `context-fundamentals` | Establishing context-window mental models, planning agent architecture, or explaining how context components affect model behavior |
| `context-degradation` | Diagnosing attention failures, context poisoning, lost-in-middle behavior, or degraded agent performance across long sessions |
| `context-compression` | Preserving useful state while reducing conversation, tool-output, or trajectory size under context pressure |
| `context-optimization` | Improving token efficiency, retrieval precision, prefix reuse, masking, partitioning, or budget allocation for agent systems |
| `latent-briefing` | Sharing orchestrator trajectory with workers via task-guided KV cache compaction when the worker runtime is controllable and the models are compatible |
| `multi-agent-patterns` | Choosing coordination patterns, isolating context across agents, designing handoffs, or evaluating whether parallel agents are justified |
| `long-horizon-prompting` | Writing or evaluating the launch prompt for a long-running autonomous agent or parallel orchestration: success predicates, non-counting outcomes, persistence and stop rules, adversarial audit gates, and portfolio diversity policies |
| `memory-systems` | Persisting cross-session knowledge, tracking entities over time, choosing memory frameworks, or designing retrieval and update semantics |
| `tool-design` | Defining agent-tool contracts, consolidating tool surfaces, improving descriptions, or making tool errors actionable |
| `filesystem-context` | Moving large or durable context into files, creating scratchpads, supporting just-in-time discovery, or coordinating agents through shared artifacts |
| `hosted-agents` | Running coding agents in remote sandboxes, background environments, warm pools, or multiplayer agent infrastructure |
| `evaluation` | Creating deterministic checks, rubrics, regression suites, production monitoring, or quality gates for agent behavior |
| `advanced-evaluation` | Using LLM judges, pairwise comparison, calibration, bias mitigation, or human-aligned quality assessment |
| `harness-engineering` | Designing autonomous loops with locked evaluators, editable surfaces, durable logs, novelty gates, rollback, and approval boundaries |
| `self-improvement-loops` | Building loops that modify themselves: failure-driven harness self-edits, meta-harness search, evolutionary scaffold search, context mechanism evolution, and acceptance gates for self-modification |
| `project-development` | Deciding whether an LLM is appropriate, shaping batch pipelines, creating staged artifacts, or estimating operational cost |
| `bdi-mental-states` | Modeling beliefs, desires, intentions, rational action traces, or neuro-symbolic state transformations for agents |

<img width="1014" height="894" alt="Screenshot 2025-12-26 at 12 34 47 PM" src="https://github.com/user-attachments/assets/f79aaf03-fd2d-4c71-a630-7027adeb9bfe" />

### For Cursor, Codex, and Open Plugins

This repository ships as an [Open Plugins](https://open-plugins.com) plugin. Hosts discover skills from the repo-root `skills/` directory (each subdirectory contains a `SKILL.md` file). The manifest lives at `.plugin/plugin.json`.

**Cursor (recommended):**

1. Install from the [Cursor Plugin Directory](https://cursor.directory/plugins/context-engineering), or clone this repo and point Cursor at the plugin root.
2. Cursor reads `.plugin/plugin.json` and discovers the repo-root `skills/` directory through the Open Plugins manifest.
3. For project-local manual installs, copy skill directories into `.cursor/skills/`. Do not rely on repository symlinks; they are fragile on Windows and in plugin packaging.

**Codex / GitHub Copilot CLI / other Open Plugins hosts:**

1. Clone or add this repository as a plugin directory.
2. The host reads `.plugin/plugin.json` and discovers all published skills under `skills/`.
3. For project-local manual installs, copy skill directories into `.codex/skills/` or the host's documented Agent Skills directory.

### Using Individual Skills

Agent Skills require a **directory layout**, not a flat markdown file. Copy the skill folder into your project's skills directory:

```bash
# Example: add just the context-fundamentals skill to a Cursor project
mkdir -p .cursor/skills
cp -R skills/context-fundamentals .cursor/skills/

# Claude Code project-scoped install (same directory layout)
mkdir -p .claude/skills
cp -R skills/context-fundamentals .claude/skills/

# Codex project-scoped install
mkdir -p .codex/skills
cp -R skills/context-fundamentals .codex/skills/

# Generic Agent Skills repo-scoped install (Codex/OpenAI, Copilot CLI, Open Plugins hosts)
mkdir -p .agents/skills
cp -R skills/context-fundamentals .agents/skills/
```

Do not flatten `SKILL.md` into a single file at `.claude/skills/context-fundamentals.md`. That breaks relative `references/` paths and violates the Agent Skills directory spec used by Cursor, Claude Code, and Codex.

Available skills: `context-fundamentals`, `context-degradation`, `context-compression`, `context-optimization`, `latent-briefing`, `multi-agent-patterns`, `long-horizon-prompting`, `memory-systems`, `tool-design`, `filesystem-context`, `hosted-agents`, `evaluation`, `advanced-evaluation`, `harness-engineering`, `self-improvement-loops`, `project-development`, `bdi-mental-states`

### For Custom Implementations

Extract the principles and patterns from any skill and implement them in your agent framework. The skills are deliberately platform-agnostic.

## Examples

The [examples](examples/) folder contains complete system designs that demonstrate how multiple skills work together in practice.

| Example | Description | Skills Applied |
|---------|-------------|----------------|
| [digital-brain-skill](examples/digital-brain-skill/) | **NEW** Personal operating system for founders and creators. Complete Claude Code skill with 6 modules, 4 automation scripts | context-fundamentals, context-optimization, memory-systems, tool-design, multi-agent-patterns, evaluation, project-development |
| [x-to-book-system](examples/x-to-book-system/) | Multi-agent system that monitors X accounts and generates daily synthesized books | multi-agent-patterns, memory-systems, context-optimization, tool-design, evaluation |
| [llm-as-judge-skills](examples/llm-as-judge-skills/) | Production-ready LLM evaluation tools with TypeScript implementation, 19 passing tests | advanced-evaluation, tool-design, context-fundamentals, evaluation |
| [book-sft-pipeline](examples/book-sft-pipeline/) | Train models to write in any author's style. Includes Gertrude Stein case study with 70% human score on Pangram, $2 total cost | project-development, context-compression, multi-agent-patterns, evaluation |
| [interleaved-thinking](examples/interleaved-thinking/) | Reasoning trace optimizer that captures, analyzes, and converts agent failure patterns into generated skills | evaluation, advanced-evaluation, context-degradation, harness-engineering |
| [long-horizon-prompt-lab](examples/long-horizon-prompt-lab/) | Production-ready educational website: method guide, copyable task-brief template, four complete prompt rewrites, structural audits, and a caveated research/vendor reference catalog | long-horizon-prompting, harness-engineering, multi-agent-patterns, advanced-evaluation |

Each example includes:
- Complete PRD with architecture decisions
- Skills mapping showing which concepts informed each decision
- Implementation guidance

### Digital Brain Skill Example

The [digital-brain-skill](examples/digital-brain-skill/) example is a complete personal operating system demonstrating comprehensive skills application:

- *

> _README 过长已截断, 完整内容请查看 GitHub 仓库。_
