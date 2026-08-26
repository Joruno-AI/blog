<div>
<div align="right">
<a href="https://piebald.ai"><img width="200" top="20" align="right" src="https://github.com/Piebald-AI/.github/raw/main/Wordmark.svg"></a>
</div>

<div align="left">

### Check out Piebald
We've released **Piebald**, the ultimate agentic AI developer experience. \
Download it and try it out for free!  **https://piebald.ai/**

<a href="https://piebald.ai/discord"><img src="https://img.shields.io/badge/Join%20our%20Discord-5865F2?style=flat&logo=discord&logoColor=white" alt="Join our Discord"></a>
<a href="https://x.com/PiebaldAI"><img src="https://img.shields.io/badge/Follow%20%40PiebaldAI-000000?style=flat&logo=x&logoColor=white" alt="X"></a>

<sub>[**Scroll down for Claude Code's system prompts.**](#claude-code-system-prompts) :point_down:</sub>

</div>
</div>

<div align="left">
<a href="https://piebald.ai">
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://piebald.ai/screenshot-dark.png">
  <source media="(prefers-color-scheme: light)" srcset="https://piebald.ai/screenshot-light.png">
  <img alt="hero" width="800" src="https://piebald.ai/screenshot-light.png">
</picture>
</a>
</div>

# Claude Code System Prompts

[![Mentioned in Awesome Claude Code](https://awesome.re/mentioned-badge.svg)](https://github.com/hesreallyhim/awesome-claude-code)

> [!tip]
> **NEW (June 12, 2026):** We've greatly expanded this list with many more of Claude Code's prompts&mdash;**from 350 to 515 (+165)**&mdash;our most complete coverage yet.

This repository contains an up-to-date list of all Claude Code's various system prompts and their associated token counts as of **[Claude Code v2.1.246](https://www.npmjs.com/package/@anthropic-ai/claude-code/v/2.1.246) (August 25th, 2026).**  It also contains a [**CHANGELOG.md**](./CHANGELOG.md) for the system prompts across 270 versions since v2.0.14.  From the team behind [<img src="https://github.com/Piebald-AI/piebald/raw/main/assets/logo.svg" width="15"> **Piebald.**](https://piebald.ai/)

**This repository is updated within minutes of each Claude Code release.  See the [changelog](./CHANGELOG.md), and follow [@PiebaldAI](https://x.com/PiebaldAI) on X for a summary of the system prompt changes in each release.**

> [!note]
> ⭐ **Star** this repository to get notified about new Claude Code versions.  For each new Claude Code version, we create a release on GitHub, which will notify all users who've starred the repository.

---

Why multiple "system prompts?"

**Claude Code doesn't just have one single string for its system prompt.**

Instead, there are:
- Large portions conditionally added depending on the environment and various configs.
- Descriptions for builtin tools like `Write`, `Bash`, and `TodoWrite`, and some are fairly large.
- Separate system prompts for builtin agents like Explore and Plan.
- Numerous AI-powered utility functions, such as conversation compaction, `CLAUDE.md` generation, session title generation, etc. featuring their own systems prompts.

The result&mdash;500+ strings that are constantly changing and moving within a very large minified JS file.

> [!important]
> Want to **modify a particular piece of the system prompt** in your own Claude Code installation?  **Use [tweakcc](https://github.com/Piebald-AI/tweakcc).**  It&mdash;
> - lets you customize the individual pieces of the system prompt as markdown files, and then
> - patches your npm-based or native (binary) Claude Code installation with them, and also
> - provides diffing and conflict management for when both you and Anthropic have conflicting modifications to the same prompt file.

## Extraction

This repository contains the system prompts extracted using a script from the latest npm version of Claude Code.  As they're extracted directly from Claude Code's compiled source code, they're guaranteed to be exactly what Claude Code uses.  If you use [tweakcc](https://github.com/Piebald-AI/tweakcc) to customize the system prompts, it works in a similar way&mdash;it patches the exact same strings in your local installation as are extracted into this repository.

## Prompts

Note that some prompts contain interpolated bits such as builtin tool name references, lists of available sub agents, and various other context-specific variables, so the actual counts in a particular Claude Code session will differ slightly&mdash;likely not beyond ±20 tokens, however.

### Agent Prompts

Sub-agents and utilities.

#### Sub-agents

- [Agent Prompt: Explore](./system-prompts/agent-prompt-explore.md) (**862** tks) - System prompt for the Explore subagent.
- [Agent Prompt: Plan mode (enhanced)](./system-prompts/agent-prompt-plan-mode-enhanced.md) (**1066** tks) - Enhanced prompt for the Plan subagent.

#### Creation Assistants

- [Agent Prompt: CLAUDE.md creation](./system-prompts/agent-prompt-claude-md-creation.md) (**631** tks) - Instructs the /init command to analyze a codebase and create or improve a CLAUDE.md file.
- [Agent Prompt: Status line setup](./system-prompts/agent-prompt-status-line-setup.md) (**3394** tks) - System prompt for the statusline-setup agent that configures status line display.

#### Slash Commands

- [Agent Prompt: /batch slash command](./system-prompts/agent-prompt-batch-slash-command.md) (**1106** tks) - Instructions for orchestrating a large, parallelizable change across a codebase.
- [Agent Prompt: /code-review inline gap sweep phase](./system-prompts/agent-prompt-code-review-inline-gap-sweep-phase.md) (**105** tks) - Adds a final same-context sweep for defects missed by an inline code review when subagents are unavailable.
- [Agent Prompt: /code-review minimal mode](./system-prompts/agent-prompt-code-review-minimal-mode.md) (**536** tks) - Minimal /code-review prompt that performs one careful diff pass and reports up to fifteen concrete correctness findings.
- [Agent Prompt: /code-review part 1 base finder angles](./system-prompts/agent-prompt-code-review-part-1-base-finder-angles.md) (**145** tks) - Line-by-line diff scan instructions for the /code-review slash command's finder-angle phase.
- [Agent Prompt: /code-review part 10 ReportFindings output format](./system-prompts/agent-prompt-code-review-part-10-reportfindings-output-format.md) (**345** tks) - Output-format instructions for /code-review runs that report verified findings once through the ReportFindings tool with capped, severity-ranked findings.
- [Agent Prompt: /code-review part 2 low effort minimum findings mode](./system-prompts/agent-prompt-code-review-part-2-low-effort-minimum-findings-mode.md) (**740** tks) - Low-effort /code-review prompt that reads the diff once, targets at least min(files_changed, 4) hunk-visible runtime correctness findings, and performs one extra pass when short.
- [Agent Prompt: /code-review part 2 low effort mode](./system-prompts/agent-prompt-code-review-part-2-low-effort-mode.md) (**676** tks) - Low-effort /code-review prompt that reads the diff once and returns up to four hunk-visible runtime correctness findings.
- [Agent Prompt: /code-review part 3 extra-high and maximum effort modes](./system-prompts/agent-prompt-code-review-part-3-extra-high-and-maximum-effort-modes.md) (**510** tks) - Extra-high and maximum-effort /code-review prompt that runs five finder angles, one-vote verification, a gap sweep, and capped JSON findings.
- [Agent Prompt: /code-review part 4 three-state verification phase](./system-prompts/agent-prompt-code-review-part-4-three-state-verification-phase.md) (**98** tks) - Verification phase for /code-review that asks one agent verifier to classify each candidate as confirmed, plausible, or refuted.
- [Agent Prompt: /code-review part 5 recall-biased verification phase](./system-prompts/agent-prompt-code-review-part-5-recall-biased-verification-phase.md) (**175** tks) - Recall-biased /code-review verification phase that treats realistic uncertain findings as plausible unless code refutes them.
- [Agent Prompt: /code-review part 6 medium effort mode](./system-prompts/agent-prompt-code-review-part-6-medium-effort-mode.md) (**423** tks) - Medium-effort /code-review prompt that favors precision with three finder angles, one-vote verification, and up to eight JSON findings.
- [Agent Prompt: /code-review part 7 high effort mode](./system-prompts/agent-prompt-code-review-part-7-high-effort-mode.md) (**468** tks) - High-effort /code-review prompt that favors recall with three finder angles, recall-biased verification, and up to ten JSON findings.
- [Agent Prompt: /code-review part 8 GitHub comment posting](./system-prompts/agent-prompt-code-review-part-8-github-comment-posting.md) (**152** tks) - Optional /code-review instructions for posting findings as GitHub inline PR comments when --comment is passed.
- [Agent Prompt: /code-review part 9 fix application](./system-prompts/agent-prompt-code-review-part-9-fix-application.md) (**250** tks) - Optional /code-review instructions for applying findings to the working tree when --fix is passed.
- [Agent Prompt: /code-review unavailable-agent inline mode](./system-prompts/agent-prompt-code-review-unavailable-agent-inline-mode.md) (**403** tks) - Builds a single-pass inline code-review prompt that gathers a diff, evaluates configured angles, deduplicates findings, optionally sweeps gaps, and reports capped results when the Agent tool is unavailable.
- [Agent Prompt: /rename auto-generate session name](./system-prompts/agent-prompt-rename-auto-generate-session-name.md) (**80** tks) - Prompt used by /rename (no args) to auto-generate a kebab-case session name from conversation context.
- [Agent Prompt: /schedule slash command](./system-prompts/agent-prompt-schedule-slash-command.md) (**4491** tks) - Guides the user through scheduling, updating, listing, or running remote Claude Code agents on cron triggers via the Anthropic cloud API.
- [Agent Prompt: /security-review slash command](./system-prompts/agent-prompt-security-review-slash-command.md) (**2521** tks) - Comprehensive security review prompt for analyzing code changes with focus on exploitable vulnerabilities.
- [Agent Prompt: /simplify slash command](./system-prompts/agent-prompt-simplify-slash-command.md) (**362** tks) - Instructions for the /simplify slash command that reviews changed code for reuse, simplification, efficiency, and altitude cleanups, then applies the fixes.
- [Agent Prompt: /simplify unavailable-agent inline mode](./system-prompts/agent-prompt-simplify-unavailable-agent-inline-mode.md) (**621** tks) - Runs the /simplify cleanup workflow inline across reuse, simplification, efficiency, and altitude angles when the Agent tool is unavailable.
- [Agent Prompt: /ultrareview GitHub comment poster](./system-prompts/agent-prompt-ultrareview-github-comment-poster.md) (**894** tks) - Instructs the /ultrareview posting step to publish exactly one plain GitHub pull request comment from a routine payload, with a run deduplication marker and no other writes.

#### Utilities

- [Agent Prompt: Agent Hook](./system-prompts/agent-prompt-agent-hook.md) (**234** tks) - Evaluates agent hook conditions against the codebase and, when available, the conversation transcript, then returns a structured pass/fail result.
- [Agent Prompt: Artifact comment thread analyst](./system-prompts/agent-prompt-artifact-comment-thread-analyst.md) (**606** tks) - Instructs a read-only agent to analyze one Artifact comment thread and return a constrained analysis brief for a separate composer.
- [Agent Prompt: Auto mode rule reviewer](./system-prompts/agent-prompt-auto-mode-rule-reviewer.md) (**292** tks) - Reviews and critiques user-defined auto mode classifier rules for clarity, completeness, conflicts, and actionability.
- [Agent Prompt: Away summary generation](./system-prompts/agent-prompt-away-summary-generation.md) (**73** tks) - Prompts a no-tools away-summary generation run to recap the goal, current task, and next action when the user returns.
- [Agent Prompt: Background agent state classifier](./system-prompts/agent-prompt-background-agent-state-classifier.md) (**6237** tks) - Classifies the tail of a background agent transcript as working, blocked, done, or failed and returns concise state JSON.
- [Agent Prompt: Background job agent instructions](./system-prompts/agent-prompt-background-job-agent-instructions.md) (**559** tks) - Instructs the built-in background job agent to narrate progress, restate tool results, and emit explicit result, needs input, or failed status signals.
- [Agent Prompt: Claude Code guide](./system-prompts/agent-prompt-claude-code-guide.md) (**415** tks) - Describes when to use the Claude Code guide agent for Claude Code, Agent SDK, Claude API, and Claude Tag questions.
- [Agent Prompt: Claude guide agent](./system-prompts/agent-prompt-claude-guide-agent.md) (**3003** tks) - Instructs the Claude guide agent to answer documentation-based questions about Claude Code, the Claude Agent SDK, the Claude API, Claude Tag, plugin evaluation, and skill diagnostics.
- [Agent Prompt: Coding session title generator](./system-prompts/agent-prompt-coding-session-title-generator.md) (**898** tks) - Generates a short noun-phrase title for a coding session from untrusted session content.
- [Agent Prompt: Conversation summarization](./system-prompts/agent-prompt-conversation-summarization.md) (**1795** tks) - System prompt for creating detailed conversation summaries.
- [Agent Prompt: Coordinator worker instructions](./system-prompts/agent-prompt-coordinator-worker-instructions.md) (**830** tks) - Instructions for worker agents executing coordinator-assigned tasks, covering scope control, concurrent branch changes, resumption, failure handling, and coordinator-facing output.
- [Agent Prompt: Determine which memory files to attach](./system-prompts/agent-prompt-determine-which-memory-files-to-attach.md) (**354** tks) - Agent for determining which memory files to attach for the main agent.
- [Agent Prompt: Dream memory consolidation](./system-prompts/agent-prompt-dream-memory-consolidation.md) (**1573** tks) - Instructs an agent to perform a multi-phase memory consolidation pass — orienting on existing memories, gathering recent signal from logs and transcripts, merging updates into topic files, and pruning the index.
- [Agent Prompt: General purpose agent](./system-prompts/agent-prompt-general-purpose-agent.md) (**63** tks) - Defines a general-purpose agent for researching complex questions, searching code, and executing multi-step tasks.
- [Agent Prompt: General purpose](./system-prompts/agent-prompt-general-purpose.md) (**446** tks) - System prompt for the general-purpose subagent that searches, analyzes, and edits code across a codebase while reporting findings concisely to the caller.
- [Agent Prompt: General task agent](./system-prompts/agent-prompt-general-task-agent.md) (**99** tks) - Instructs a Claude Code task agent to complete the user's request fully and report the essential outcome.
- [Agent Prompt: Hook condition evaluator (stop)](./sy

> _README 过长已截断, 完整内容请查看 GitHub 仓库。_
