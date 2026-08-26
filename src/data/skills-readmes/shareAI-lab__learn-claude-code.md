[English](./README.md) | [中文](./README-zh.md) | [日本語](./README-ja.md)

<a href="https://trendshift.io/repositories/19746" target="_blank"><img src="https://trendshift.io/api/badge/repositories/19746" alt="shareAI-lab%2Flearn-claude-code | Trendshift" style="width: 250px; height: 55px;" width="250" height="55"/></a>

# Learn Claude Code -- Harness Engineering for Real Agents

## Agency Comes from the Model. An Agent Product = Model + Harness.

Before we write any code, one thing needs to be clear.

**Agency -- the capacity to perceive, reason, and act -- comes from model training, not from external code orchestration.** But a working agent product needs both the model and the harness. The model is the driver. The harness is the vehicle. This repository teaches you how to build the vehicle.

### Where Agency Comes From

At the core of every agent is a neural network -- a Transformer, an RNN, a trained function -- shaped by billions of gradient updates on sequences of perception, reasoning, and action. Agency was never bestowed by the surrounding code. It was learned during training.

Humans are the original proof. A biological neural network, refined by millions of years of evolutionary pressure, perceives the world through senses, reasons through a brain, and acts through a body. When DeepMind, OpenAI, or Anthropic say "agent," they all mean the same core thing: **a model that learned to act through training, plus the infrastructure that lets it operate in a specific environment.**

The historical record is unambiguous:

- **2013 -- DeepMind DQN plays Atari.** A single neural network, receiving only raw pixels and game scores, learned 7 Atari 2600 games -- surpassing prior algorithms and beating human experts in 3 of them. By 2015, scaled to [49 games at professional tester level](https://www.nature.com/articles/nature14236), published in *Nature*. No game-specific rules. One model, learning from experience.

- **2019 -- OpenAI Five conquers Dota 2.** Five neural networks played [45,000 years of Dota 2 against themselves](https://openai.com/index/openai-five-defeats-dota-2-world-champions/) over 10 months, then defeated **OG** -- the TI8 world champions -- 2-0 in a live match. In the public arena, the AI won 99.4% of 42,729 games. No scripted strategies. Models learned teamwork through self-play.

- **2019 -- DeepMind AlphaStar masters StarCraft II.** AlphaStar [beat a professional player 10-1](https://deepmind.google/blog/alphastar-mastering-the-real-time-strategy-game-starcraft-ii/) in closed matches, then reached [Grandmaster rank](https://www.nature.com/articles/d41586-019-03298-6) on the European server -- top 0.15% of 90,000 players. An incomplete-information, real-time game with a combinatorial action space far exceeding chess or Go.

- **2019 -- Tencent Jueyu dominates Honor of Kings.** Tencent AI Lab's "Jueyu" system [defeated KPL professional players in full 5v5](https://www.jiemian.com/article/3371171.html) at the World Champion Cup semifinal. In 1v1 mode, pros [won just 1 out of 15 matches, lasting under 8 minutes at best](https://developer.aliyun.com/article/851058). Training intensity: one day equaled 440 human years. A model that learned the entire game from scratch through self-play.

- **2024-2025 -- LLM agents reshape software engineering.** Claude, GPT, Gemini -- large language models trained on the full breadth of human code and reasoning -- are deployed as coding agents. They read codebases, write implementations, debug failures, and coordinate as teams. The architecture is identical to every previous agent: a trained model, placed in an environment, given tools for perception and action.

Every milestone points to the same fact: **Agency -- the ability to perceive, reason, and act -- is trained, not coded.** But every agent also needs an environment to operate in: an Atari emulator, the Dota 2 client, the StarCraft II engine, an IDE and a terminal. The model supplies the intelligence. The environment supplies the action space. Together they form a complete agent.

### What an Agent Is NOT

The word "agent" has been hijacked by an entire prompt-plumbing industry.

Drag-and-drop workflow builders. No-code "AI Agent" platforms. Prompt-chain orchestration libraries. They share a single delusion: that stringing LLM API calls together with if-else branches, node graphs, and hardcoded routing logic constitutes "building an agent."

It does not. What they produce are Rube Goldberg machines -- over-engineered, brittle, procedural rule pipelines with an LLM wedged in as a glorified text-completion node. That is not an agent. That is a shell script with grandiose pretensions.

You cannot brute-force intelligence by stacking procedural logic -- sprawling rule trees, node graphs, chained prompt waterfalls -- and praying that enough glue code will spontaneously produce autonomous behavior. It will not. You cannot engineer agency into existence. Agency is learned, not coded.

### The Mindshift: From "Building Agents" to Building Harnesses

When someone says "I am building an agent," they can only mean one of two things:

**1. Training a model.** Adjusting weights through reinforcement learning, fine-tuning, RLHF, or another gradient-based method. Collecting trajectory data -- real-world sequences of perception, reasoning, and action in a target domain -- and using it to shape the model's behavior. This is what DeepMind, OpenAI, Tencent AI Lab, and Anthropic do.

**2. Building a harness.** Writing the code that gives a model an operational environment. This is what most of us do, and it is the core of this repository.

A harness is everything an agent needs to work in a specific domain:

```
Harness = Tools + Knowledge + Observation + Action Interfaces + Permissions

    Tools:          file I/O, shell, network, database, browser
    Knowledge:      product docs, domain references, API specs, style guides
    Observation:    git diff, error logs, browser state, sensor data
    Action:         CLI commands, API calls, UI interactions
    Permissions:    sandbox isolation, approval workflows, trust boundaries
```

The model decides. The harness executes. The model reasons. The harness provides context. The model is the driver. The harness is the vehicle.

This repository teaches you to build the vehicle. A vehicle for coding. But the design patterns generalize to any domain.

### What Harness Engineers Actually Do

If you are reading this repository, you are most likely a harness engineer. Here is what the job actually entails:

- **Implement tools.** Give the agent hands. File read/write, shell execution, API calls, browser control, database queries. Each tool is one action the agent can take in its environment. Design them atomic, composable, and clearly described.

- **Curate knowledge.** Give the agent domain expertise. Product documentation, architecture decision records, style guides, compliance requirements. Load on demand, not upfront.

- **Manage context.** Subagents keep focused work in a separate message list. Context compaction shortens older history. Task systems let goals persist beyond a single conversation.

- **Control permissions.** Give the agent boundaries. Sandbox file access. Require approval for destructive operations. Enforce trust boundaries between the agent and external systems.

- **Collect trajectory data.** Every action sequence the agent executes in your harness is training signal. Real deployment trajectories are the raw material for fine-tuning the next generation of agent models.

You are not writing intelligence. You are building the world that intelligence inhabits. The quality of that world directly determines how effectively the intelligence can express itself.

**Build the harness well. The model will do the rest.**

### Why Claude Code

Because Claude Code is the most elegant, most complete agent harness implementation we have seen. Not because of any clever trick, but because of what it *does not* do: it does not try to be the agent. It does not impose rigid workflows. It does not substitute hand-crafted decision trees for the model's own judgment. It gives the model tools, knowledge, context management, and permission boundaries -- then gets out of the way.

Strip Claude Code down to its essence:

```
Claude Code = one agent loop
            + tools (bash, read, write, edit, glob, grep, browser...)
            + on-demand skill loading
            + context compaction
            + subagent spawning
            + task system with dependency graphs
            + async mailbox team coordination
            + task-bound worktrees for parallel edits
            + permission governance
            + hooks extension system
            + memory persistence
            + MCP external capability routing
```

That is it. The agent itself? Claude. A model. Trained by Anthropic on the full breadth of human reasoning and code. The harness did not make Claude smart. Claude was already smart. The harness gave Claude hands, eyes, and a workspace.

The takeaway is not "copy Claude Code." The takeaway is: **the best agent products come from engineers who understand that their job is the harness, not the intelligence.**

---

```
                    THE AGENT PATTERN
                    =================

    User --> messages[] --> LLM --> response
                                      |
                              contains tool_use block?
                           /                          \
                         yes                           no
                          |                             |
                    execute tools                    return text
                    append results
                    loop back -----------------> messages[]


    The model decides when to call tools and when to stop.
    The code just executes what the model asks for.
    This repo teaches you to build everything around this loop --
    the harness that makes the agent effective in a specific domain.
```

## Core Pattern

```python
def agent_loop(messages):
    while True:
        response = client.messages.create(
            model=MODEL, system=SYSTEM,
            messages=messages, tools=TOOLS,
        )
        messages.append({"role": "assistant",
                         "content": response.content})

        tool_calls = [
            block for block in response.content if block.type == "tool_use"
        ]
        if not tool_calls:
            return

        results = []
        for block in tool_calls:
            output = TOOL_HANDLERS[block.name](**block.input)
            results.append({
                "type": "tool_result",
                "tool_use_id": block.id,
                "content": output,
            })
        messages.append({"role": "user", "content": results})
```

Each lesson isolates one harness mechanism around this loop. s15 reconnects the cumulative runtime; s16 and s17 then study workflow orchestration and goal closure as focused examples. The loop belongs to the agent. The mechanisms belong to the harness.

The loop is constant. Tools, knowledge, and permissions change. Agent = Model (LLM) + a generalized operational environment (Harness).

---

## Version Status

This repository currently contains two tutorial tracks:

- **Current track: root-level `s01-s17`**
  The root-level `s01_*` ... `s17_*` folders are the canonical version. Each chapter contains an English default README, Chinese/Japanese translations, runnable `code.py`, and diagrams where needed.
- **Legacy transition track: `docs/` and `agents/`**
  These preserve the older 12-lesson version for existing readers and old links during migration.

If you are starting now, read the root-level `s01_agent_loop/` through `s17_goal_loop/` chapters. The legacy and current chapter numbers do not always match, so avoid mixing chapter numbers across tracks.

### Legacy-to-Current Mapping

| Legacy 12-lesson track | Current 17-lesson track | Topic |
|---|---|---|
| old s01 | new s01 | Agent Loop |
| old s02 | new s02 | Tool Use |
| old s03 | new s05 | TodoWrite |
| old s04 | new s06 | Subagent |
| old s05 | new s07 | Skill Loading |
| old s06 | new s08 | Context Compact |
| old s07 | new s10 | Task System |
| old s08 | new s11 | Background Tasks |
| old s09 | new s13 | Agent Teams |
| old s10 | new s13 | Team Protocols |
| old s11 | new s13 | Autonomous task claiming |
| old s12 | new s13 | Task-bound worktrees |
| new only | s03, s04, s09, s12, s14, s15, s16, s17 | Permission, Hooks, Memory, Cron, MCP, Integrated Harness, Workflow Runtime, Goal Loop |

---

## Course Boundary

This is a 0-to-1 harness engineering course. Each chapter isolates one mechanism, then s15 reconnects the cumulative runtime in a complete agent loop. s16 extends that loop with workflow orchestration. s17 uses a smaller tool pool to focus on goal-controlled continuation; it is a mechanism example, not another cumulative runtime.

---

## 17 Progressive Lessons

**Each lesson adds one harness mechanism. Each mechanism has a motto.**

> **s01** &nbsp; *"One loop & Bash is all you need"* &mdash; one tool + one loop = one agent
>
> **s02** &nbsp; *"Adding a tool means adding one handler"* &mdash; the loop stays untouched; new tools register into the dispatch map
>
> **s03** &nbsp; *"Set boundaries first, then grant freedom"* &mdash; check what can run, what must stop, and what needs approval
>
> **s04** &nbsp; *"Hook around the loop, never rewrite the loop"* &mdash; add extension points without changing the main loop
>
> **s05** &nbsp; *"An agent without a plan drifts"* &mdash; list the steps before starting; completion rate doubles
>
> **s06** &nbsp; Give a subtask fresh `messages[]`; its final text returns as one tool result
>
> **s07** &nbsp; *"Load knowledge on demand, not upfront"* &mdash; list skills first, expand them only when needed
>
> **s08** &nbsp; *"Context always fills up -- have a way to make room"* &mdash; four compaction steps reduce tool results first, then summarize history when it remains over the limit
>
> **s09** &nbsp; *"Remember what matters, forget what doesn't"* &mdash; three subsystems: selection, extraction, consolidation
>
> **s10** &nbsp; *"Big goals break into small tasks, ordered, persisted to disk"* &mdash; a file-backed task graph that lays the groundwork for multi-agent coordination
>
> **s11** &nbsp; *"Slow ops go background, agent keeps thinking"* &mdash; background threads run commands; notifications inject on completion
>
> **s12** &nbsp; *"Fire on schedule, no human kick needed"* &mdash; trigger tasks automatically by time
>
> **s13** &nbsp; *"Too big for one agent -- let teammates divide the work"* &mdash; persistent teammates coordinate, claim ready tasks, and use task-bound working directories
>
> **s14** &nbsp; *"Not enough capability? Plug in more via MCP"* &mdash; connect external tools into the same tool pool
>
> **s15** &nbsp; *"Many mechanisms, one loop"* &mdash; the mec

> _README 过长已截断, 完整内容请查看 GitHub 仓库。_
