# 🎯 Claude Code Usage Monitor
[![PyPI Version](https://img.shields.io/pypi/v/claude-monitor.svg)](https://pypi.org/project/claude-monitor/)
[![Python Version](https://img.shields.io/badge/python-3.9+-blue.svg)](https://python.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)
[![codecov](https://codecov.io/gh/Maciek-roboblog/Claude-Code-Usage-Monitor/branch/main/graph/badge.svg)](https://codecov.io/gh/Maciek-roboblog/Claude-Code-Usage-Monitor)
[![Mentioned in Awesome Claude Code](https://awesome.re/mentioned-badge.svg)](https://github.com/hesreallyhim/awesome-claude-code)

A privacy-first Claude Usage-Ops companion for Claude Code. It combines a Rich live terminal monitor with official statusline `rate_limits`, machine-readable state/export output, provenance labels, forecasting, and an opt-in local usage warehouse.

![Claude Token Monitor Screenshot](https://raw.githubusercontent.com/Maciek-roboblog/Claude-Code-Usage-Monitor/main/doc/scnew.png)

---

## 📑 Table of Contents

- [✨ Key Features](#-key-features)
- [🚀 Installation](#-installation)
  - [⚡ Modern Installation with uv (Recommended)](#-modern-installation-with-uv-recommended)
  - [📦 Installation with pip](#-installation-with-pip)
  - [🛠️ Other Package Managers](#️-other-package-managers)
- [📖 Usage](#-usage)
  - [Get Help](#get-help)
  - [Basic Usage](#basic-usage)
  - [Configuration Options](#configuration-options)
  - [Available Plans](#available-plans)
- [🙏 Please Help Test This Release!](#-please-help-test-this-release)
- [✨ Features & How It Works](#-features--how-it-works)
  - [Current Features](#current-features)
  - [Understanding Claude Sessions](#understanding-claude-sessions)
  - [Token Limits by Plan](#token-limits-by-plan)
  - [Smart Detection Features](#smart-detection-features)
- [🚀 Usage Examples](#-usage-examples)
  - [Common Scenarios](#common-scenarios)
  - [Best Practices](#best-practices)
- [🔧 Development Installation](#-development-installation)
- [Troubleshooting](#troubleshooting)
  - [Installation Issues](#installation-issues)
  - [Runtime Issues](#runtime-issues)
- [📞 Contact](#-contact)
- [Related Tools](#related-tools)
- [📚 Additional Documentation](#-additional-documentation)
- [📝 License](#-license)
- [🤝 Contributors](#-contributors)
- [🙏 Acknowledgments](#-acknowledgments)



## ✨ Key Features

### 🚀 **v4.0.0 Major Update - Usage Ops Companion**

- **🔎 Official-limit trust layer** - `--statusline` captures Claude Code's official `rate_limits`; stale or expired captures fall back to labeled local estimates.
- **📦 Machine-readable protocol** - `--once`, `--compact`, and `--write-state` all use one versioned snapshot builder with automation exit codes.
- **🏷️ Provenance labels** - exported and displayed numbers distinguish `official`, `local_estimate`, `experimental`, and `unknown` confidence.
- **📈 Persistent usage warehouse** - opt-in local history survives Claude's 30-day cleanup with project/model/day dimensions and CSV/JSON reports.
- **🧭 Forecasting and pace** - reset-aware pace, date-context forecasts, official-only weekly percentages, and limit-hit freeze behavior.
- **🧩 Multi-source input** - `--data-paths`, `CLAUDE_CONFIG_DIR`, and WSL discovery can scan multiple directories without merging unrelated accounts into one 5-hour window.
- **🖥️ Rich UI parity** - live Rich output, rich one-shot output, compact output, state files, and exports use the same snapshot contract.
- **🧰 External companion boundary** - GUIs, trays, provider adapters, and status bars should consume `--write-state` or `--once --output json`.
- **🧪 Regression coverage** - the non-integration suite now covers the trust layer, state protocol, warehouse, reports, title updates, multi-source paths, and timezone edge cases.

### 📋 Default Custom Plan

The **Custom plan** is now the default option, specifically designed for 5-hour Claude Code sessions. It monitors three critical metrics:
- **Token usage** - Tracks your token consumption
- **Messages usage** - Monitors message count
- **Cost usage** - The most important metric for long sessions

The Custom plan automatically adapts to your usage patterns by analyzing all your sessions from the last 192 hours (8 days) and calculating personalized limits based on your actual usage. This ensures accurate predictions and warnings tailored to your specific workflow.


## 🚀 Installation
### ⚡ Modern Installation with uv (Recommended)

**Why uv is the best choice:**
- ✅ Creates isolated environments automatically (no system conflicts)
- ✅ No Python version issues
- ✅ No "externally-managed-environment" errors
- ✅ Easy updates and uninstallation
- ✅ Works on all platforms

The fastest and easiest way to install and use the monitor:

[![PyPI](https://img.shields.io/pypi/v/claude-monitor.svg)](https://pypi.org/project/claude-monitor/)

#### Install from PyPI

```bash
# Install directly from PyPI with uv (easiest)
uv tool install claude-monitor

# Run from anywhere
claude-monitor  # or cmonitor, ccmonitor for short
```


#### Install from Source

```bash
# Clone and install from source
git clone https://github.com/Maciek-roboblog/Claude-Code-Usage-Monitor.git
cd Claude-Code-Usage-Monitor
uv tool install .

# Run from anywhere
claude-monitor
```


#### First-time uv users
If you don't have uv installed yet, get it with one command:

```bash
# On Linux/macOS:
curl -LsSf https://astral.sh/uv/install.sh | sh

# On Windows:
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"

# After installation, restart your terminal
```


### 📦 Installation with pip

```bash
# Install from PyPI
pip install claude-monitor

# If claude-monitor command is not found, add ~/.local/bin to PATH:
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc  # or restart your terminal

# Run from anywhere
claude-monitor  # or cmonitor, ccmonitor for short
```


>
> **⚠️ PATH Setup**: If you see WARNING: The script claude-monitor is installed in '/home/username/.local/bin' which is not on PATH, follow the export PATH command above.
>
> **⚠️ Important**: On modern Linux distributions (Ubuntu 23.04+, Debian 12+, Fedora 38+), you may encounter an "externally-managed-environment" error. Instead of using --break-system-packages, we strongly recommend:
> 1. **Use uv instead** (see above) - it's safer and easier
> 2. **Use a virtual environment** - python3 -m venv myenv && source myenv/bin/activate
> 3. **Use pipx** - pipx install claude-monitor
>
> See the Troubleshooting section for detailed solutions.

### 🛠️ Other Package Managers

#### pipx (Isolated Environments)
```bash
# Install with pipx
pipx install claude-monitor

# Run from anywhere
claude-monitor  # or claude-code-monitor, cmonitor, ccmonitor, ccm for short
```


#### conda/mamba
```bash
# Install with pip in conda environment
pip install claude-monitor

# Run from anywhere
claude-monitor  # or cmonitor, ccmonitor for short
```


## 📖 Usage

### Get Help

```bash
# Show help information
claude-monitor --help
```

#### Available Command-Line Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| --plan | string | custom | Plan type: pro, max5, max20, team, or custom |
| --custom-limit-tokens | int | None | Token limit for custom plan (must be > 0) |
| --view | string | realtime | View type: realtime, daily, monthly, session, entries, sessions, or burn-rate |
| --output | string | rich | Output format: rich, json, text, or csv |
| --once | flag | False | Measure once, print a snapshot, and exit |
| --compact | flag | False | Single-line compact output for status bars |
| --write-state | flag | False | Write the snapshot to a state file for external tools |
| --state-file | path | None | State file path for --write-state |
| --statusline | flag | False | Run as a Claude Code statusline hook and capture official rate_limits |
| --api | flag | False | Enable the opt-in experimental Anthropic OAuth usage API |
| --data-paths | list | [] | Claude data directories to scan; repeat or comma-separate values |
| --warehouse | flag | False | Persist usage entries to the opt-in local warehouse |
| --warehouse-file | path | None | Usage warehouse file path |
| --warehouse-retention-days | int | 365 | Days of warehouse records to retain |
| --timezone | string | auto | Timezone (auto-detected). Examples: UTC, America/New_York, Europe/London |
| --time-format | string | auto | Time format: 12h, 24h, or auto |
| --theme | string | auto | Display theme: light, dark, classic, or auto |
| --refresh-rate | int | 10 | Data refresh rate in seconds (1-60) |
| --refresh-per-second | float | 0.75 | Display refresh rate in Hz (0.1-20.0) |
| --reset-hour | int | None | Daily reset hour (0-23) |
| --date-format | string | None | Date format for daily/monthly table periods |
| --abbreviate-tokens | flag | False | Abbreviate token counts in table views |
| --sparklines | flag | False | Show opt-in sparklines in table views |
| --filter-models | string | all | Use all models, or anthropic to exclude routed non-Claude models |
| --set-terminal-title | flag | False | Set the terminal title from the usage snapshot |
| --title-format | string | "{pct}% {plan}" | Terminal title template using pct, plan, used, limit, cost, reset |
| --hide-model-distribution | flag | False | Hide the model distribution bar |
| --no-header | flag | False | Hide the header banner |
| --no-emoji | flag | False | Render plain output without emoji |
| --log-level | string | INFO | Logging level: DEBUG, INFO, WARNING, ERROR, CRITICAL |
| --log-file | path | None | Log file path |
| --debug | flag | False | Enable debug logging |
| --version, -v | flag | False | Show version information |
| --clear | flag | False | Clear saved configuration |

#### Plan Options

| Plan | Token Limit | Cost Limit       | Description |
|------|-------------|------------------|-------------|
| pro | 19,000 | $18.00           | Claude Pro subscription |
| max5 | 88,000 | $35.00           | Claude Max5 subscription |
| max20 | 220,000 | $140.00          | Claude Max20 subscription |
| team | estimate | unverified       | Team label; prefer official statusline or --plan custom |
| custom | P90-based | (default) $50.00 | Auto-detection with ML analysis |

#### Command Aliases

The tool can be invoked using any of these commands:
- claude-monitor (primary)
- claude-code-monitor (full name)
- cmonitor (short)
- ccmonitor (short alternative)
- ccm (shortest)

#### Save Flags Feature

The monitor automatically saves your preferences to avoid re-specifying them on each run:

**What Gets Saved:**
- View type (--view)
- Plan (--plan)
- Theme preferences (--theme)
- Timezone settings (--timezone)
- Time format (--time-format)
- Refresh rates (--refresh-rate, --refresh-per-second)
- Reset hour (--reset-hour)
- Custom token limits (--custom-limit-tokens)

**Configuration Location:** ~/.claude-monitor/last_used.json

**Usage Examples:**
```bash
# First run - specify preferences
claude-monitor --plan pro --theme dark --timezone "America/New_York"

# Subsequent runs - preferences automatically restored
claude-monitor --plan pro

# Override saved settings for this session
claude-monitor --plan pro --theme light

# Clear all saved preferences
claude-monitor --clear
```

**Key Features:**
- ✅ Automatic parameter persistence between sessions
- ✅ CLI arguments always override saved settings
- ✅ Atomic file operations prevent corruption
- ✅ Graceful fallback if config files are damaged
- ✅ Plan is saved and restored between sessions (override any time with `--plan`)
- ✅ An explicitly chosen theme is kept and not overwritten by auto-detection

### Basic Usage

#### With uv tool installation (Recommended)
```bash
# Default (Custom plan with auto-detection)
claude-monitor

# Alternative commands
claude-code-monitor  # Full descriptive name
cmonitor             # Short alias
ccmonitor            # Short alternative
ccm                  # Shortest alias

# Exit the monitor
# Press Ctrl+C to gracefully exit
```

#### Development mode
If running from source, use python -m claude_monitor from the src/ directory.

### Machine-readable Usage Protocol

Use these surfaces when another tool needs current usage without scraping the Rich TUI:

```bash
# One-shot JSON snapshot with source/confidence/provenance fields
claude-monitor --once --output json

# Compact one-line status output
claude-monitor --once --compact

# Keep an atomically-written state file up to date for status bars and dashboards
claude-monitor --write-state --state-file ~/.claude-monitor/state/latest.json

# Install as a Claude Code statusline hook to capture official rate_limits
claude-monitor --statusline
```

`--once` exits with automation-friendly codes: `0` ok, `10` near limit, `11` limit hit, `20` indeterminate/no active session, and `30` no data or config error. When official statusline data is fresh it wins; otherwise the snapshot falls back to a labeled local estimate.

### Persistent Usage Warehouse

The warehouse is opt-in and local-only. It stores versioned records by source, account, project, model, and day so history can outlive Claude's 30-day cleanup.

```bash
# Start persisting usage locally
claude-monitor --warehouse

# Export warehouse-backed entries as JSON
claude-monitor --warehouse --view entries --output json

# Export session percentiles and burn-rate reports as CSV
claude-monitor --warehouse --view sessions --output csv
claude-monitor --warehouse --view burn-rate --output csv
```

### Configuration Options

#### Specify Your Plan

```bash
# Custom plan with P90 auto-detection (Default)
claude-monitor --plan custom

# Pro plan (~44,000 tokens)
claude-monitor --plan pro

# Max5 plan (~88,000 tokens)
claude-monitor --plan max5

# Max20 plan (~220,000 tokens)
claude-monitor --plan max20

# Custom plan with explicit token limit
claude-monitor --plan custom --custom-limit-tokens 100000
```

#### Custom Reset Times

```bash
# Reset at 3 AM
claude-monitor --reset-hour 3

# Reset at 10 PM
claude-monitor --reset-hour 22
```

#### Usage View Configuration

```bash
# Real-time monitoring with live updates (Default)
claude-monitor --view realtime

# Daily token usage aggregated in table format
claude-monitor --view daily

# Monthly token usage aggregated in table format
claude-monitor --view monthly

```

#### Performance and Display Configuration

```bash
# Adjust refresh rate (1-60 seconds, default: 10)
claude-monitor --refresh-rate 5

# Adjust display refresh rate (0.1-20 Hz, default: 0.75)
claude-monitor --refresh-per-second 1.0

# Set time format (auto-detected by default)
claude-monitor --time-format 24h  # or 12h

# Force specific theme
claude-monitor --theme dark  # light, dark, classic, auto

# Clear saved configuration
claude-monitor

> _README 过长已截断, 完整内容请查看 GitHub 仓库。_
