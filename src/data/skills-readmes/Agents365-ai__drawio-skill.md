# drawio-skill — From Text to Professional Diagrams

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/Agents365-ai/drawio-skill?style=flat&logo=github)](https://github.com/Agents365-ai/drawio-skill/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/Agents365-ai/drawio-skill?style=flat&logo=github)](https://github.com/Agents365-ai/drawio-skill/network/members)
[![Latest Release](https://img.shields.io/github/v/release/Agents365-ai/drawio-skill?logo=github)](https://github.com/Agents365-ai/drawio-skill/releases/latest)
[![Last Commit](https://img.shields.io/github/last-commit/Agents365-ai/drawio-skill?logo=github)](https://github.com/Agents365-ai/drawio-skill/commits/main)

[![SkillsMP](https://img.shields.io/badge/SkillsMP-listed-1f6feb)](https://skillsmp.com/skills/agents365-ai-drawio-skill-skills-drawio-skill-skill-md)
[![ClawHub](https://img.shields.io/badge/ClawHub-listed-ff6b35)](https://clawhub.ai/agents365-ai/drawio-pro-skill)
[![Claude Code Plugin](https://img.shields.io/badge/Claude%20Code-plugin-8a2be2)](https://github.com/Agents365-ai/365-skills)
[![Agent Skills](https://img.shields.io/badge/Agent%20Skills-compatible-2ea44f)](https://agentskills.io)

**English** · [中文](README_CN.md) · [📖 Online Docs](https://agents365-ai.github.io/drawio-skill/)

A skill that turns natural-language descriptions into `.drawio` XML and exports them to PNG / SVG / PDF / JPG via the native draw.io desktop CLI. It can also turn an **existing codebase** (Python / JS-TS / Go / Rust), **Terraform / Kubernetes / docker-compose infrastructure**, or a **SQL schema** into an auto-laid-out diagram. Works with **Claude Code, Cursor, Copilot, OpenClaw, Codex, Autohand Code, Hermes**, and any agent compatible with the [Agent Skills](https://agentskills.io) format.

<p align="center">
  <img src="assets/microservices-example.png" width="900" alt="Microservices Architecture — generated from a single natural-language prompt">
</p>

## ✨ Highlights

- **11 diagram type presets** — ERD, UML Class, Sequence, C4, Architecture, ML/Deep Learning, Flowchart, SysML (BDD / IBD / Requirement / Parametric), BPMN, Network Topology, Cross-Functional Swimlane
- **Mermaid → native .drawio** (draw.io ≥ 30) — author 28 standard types as Mermaid text (**mindmap, gantt, timeline, journey, pie, sankey, kanban**…) and the CLI converts them into a laid-out, editable `.drawio` — structure in, layout free
- **Visualize a codebase** — extract and auto-lay-out the structure of a Python / JS-TS / Go / Rust project (import graphs) or a Python class hierarchy — Graphviz placement, transitive reduction, nested module containers
- **IaC → architecture diagram** — turn **Terraform** configs, **Kubernetes** manifests, or **docker-compose** files into an architecture diagram where every resource renders as its **official AWS / Azure / GCP / K8s icon**, edges derived from actual references (role ARNs, selectors, volume mounts)
- **SQL DDL → ER diagram** — parse `CREATE TABLE` statements into per-table nodes with PK/FK markers and crow's-foot foreign-key edges
- **Deterministic sequence diagrams** — describe participants + messages as JSON; lifelines, auto-tracked activation bars, and arrows are computed, never hand-placed
- **C4 model with drill-down** — one command generates the multi-page System Context → Container → Component set with official C4 shapes; parent elements **click through** to their child page
- **Search 10,000+ official shapes** — resolve the exact AWS / Azure / GCP / Cisco / Kubernetes / UML / BPMN icon style instead of guessing (no more blank-box `shape=mxgraph.*` typos)
- **AI / LLM brand logos** — 321 logos (OpenAI, Claude, Gemini, Mistral, Llama, Ollama, LangChain…) that draw.io has none of, plus **18 data-store brands** (Redis, Postgres, Qdrant, Milvus…) for LLM/RAG architecture diagrams
- **Self-check + auto-fix** — reads its own PNG output and auto-fixes overlaps, clipped labels, stacked edges, and more (up to 2 rounds)
- **Iterative feedback loop** — up to 5 rounds of targeted refinement
- **Style presets** — capture your visual style from a `.drawio` file or image, reuse on demand
- **Clean layout** — grid-aligned, spacing scales with diagram size, connectors routed clear of nodes
- **Multi-agent, zero-config** — runs from a single SKILL.md; no MCP server, no background daemon (the optional `npx` installer needs Node, the skill itself does not)

## 🗺️ Feature Map

<div align="center">
  <img src="assets/mindmap.png" width="900" alt="drawio-skill feature map — one mind map covering every capability, itself drawn with the skill">
</div>

A bird's-eye view of everything the skill does — diagram types, import sources, layout engines, styling, export formats, and repurposing — in one map. Fittingly, this map was itself drawn with drawio-skill.

## 🖼️ Examples

> [!TIP]
> **The hero image above was generated from this single prompt:**

```
Create a microservices e-commerce architecture with Mobile/Web/Admin clients,
API Gateway (auth + rate limiting + routing), Auth/User/Order/Product/Payment
services, Kafka message queue, Notification service, and User DB / Order DB /
Product DB / Redis Cache / Stripe API
```

The skill is designed to route edges cleanly across different topologies, avoiding lines that cross through shapes:

<table>
  <tr>
    <td align="center" width="33%">
      <img src="assets/demo-star.png" alt="Star topology" width="100%"><br>
      <b>Star</b> · 7 nodes<br>
      <sub>Central message broker with 6 microservices radiating outward, no edge crossings on this example.</sub>
    </td>
    <td align="center" width="33%">
      <img src="assets/demo-layered.png" alt="Layered flow" width="100%"><br>
      <b>Layered</b> · 10 nodes / 4 tiers<br>
      <sub>E-commerce stack with horizontal and diagonal cross-connections routed via corridors.</sub>
    </td>
    <td align="center" width="33%">
      <img src="assets/demo-ring.png" alt="Ring cycle" width="100%"><br>
      <b>Ring</b> · 8 nodes<br>
      <sub>CI/CD pipeline with a closed loop and 2 spur branches flowing along the perimeter.</sub>
    </td>
  </tr>
</table>

It also speaks **Mermaid** — standard types (flowchart, mindmap, **kanban**, gitGraph, timeline…) convert straight to native, editable `.drawio`. Here's a Kanban board (this project's own roadmap) generated from a few lines of Mermaid:

<div align="center">
  <img src="assets/kanban.png" width="620" alt="Kanban board generated by drawio-skill from Mermaid — this project's roadmap across Backlog / Todo / In Progress / Done">
</div>

**Tube-Map Mode** restyles a pipeline or journey as a London-Underground-style metro map — coloured lines, octilinear (H/V/45°) routing, and white interchange circles. Here's the skill's own flow (this map is `assets/tubemap.json`, ~20 lines):

<div align="center">
  <img src="assets/tubemap.png" width="720" alt="drawio-skill's pipeline drawn as a metro map — Author / Import / Repurpose / Analyze lines meeting at the Auto-layout and .drawio interchange stations">
</div>

Full walkthrough in [docs/USAGE.md](docs/USAGE.md).

## 🚀 Installation

### 1. Install the draw.io desktop CLI

| Platform | Command |
|----------|---------|
| **macOS** | `brew install --cask drawio` |
| **Windows** | [Download installer](https://github.com/jgraph/drawio-desktop/releases) |
| **Linux** | `.deb`/`.rpm` from [releases](https://github.com/jgraph/drawio-desktop/releases); `sudo apt install xvfb` for headless |

Verify with `drawio --version`. **Version ≥ 30 recommended** — it unlocks Mermaid → `.drawio` conversion and the ELK `--layout` pass (both unavailable on ≤ 29). On **WSL2** the CLI is the Windows desktop exe reached via `/mnt/c` — the skill detects this automatically (see [troubleshooting](skills/drawio-skill/references/troubleshooting.md)). Full recipes in [docs/INSTALL_CLI.md](docs/INSTALL_CLI.md).

### 2. Install the skill

```bash
# Any agent (Claude Code, Cursor, Copilot, ...)
npx skills add Agents365-ai/365-skills -g
```

```text
# Claude Code plugin marketplace
> /plugin marketplace add Agents365-ai/365-skills
> /plugin install drawio
```

```bash
# Manual install
git clone https://github.com/Agents365-ai/drawio-skill.git \
  ~/.claude/skills/drawio-skill

# Autohand Code global install
git clone https://github.com/Agents365-ai/drawio-skill.git \
  ~/.autohand/skills/drawio-skill

# Autohand Code project-level install
git clone https://github.com/Agents365-ai/drawio-skill.git \
  .autohand/skills/drawio-skill
```

Autohand Code also supports `autohand --skill-install` for cataloged skills, with `--project` for workspace-level installs. Until this skill is listed there, use the direct clone path above.

Also indexed on [SkillsMP](https://skillsmp.com/skills/agents365-ai-drawio-skill-skills-drawio-skill-skill-md) and [ClawHub](https://clawhub.ai/agents365-ai/drawio-pro-skill).

**Updating:** `/plugin update drawio` (Claude Code), `skills update drawio-skill` (SkillsMP), `clawhub update drawio-pro-skill` (OpenClaw), or `git pull` for manual installs — see [docs/INSTALL_SKILL.md#updates](docs/INSTALL_SKILL.md#updates). Release history in [CHANGELOG.md](CHANGELOG.md).

## ⚡ Quick Start

After installation, just describe what you want. For example, an ML model:

```
Draw a Transformer encoder-decoder for machine translation: 6-layer encoder
with self-attention, 6-layer decoder with cross-attention, input embeddings
(batch × 512 × 768), positional encoding, and a final output projection.
Annotate tensor shapes between layers and color-code by layer type.
```

The skill plans the layout, generates the `.drawio` XML, exports to your chosen format, self-checks the result, and lets you iterate.

## 🗺️ Visualize Code & Infrastructure

Beyond hand-authored diagrams, the skill turns **existing code, infrastructure, and schemas into diagrams** — no manual coordinates. Just ask:

> *"Visualize the module structure of this Python project"* · *"Draw the class hierarchy of `mypackage`"*

<p align="center">
  <img src="assets/code-structure-example.png" width="900" alt="Auto-generated class hierarchy of Python's logging package — modules boxed, inheritance arrows resolved">
</p>

<sub>↑ Python's <code>logging</code> package as a class hierarchy — one command, modules auto-boxed, every inheritance edge resolved.</sub>

Under the hood it runs a bundled extractor → auto-layout → validate pipeline:

```bash
# Import graph — Python / JS-TS / Go / Rust
python3 scripts/pyimports.py   myproject --group -o graph.json
python3 scripts/jsimports.py   ./src     --group -o graph.json
python3 scripts/goimports.py   ./module  --group -o graph.json
python3 scripts/rustimports.py ./crate   --group -o graph.json

# Python class-inheritance hierarchy
python3 scripts/pyclasses.py   mypackage --group -o graph.json

# Infrastructure as Code — official cloud icons resolved automatically
python3 scripts/tfimports.py   ./infra      -o graph.json   # Terraform → AWS/Azure/GCP icons
python3 scripts/k8simports.py  ./manifests  -o graph.json   # K8s YAML/JSON → kind icons
python3 scripts/composeimports.py compose.yml -o graph.json # services + named volumes

# Live infrastructure — draw what's ACTUALLY running / deployed
terraform show -json          | python3 scripts/tfstate.py -      -o graph.json  # deployed cloud
docker inspect $(docker ps -q)| python3 scripts/dockerimports.py -  -o graph.json  # running containers
kubectl get all,ing,cm,secret,pvc -o json | python3 scripts/k8simports.py - -o graph.json  # live cluster

# Data & interactions
python3 scripts/sqlerd.py      schema.sql   -o graph.json   # SQL DDL → ER diagram
python3 scripts/ciimports.py . -o graph.json              # GitHub Actions + GitLab CI -> pipeline DAG
python3 scripts/openapiimports.py openapi.yaml -o graph.json # OpenAPI/Swagger → API diagram (by method)
python3 scripts/seqlayout.py   seq.json  -o sequence.drawio # sequence diagram, direct to .drawio
python3 scripts/c4.py          c4.json   -o c4.drawio       # C4 model, multi-page + drill-down

# Diff two diagrams / snapshots → colour-coded "what changed"
python3 scripts/drawiodiff.py old.drawio new.drawio -o graph.json # +added -removed ~changed

# Architecture time-lapse → self-contained HTML player of how a codebase grew
python3 scripts/timelapse.py src --importer pyimports # → architecture-evolution.html

# Reverse: describe an existing .drawio as structured Markdown (README / PR summary)
python3 scripts/explain.py    architecture.drawio -o architecture.md

# Diagram → PowerPoint deck (one page per slide; C4 model → presentation)
python3 scripts/drawio2pptx.py c4.drawio -o c4.pptx   # needs: pip install python-pptx

# Interactive HTML viewer — pan/zoom/search/tabs + working drill-down links, one file
python3 scripts/drawiohtml.py c4.drawio -o c4.html

# Animated data-flow SVG — edges "flow" (marching ants); renders on GitHub
python3 scripts/svgflow.py    architecture.drawio -o flow.svg

# Reverse: .drawio → Mermaid flowchart (diagrams-as-code GitHub renders)
python3 scripts/drawio2mermaid.py architecture.drawio --fenced -o arch.md

# Language variant: extract labels → translate values → apply (layout untouched)
python3 scripts/relabel.py architecture.drawio --extract -o labels.json
python3 scripts/relabel.py architecture.drawio --map labels.json -o architecture_cn.drawio

# Re-theme an existing .drawio with a style preset (e.g. dark mode)
python3 scripts/restyle.py architecture.drawio --preset dark

# Colour an existing .drawio by data → cost / latency / traffic heat map
python3 scripts/heatmap.py    architecture.drawio -m latency.csv --size -o hot.drawio

# any extractor → auto-layout → editable .drawio
python3 scripts/autolayout.py  graph.json -o diagram.drawio

# Image → editable .drawio — your vision extracts the graph JSON, this rebuilds it
python3 scripts/raster2drawio.py whiteboard-graph.json -o out.drawio

# Watch a diagram build itself, node by node → HTML player (+ optional GIF)
python3 scripts/buildup.py architecture.drawio --gif build.gif  # → buildup.html

# Big diagram → boardroom exec summary (clustered) + click-to-drill-down to full
python3 scripts/compress.py  big.drawio -o exec.drawio

# Decision-tree flowchart → click-through HTML triage runbook (no draw.io CLI needed)
python3 scripts/runbook.py   triage.drawio -o triage.html

# CI: render base/head/diff PNGs + Markdown report for every .drawio a PR changed
python3 scripts/prdiff.py --base origin/main --head HEAD -o drawio-pr/report.md

# Tube-Map Mode — restyle a pipeline / journey as a metro / subway map
python3 scripts/tubemap.py metro.json -o metro.drawio
```

| Piece | What it does |
|---|---|
| **13 extractors** | import graphs for **Python · JS/TS · Go · Rust**, **Python class inheritance**, **Terraform / Kubernetes / docker-compose** resource graphs (official cloud icons), **SQL DDL → ERD**, **OpenAPI / Swagger → API diagram** (operatio

> _README 过长已截断, 完整内容请查看 GitHub 仓库。_
