# GBrain

**Search gives you raw pages. GBrain gives you the answer.** It's the brain layer your AI agent has been missing — the only one that does synthesis, graph traversal, and gap analysis in one box. Run a full autonomous agent on top of it, or just wire it into Claude Code or Codex as a supercharged retrieval layer in one command; either way your coding agent stops being amnesiac about everything that isn't code.

I'm Garry Tan, President and CEO of Y Combinator. I built GBrain to run my own AI agents. It's the production brain behind my OpenClaw and Hermes deployments: **155,795 pages, 24,589 people, 5,340 companies**, 66 cron jobs running autonomously. My agent ingests meetings, emails, tweets, voice calls, and original ideas while I sleep. It enriches every person and company it encounters. It fixes its own citations and consolidates memory overnight. I wake up smarter than when I went to bed — and so will you.

**And now it works as a company brain too.** Each person on the team gets their own slice of the brain, scoped by login. When you query, you only see what you're allowed to see — never another person's notes, never another team's data. We fuzz-tested this across every way you can read the brain (search, list, lookup, multi-source reads) and got zero leaks. Drop GBrain in as your team's shared institutional memory — the [company-brain](https://www.ycombinator.com/rfs#company-brain) shape YC just put on its Request for Startups. If you're building in that space, you might as well build on this. **[Tutorial: set up GBrain as your company brain →](docs/tutorials/company-brain.md)**

Lots of personal-knowledge systems give you keyword matching and grep in a box. GBrain does that, and adds two things nobody else ships together:

- **A synthesis layer that gives you the actual answer.** Synthesized, well-cited prose across people, companies, deals, and ideas. Not "here are 10 chunks that mention your query"; an actual answer with citations and an explicit note on what the brain doesn't know yet. The gap analysis is the part that changes how you use the brain.
- **A self-wiring knowledge graph.** Every page write extracts entity refs and creates typed edges (`attended`, `works_at`, `invested_in`, `founded`, `advises`) with zero LLM calls. Ask "who works at Acme AI?" or "what did Bob invest in this quarter?" and get answers vector search alone can't reach. Benchmarked: **P@5 49.1%, R@5 97.9%** on a 240-page Opus-generated rich-prose corpus, **+31.4 points P@5** over its graph-disabled variant and over ripgrep-BM25 + vector-only RAG by a similar margin. Full BrainBench scorecards live in the sibling [gbrain-evals](https://github.com/garrytan/gbrain-evals) repo.

The point of building a 150K-page brain is to use it as a strategic moat. To never lose context. To query what's in your own head without re-reading it. The brain layer is what makes the moat usable. The 24/7 dream cycle is what keeps it sharp. Both run on your hardware, your DB, your keys.

It's easier to ship a daemon that runs 24/7 to ingest, enrich, and consolidate than it is to keep an agent in chat working hard. GBrain is that daemon, generalized. Install in 30 minutes. Your agent does the work. As my personal agent gets smarter, so does yours.

> **~15 minutes to a working personal agent** on the recommended Codex / Claude Code path (mostly a short interview); ~30 minutes for the always-on OpenClaw / Hermes setup. Database ready in 2 seconds either way (PGLite, no server).

> **LLMs:** fetch [`llms.txt`](llms.txt) for the documentation map, or [`llms-full.txt`](llms-full.txt) for the same map with core docs inlined in one fetch. **Agents:** start with [`AGENTS.md`](AGENTS.md) (or [`CLAUDE.md`](CLAUDE.md) if you're Claude Code).

## What this looks like

Say you have a meeting with Alice tomorrow. You want to walk in remembering what she works on, when you last talked, and what's still open between you. Here's what you'd type, and what you'd get back.

**You ask:**

> "What do I need to know before my meeting with Alice tomorrow?"

**Most personal-knowledge tools give you back a list of pages.** Something like:

```
1. people/alice — Alice runs engineering at Acme...
2. meetings/2026-03-15-alice-q1 — Q1 product review with Alice...
3. meetings/2026-01-08-acme-kickoff — Kickoff meeting with Acme team...
4. customers/acme — Acme is a series-B fintech we work with...
5. notes/2026-04-22 — Quick chat with Alice about pricing...
```

Five pages you now have to open and read yourself to actually prepare. The tool found the right material, but it didn't do the work.

**GBrain gives you back the answer, with sources:**

```
Alice runs engineering at Acme (a series-B fintech). You last spoke
on April 22 in a quick pricing chat. Three things are still open
from that conversation:

1. She owes you the security review for the new tier
   (deadline was May 1; no update since).
2. You committed to pricing for a 500-seat tier
   (you sent it April 25; no response yet).
3. She mentioned they're hiring a CISO; you said you'd intro
   someone from your network.

Heads up: nothing's been added to the brain about Alice or Acme
since April 22, six weeks ago. She may have replied through email
or Slack DM, channels the brain doesn't see. Worth asking her to
catch up before assuming any of this is still current.
```

Every claim has a source page behind it. The "heads up" at the end tells you what the brain doesn't know yet, so you can ask Alice about it directly instead of being surprised. The brain just did your meeting prep.

This is the difference between a search engine and a brain. Search finds the pages. The brain reads them for you and writes the answer.

## Install

> [!WARNING]
> **GBrain is NOT distributed on npm.** The npm package named `gbrain` is an unrelated
> package with no connection to this project. Do not run `npm install -g gbrain` or
> `bun add -g gbrain` — you'll get something else, and it can shadow the real binary on
> your PATH. Install and upgrade ONLY via the documented paths below
> (`bun install -g github:garrytan/gbrain`, or `git clone` + `bun install && bun link`).
> If you already ran the npm install by mistake: `npm uninstall -g gbrain` /
> `bun remove -g gbrain`, then reinstall from GitHub. `gbrain doctor` detects a
> shadowing npm install and prints the fix.

GBrain is designed to be installed and operated by an AI agent. **New to GBrain? Start with Codex** — it runs on the ChatGPT subscription you already have, takes ~15 minutes, and deploys nothing. Already living in Claude Code? Its path is identical. Want GBrain running the way it was designed to run — always on, enriching your brain around the clock? That's OpenClaw or Hermes, at real server + API cost. Each path below is complete on its own. (Wiring it up by hand instead? Jump to [CLI standalone](#cli-standalone-no-agent) or the [MCP table](#connect-gbrain-to-your-ai-client-mcp).)

### For Codex — the recommended first step

Turn Codex into your persistent personal agent. (Just want the brain + skills without the full agent? `codex plugin marketplace add garrytan/gbrain@codex-plugin` then `codex plugin add gbrain@gbrain` — see [docs/mcp/CODEX.md](docs/mcp/CODEX.md). The paste block below builds the whole agent.) Works in the **ChatGPT desktop app** (open Codex on a folder) and in the **Codex CLI** (`codex` in a terminal) — same install, same result. Open Codex in a **new, empty folder** (not an existing code project) — that folder becomes your agent's own **private GitHub repo**, which bootstrap creates and privacy-verifies for you. Then paste:

```
Read and follow every step of:
https://raw.githubusercontent.com/garrytan/gbrain/latest-stable/BOOTSTRAP_FOR_AGENTS.md
Goal: set yourself up as my persistent personal agent in this folder, with gbrain
as your memory. Interview me before writing any identity file — never invent
answers. Ask before anything destructive. You are not done until
`gbrain bootstrap verify` exits 0.
```

Codex will ask for command approvals during the install — approving them is the sandbox working as intended. What you get, in about 15 minutes: a short interview (6 required questions) → your agent's identity (SOUL.md, USER.md, MEMORY.md) rendered from your own answers, never invented → a local PGLite brain (2 seconds, no server, no Docker) → MCP wired so every session can search and write memory → a **private** GitHub repo, created and privacy-verified, as your agent's durable body. Works with **zero API keys** — keyword search plus memory your agent writes itself; one optional key upgrades capabilities (OpenAI: semantic search + automatic fact extraction; Voyage: semantic search; Anthropic: fact extraction). Codex reads brain context through its tools each turn (pull-based). The click moment: tell it one small thing to remember, restart Codex, then ask for it back — the answer comes from the brain, not from this chat's context (which the restart cleared). That cross-session round-trip is the whole product; "what's my name / my top jobs?" is answered from your identity files, which is nice but not the same trick.

Two things worth understanding once it's running: **you own the brain** — every memory is a markdown file in that private repo (read it, clone it to a second machine, delete it and the brain is gone) — and **the first skill to run is `cold-start`**: say "fill my brain" and your agent imports your Gmail, calendar, and contacts (via [ClawVisor](https://clawvisor.com), an OAuth vault so the agent never holds raw tokens) or offline archives like Google Takeout, one consented step at a time. An empty brain is a database; a filled one is a memory.

> **Prefer to make the repo yourself?** Create a new **empty** private repo **under your own GitHub account** (no README/.gitignore/license), clone it, open the clone in Codex, and paste the same block — bootstrap detects your empty repo and adopts it instead of creating one. The repo must be empty and personal-account-owned; org-owned repos are refused (create one under your account, or let bootstrap make it).

### For Claude Code — turn it into your persistent personal agent

Works in the **desktop app** and in the **CLI** (`claude` in a terminal) — identical harness, identical result. Open Claude Code in a **new, empty folder** (not an existing code project) — that folder becomes your agent's own **private GitHub repo**, created and privacy-verified for you. Then paste the same block:

```
Read and follow every step of:
https://raw.githubusercontent.com/garrytan/gbrain/latest-stable/BOOTSTRAP_FOR_AGENTS.md
Goal: set yourself up as my persistent personal agent in this folder, with gbrain
as your memory. Interview me before writing any identity file — never invent
answers. Ask before anything destructive. You are not done until
`gbrain bootstrap verify` exits 0.
```

Everything from the Codex path applies — interview, identity from your own answers, local brain, private repo, keyless mode — plus Claude Code gets **per-turn context hooks** (on by default, with an opt-out): your brain loads automatically into every prompt, and your work persists to your private repo on a per-turn cadence (debounced ~5 min locally, every turn in a cloud sandbox — this covers the `/exit` case the harness never fires a session-end hook on), with a notice on your next turn if a push ever fails. This works in a **Claude Code cloud session** too, not just on your laptop: verification falls back to pure git protocol when the sandbox blocks the GitHub API, and `gbrain bootstrap cloud-setup-script` prints the environment setup recipe. The click moment: tell it one small thing to remember, restart the session, then ask for it back — a fresh session has no chat context, so the answer can only come from the brain. That cross-session round-trip is the whole product ("what's my name?" is answered from your identity files — nice, but not the same trick). Same two follow-ups as the Codex path: you own the brain (markdown in your private repo), and `cold-start` is the first skill to run — "fill my brain" imports your email, calendar, and contacts (ClawVisor) or offline archives, one consented step at a time. Full contract, security posture, cloud sandboxes, and uninstall: [docs/guides/bootstrap.md](docs/guides/bootstrap.md).

> **Prefer to make the repo yourself?** Create a new **empty** private repo **under your own GitHub account** (no README/.gitignore/license), clone it, open the clone in Claude Code (CLI or the desktop app's open-a-repo flow), and paste the same block — bootstrap adopts your empty repo instead of creating one. The repo must be empty and personal-account-owned; org-owned repos are refused.

### For OpenClaw or Hermes — GBrain as intended, always on

This is GBrain used the way it was designed to be used: a server-hosted agent with 24/7 crons, continuous ingestion, and the overnight dream cycle that enriches your brain while you sleep — your agent works whether your laptop is open or not. It's also the highest-cost path: a deployed server (8GB+ RAM) plus raw API token usage that scales with how hard your agent runs, well beyond a chat subscription. Start here if you want the full experience from day one; start with Codex above if you want to feel it first. If you don't have a platform running yet, both deploy in one click:

- **[OpenClaw](https://github.com/openclaw/openclaw)** — deploy [AlphaClaw on Render](https://render.com/deploy?repo=https://github.com/chrysb/alphaclaw) (one click, 8GB+ RAM)
- **[Hermes](https://github.com/NousResearch/hermes-agent)** — deploy on [Railway](https://github.com/praveen-ks-2001/hermes-agent-template) (one click)

Then paste this into your agent:

```
Retrieve and follow the instructions at:
https://raw.githubusercontent.com/garrytan/gbrain/master/INSTALL_FOR_AGENTS.md
```

The agent installs GBrain, creates the brain, asks for your API keys, loads the 50+ bundled skills, configures the dream cycle, and verifies the install end-to-end. ~30 minutes. You answer questions, it does the work.

> **Never set up an AI agent platform before?** The [personal-brain tutorial](docs/tutorials/personal-brain.md) walks the whole path end-to-end — picking OpenClaw vs Hermes, deploying it, pointing it at INSTALL_FOR_AGENTS.md, getting the API keys, and verifying the first query. Start there if any of the above is new.

### Lighter ways in

**Just want a memory for your coding agent — no identity, no repo.** Spin up a local brain and connect it in two commands — zero server, zero token, zero tunnel. `--surface verbs` gives your agent the seven-verb memory protocol (`recall`, `remember`, `entity`, `synthesize`, `forget`, plus `context_pack` + `delta` since v0.45.7 — [MEMORY_VERBS v1](docs/protocol/MEMORY_VERBS_v1.md), frozen + additive-forever) instead of the full tool wall; drop the flag for every operation:

```bash
gbrain init --pglite                                    # 2-second local brain (no Do

> _README 过长已截断, 完整内容请查看 GitHub 仓库。_
