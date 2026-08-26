# Ralph for Claude Code

[![CI](https://github.com/frankbria/ralph-claude-code/actions/workflows/test.yml/badge.svg)](https://github.com/frankbria/ralph-claude-code/actions/workflows/test.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
![Version](https://img.shields.io/badge/version-0.11.5-blue)
![Tests](https://img.shields.io/badge/tests-784%20passing-green)
[![GitHub Issues](https://img.shields.io/github/issues/frankbria/ralph-claude-code)](https://github.com/frankbria/ralph-claude-code/issues)
[![Mentioned in Awesome Claude Code](https://awesome.re/mentioned-badge.svg)](https://github.com/hesreallyhim/awesome-claude-code)
[![Follow on X](https://img.shields.io/twitter/follow/FrankBria18044?style=social)](https://x.com/FrankBria18044)

> **Autonomous AI development loop with intelligent exit detection and rate limiting**

Ralph is an implementation of the Geoffrey Huntley's technique for Claude Code that enables continuous autonomous development cycles he named after [Ralph Wiggum](https://ghuntley.com/ralph/). It enables continuous autonomous development cycles where Claude Code iteratively improves your project until completion, with built-in safeguards to prevent infinite loops and API overuse.

**Install once, use everywhere** - Ralph becomes a global command available in any directory.

## Project Status

**Version**: v0.11.5 - Active Development
**Core Features**: Working and tested
**Test Coverage**: 784 tests, 100% pass rate

### What's Working Now
- Autonomous development loops with intelligent exit detection
- **Dual-condition exit gate**: Requires BOTH completion indicators AND explicit EXIT_SIGNAL
- Rate limiting with hourly reset (100 calls/hour, configurable)
- Circuit breaker with advanced error detection (prevents runaway loops)
- Response analyzer with semantic understanding and two-stage error filtering
- **JSON output format support with automatic fallback to text parsing**
- **Session continuity with `--resume` flag for context preservation (no session hijacking)**
- **Session expiration with configurable timeout (default: 24 hours)**
- **Modern CLI flags: `--output-format`, `--allowed-tools`, `--no-continue`**
- **Interactive project enablement with `ralph-enable` wizard**
- **`.ralphrc` configuration file for project settings**
- **Live streaming output with `--live` flag for real-time Claude Code visibility**
- **Log rotation: `ralph.log` rotates at 10MB, keeping 4 archived files**
- **Dry-run mode (`--dry-run`) to simulate loops without API calls**
- **Metrics tracking with `ralph-stats` analytics command (JSON Lines per-loop metrics)**
- **Desktop notifications (`--notify`) for key loop events (macOS/Linux/terminal-bell)**
- **Automatic git backup branches (`--backup`) with `--rollback` restore**
- Multi-line error matching for accurate stuck loop detection
- 5-hour API limit handling with user prompts
- tmux integration for live monitoring
- PRD import functionality
- **GitHub issue import: `ralph-import --github-issue` plus metadata filters (labels, title, assignee, milestone, state) with first/interactive/priority selection and `--dry-run` preview**
- **CI/CD pipeline with GitHub Actions**
- **Dedicated uninstall script for clean removal**

### Recent Improvements

**v0.11.5 - Community Bug Fixes** (latest)
- Fixed API limit false positive: Timeout (exit code 124) no longer misidentified as API 5-hour limit (#183)
- Three-layer API limit detection: timeout guard → structural JSON (`rate_limit_event`) → filtered text fallback
- Unattended mode: API limit prompt now auto-waits on timeout instead of exiting
- Fixed bash 3.x compatibility: `${,,}` lowercase substitution replaced with POSIX `tr` (#187)
- Added 8 new tests for API limit detection (548 → 566 tests)

**v0.11.4 - Bug Fixes & Compatibility**
- Fixed progress detection: Git commits within a loop now count as progress (#141)
- Fixed checkbox regex: Date entries `[2026-01-29]` no longer counted as checkboxes (#144)
- Fixed session hijacking: Use `--resume <session_id>` instead of `--continue` (#151)
- Fixed EXIT_SIGNAL override: `STATUS: COMPLETE` with `EXIT_SIGNAL: false` now continues working (#146)
- Fixed ralph-import hanging indefinitely (added `--print` flag for non-interactive mode)
- Fixed ralph-import absolute path handling
- Fixed cross-platform date commands for macOS with Homebrew coreutils
- Added configurable circuit breaker thresholds via environment variables (#99)
- Added tmux support for non-zero `base-index` configurations
- Added 13 new regression tests for progress detection and checkbox regex

**v0.11.3 - Live Streaming & Beads Fix**
- Added live streaming output mode with `--live` flag for real-time Claude Code visibility (#125)
- Fixed beads task import using correct `bd list` arguments (#150)
- Applied CodeRabbit review fixes: camelCase variables, status-respecting fallback, jq guards
- Added 12 new tests for live streaming and beads import improvements

**v0.11.2 - Setup Permissions Fix**
- Fixed issue #136: `ralph-setup` now creates `.ralphrc` with consistent tool permissions
- Updated default `ALLOWED_TOOLS` to include `Edit`, `Bash(npm *)`, and `Bash(pytest)`
- Both `ralph-setup` and `ralph-enable` now create identical `.ralphrc` configurations
- Monitor now forwards all CLI parameters to inner ralph loop (#126)
- Added 16 new tests for permissions and parameter forwarding

**v0.11.1 - Completion Indicators Fix**
- Fixed premature exit after exactly 5 loops in JSON output mode
- `completion_indicators` now only accumulates when `EXIT_SIGNAL: true`
- Aligns with documented dual-condition exit gate behavior

**v0.11.0 - Ralph Enable Wizard**
- Added `ralph-enable` interactive wizard for enabling Ralph in existing projects
- 5-phase wizard: Environment Detection → Task Source Selection → Configuration → File Generation → Verification
- Auto-detects project type (TypeScript, Python, Rust, Go) and framework (Next.js, FastAPI, Django)
- Imports tasks from beads, GitHub Issues, or PRD documents
- Added `ralph-enable-ci` non-interactive version for CI/automation
- New library components: `enable_core.sh`, `wizard_utils.sh`, `task_sources.sh`

**v0.10.1 - Bug Fixes & Monitor Path Corrections**
- Fixed `ralph_monitor.sh` hardcoded paths for v0.10.0 compatibility
- Fixed EXIT_SIGNAL parsing in JSON format
- Added safety circuit breaker (force exit after 5 consecutive completion indicators)
- Fixed checkbox parsing for indented markdown

**v0.10.0 - .ralph/ Subfolder Structure (BREAKING CHANGE)**
- **Breaking**: Moved all Ralph-specific files to `.ralph/` subfolder
- Project root stays clean: only `src/`, `README.md`, and user files remain
- Added `ralph-migrate` command for upgrading existing projects

<details>
<summary>Earlier versions (v0.9.x)</summary>

**v0.9.9 - EXIT_SIGNAL Gate & Uninstall Script**
- Fixed premature exit bug: completion indicators now require Claude's explicit `EXIT_SIGNAL: true`
- Added dedicated `uninstall.sh` script for clean Ralph removal

**v0.9.8 - Modern CLI for PRD Import**
- Modernized `ralph_import.sh` to use Claude Code CLI JSON output format
- Enhanced error handling with structured JSON error messages

**v0.9.7 - Session Lifecycle Management**
- Complete session lifecycle management with automatic reset triggers
- Added `--reset-session` CLI flag for manual session reset

**v0.9.6 - JSON Output & Session Management**
- Extended `parse_json_response()` to support Claude Code CLI JSON format
- Added session management functions

**v0.9.5 - v0.9.0** - PRD import tests, project setup tests, installation tests, prompt file fix, modern CLI commands, circuit breaker enhancements

</details>

### In Progress
- Expanding test coverage
- [Automated badge updates](#138)
- [Multi-provider agent abstraction](docs/adr/0001-multi-provider-agent-abstraction.md) — decoupling Ralph from `claude` so any headless coding CLI (Codex, Gemini, OpenCode, Droid, Kilocode, Copilot) can drive the loop ([`multi-provider`](https://github.com/frankbria/ralph-claude-code/labels/multi-provider) epic; see also the [agent adapter contract](docs/adr/0002-agent-adapter-contract.md))

**Timeline to v1.0**: final polish underway | [Full roadmap](IMPLEMENTATION_PLAN.md) | **Contributions welcome!**

## Features

- **Autonomous Development Loop** - Continuously executes Claude Code with your project requirements
- **Intelligent Exit Detection** - Dual-condition check requiring BOTH completion indicators AND explicit EXIT_SIGNAL
- **Session Continuity** - Preserves context across loop iterations with automatic session management
- **Session Expiration** - Configurable timeout (default: 24 hours) with automatic session reset
- **Rate Limiting** - Built-in API call management with hourly limits and countdown timers
- **5-Hour API Limit Handling** - Three-layer detection (timeout guard, JSON parsing, filtered text) with auto-wait for unattended mode
- **Live Monitoring** - Real-time dashboard showing loop status, progress, and logs
- **Task Management** - Structured approach with prioritized task lists and progress tracking
- **Project Templates** - Quick setup for new projects with best-practice structure
- **Interactive Project Setup** - `ralph-enable` wizard for existing projects with task import
- **Configuration Files** - `.ralphrc` for project-specific settings and tool permissions
- **Comprehensive Logging** - Detailed execution logs with timestamps and status tracking
- **Configurable Timeouts** - Set execution timeout for Claude Code operations (1-120 minutes)
- **Verbose Progress Mode** - Optional detailed progress updates during execution
- **Response Analyzer** - AI-powered analysis of Claude Code responses with semantic understanding
- **Circuit Breaker** - Advanced error detection with two-stage filtering, multi-line error matching, and automatic recovery
- **CI/CD Integration** - GitHub Actions workflow with automated testing
- **Clean Uninstall** - Dedicated uninstall script for complete removal
- **Live Streaming Output** - Real-time visibility into Claude Code execution with `--live` flag
- **Docker Sandbox Execution** - Run Claude Code in an isolated container with `--sandbox docker` (resource limits, network policy, secure credential handoff)
- **E2B Cloud Sandbox Execution** - Run Claude Code in an E2B cloud sandbox with `--sandbox e2b` (file sync, session recovery, cost tracking with `--sandbox-max-cost`)

## Quick Start

Ralph has two phases: **one-time installation** and **per-project setup**.

```
INSTALL ONCE              USE MANY TIMES
+-----------------+          +----------------------+
| ./install.sh    |    ->    | ralph-setup project1 |
|                 |          | ralph-enable         |
| Adds global     |          | ralph-import prd.md  |
| commands        |          | ...                  |
+-----------------+          +----------------------+
```

### Phase 1: Install Ralph (One Time Only)

Install Ralph globally on your system:

```bash
git clone https://github.com/frankbria/ralph-claude-code.git
cd ralph-claude-code
./install.sh
```

This adds `ralph`, `ralph-monitor`, `ralph-setup`, `ralph-import`, `ralph-queue`, `ralph-migrate`, `ralph-enable`, and `ralph-enable-ci` commands to your PATH.

> **Note**: You only need to do this once per system. After installation, you can delete the cloned repository if desired.

### Phase 2: Initialize Projects (Per Project)

#### Option A: Enable Ralph in Existing Project (Recommended)
```bash
cd my-existing-project

# Interactive wizard - auto-detects project type and imports tasks
ralph-enable

# Or with specific task source
ralph-enable --from beads
ralph-enable --from github --label "sprint-1"
ralph-enable --from prd ./docs/requirements.md

# Start autonomous development
ralph --monitor
```

#### Option B: Import Existing PRD/Specifications
```bash
# Convert existing PRD/specs to Ralph format
ralph-import my-requirements.md my-project
cd my-project

# Review and adjust the generated files:
# - .ralph/PROMPT.md (Ralph instructions)
# - .ralph/fix_plan.md (task priorities)
# - .ralph/specs/requirements.md (technical specs)

# Start autonomous development
ralph --monitor
```

#### Option C: Create New Project from Scratch
```bash
# Create blank Ralph project
ralph-setup my-awesome-project
cd my-awesome-project

# Configure your project requirements manually
# Edit .ralph/PROMPT.md with your project goals
# Edit .ralph/specs/ with detailed specifications
# Edit .ralph/fix_plan.md with initial priorities

# Start autonomous development
ralph --monitor
```

### Ongoing Usage (After Setup)

Once Ralph is installed and your project is initialized:

```bash
# Navigate to any Ralph project and run:
ralph --monitor              # Integrated tmux monitoring (recommended)

# Or use separate terminals:
ralph                        # Terminal 1: Ralph loop
ralph-monitor               # Terminal 2: Live monitor dashboard
```

### Uninstalling Ralph

To completely remove Ralph from your system:

```bash
# Run the uninstall script
./uninstall.sh

# Or if you deleted the repo, download and run:
curl -sL https://raw.githubusercontent.com/frankbria/ralph-claude-code/main/uninstall.sh | bash
```

## Understanding Ralph Files

After running `ralph-enable` or `ralph-import`, you'll have a `.ralph/` directory with several files. Here's what each file does and whether you need to edit it:

| File | Auto-Generated? | You Should... |
|------|-----------------|---------------|
| `.ralph/PROMPT.md` | Yes (smart defaults) | **Review & customize** project goals and principles |
| `.ralph/fix_plan.md` | Yes (can import tasks) | **Add/modify** specific implementation tasks |
| `.ralph/AGENT.md` | Yes (detects build commands) | Rarely edit (auto-maintained by Ralph) |
| `.ralph/specs/` | Empty directory | Add files when PROMPT.md isn't detailed enough |
| `.ralph/specs/stdlib/` | Empty directory | Add reusable patterns and conventions |
| `.ralphrc` | Yes (project-aware) | Rarely edit (sensible defaults) |

### Key File Relationships

```
PROMPT.md (high-level goals)
    ↓
specs/ (detailed requirements when needed)
    ↓
fix_plan.md (specific tasks Ralph executes)
    ↓
AGENT.md (build/test commands - auto-maintained)
```

### When to Use specs/

- **Simple projects**: PROMPT.md + fix_plan.md is usually enough
- **Complex features**: Add specs/feature-name.md for detailed requirements
- **Team conventions**: Add specs/stdlib/convention-name.md for reusable patterns

See the [User Guide](docs/user-guide/) for detailed explanations and the [examples/](examples/) directory for realistic project configurations.

## How It Works

Ralph operates on a simple but powerful cycle:

1. **Read Instructions** - Loads `PROMPT.md` with your project requirements
2. **Execute Claude Code** - Runs Claude Code with current context and priorities
3. **Track Progress** - Updates task lists and logs execution results
4. **Evaluate Completion** - Checks for exit

> _README 过长已截断, 完整内容请查看 GitHub 仓库。_
