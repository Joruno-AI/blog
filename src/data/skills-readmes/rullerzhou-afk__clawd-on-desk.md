<p align="center">
  <img src="assets/icon.png" width="128" alt="Clawd">
</p>
<h1 align="center">Clawd on Desk</h1>
<p align="center">
  <a href="README.zh-CN.md">中文版</a>
  ·
  <a href="README.zh-TW.md">繁體中文</a>
  ·
  <a href="README.ko-KR.md">한국어</a>
  ·
  <a href="README.ja-JP.md">日本語</a>
  ·
  <a href="README.es.md">Español</a>
</p>
<p align="center">
  <sub>🌏 Don't see your language? <a href="https://github.com/rullerzhou-afk/clawd-on-desk/pulls">Open a PR</a> to add one — Français, Deutsch, etc. all welcome.</sub>
</p>
<p align="center">
  <a href="https://github.com/rullerzhou-afk/clawd-on-desk/releases"><img src="https://img.shields.io/github/v/release/rullerzhou-afk/clawd-on-desk" alt="Version"></a>
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey" alt="Platform">
</p>
<p align="center">
  <a href="https://github.com/rullerzhou-afk/clawd-on-desk/stargazers"><img src="https://img.shields.io/github/stars/rullerzhou-afk/clawd-on-desk?style=flat&logo=github&color=yellow" alt="Stars"></a>
  <a href="https://github.com/hesreallyhim/awesome-claude-code"><img src="https://awesome.re/mentioned-badge-flat.svg" alt="Mentioned in Awesome Claude Code"></a>
</p>

<p align="center">
  <img src="assets/hero.gif" alt="Clawd on Desk — a pixel desktop pet that reacts to your AI coding agent in real time. Animated demo: the crab cycles through sleeping, thinking while the model reads the codebase, typing as edit/bash tools run, grooving for one subagent, juggling when multiple subagents run, raising a permission bubble, and celebrating when 14 files / 312 tests are complete. Works with Claude Code, Codex, Cursor, Copilot, Gemini, Antigravity, Qwen, CodeWhale, Pi, OpenClaw and more.">
</p>

Clawd lives on your desktop and reacts to what your AI coding agent is doing — in real time. Start a long task, walk away, come back when the crab tells you it's done.

Thinking when you prompt, typing when tools run, grooving or juggling for subagents, reviewing permissions, celebrating when tasks complete, sleeping when you step away. Ships with three built-in themes: **Clawd** (pixel crab), **Calico** (三花猫), and **Cloudling** (云宝), with full support for custom themes and imported Codex Pet animation packs.

> Supports Windows 11, macOS, and Ubuntu/Linux. Windows releases provide separate x64 and ARM64 installers. Source builds require Node.js. Works with **Claude Code**, **Codex CLI**, **Copilot CLI**, **Gemini CLI**, **Antigravity CLI (agy)**, **Cursor Agent**, **CodeBuddy**, **WorkBuddy**, **Kiro CLI**, **Kimi Code CLI (Kimi-CLI)**, **Qwen Code**, **ZCode**, **CodeWhale**, **opencode**, **MiMo Code**, **Pi**, **OpenClaw**, **Hermes Agent**, **Qoder**, **QoderWork**, **QwenWork (千问办公)**, **Reasonix CLI**, and **DeepSeek Harness**.

## Features

### Multi-Agent Support
- **Claude Code** — full integration via command hooks + HTTP permission hooks
- **Codex CLI** — official hooks with JSONL fallback (`~/.codex/sessions/`), auto-synced by default with real permission bubbles
- **Copilot CLI** — optional command hooks via `~/.copilot/hooks/hooks.json` (install from Settings → Agents; see the Copilot guide for manual JSON fallback)
- **Gemini CLI** — optional command hooks via `~/.gemini/settings.json` (install from Settings → Agents or run `npm run install:gemini-hooks`)
- **Antigravity CLI (agy)** — optional command hooks via `~/.gemini/config/hooks.json` (install from Settings → Agents or run `npm run install:antigravity-hooks`); **state-only**: Clawd never pops a permission bubble for agy. Every Allow / Deny / Always-allow choice happens in agy's own terminal menu
- **Cursor Agent** — optional [Cursor IDE hooks](https://cursor.com/docs/agent/hooks) in `~/.cursor/hooks.json` (install from Settings → Agents or run `npm run install:cursor-hooks`)
- **CodeBuddy** — optional Claude Code-compatible command hooks + HTTP permission hooks via `~/.codebuddy/settings.json` (install from Settings → Agents or run `node hooks/codebuddy-install.js`)
- **Custom HTTP agents** — register another local executable in Settings and POST lifecycle events to Clawd's dynamic `/state` endpoint. Registration does not install hooks or make an arbitrary application report automatically; v1 is state-only and leaves permission decisions in the application's own UI. See the [custom HTTP agent guide](docs/guides/custom-agent-http.md).
- **WorkBuddy** — optional Claude Code-compatible command hooks via `~/.workbuddy-ai/settings.json` (current) or `~/.workbuddy/settings.json` (legacy; install from Settings → Agents or run `node hooks/workbuddy-install.js`). State + Notification only: the desktop app resolves permissions in its own native sandbox and GUI, so Clawd does not register a permission hook for it.
- **Kiro CLI** — optional command hooks injected into custom agent configs under `~/.kiro/agents/`, plus an auto-created `clawd` agent that is re-synced from Kiro's built-in `kiro_default` after you install the integration, so you can opt into hooks with minimal behavior drift via `kiro-cli --agent clawd` or `/agent swap clawd`. State hooks are verified on macOS and Windows.
- **Kimi Code CLI (Kimi-CLI)** — optional command hooks via `~/.kimi/config.toml` (`[[hooks]]` entries) (install from Settings → Agents or run `npm run install:kimi-hooks`)
- **Qwen Code** — optional command hooks via `~/.qwen/settings.json` (install from Settings → Agents or run `npm run install:qwen-hooks`); state tracking and Qwen `PermissionRequest` desktop approval bubbles are supported
- **ZCode** — optional state + blocking `PermissionRequest` hooks via `~/.zcode/cli/config.json` → `hooks.events.*` (install from Settings → Agents or run `npm run install:zcode-hooks`); Clawd shows manual Allow/Deny bubbles while global and per-session permission automation stays deferred. Clawd preserves explicit global or per-hook `enabled:false` settings and will not register over a foreign `PermissionRequest` hook
- **CodeWhale** — optional state-only lifecycle hooks via `~/.codewhale/config.toml` (`[[hooks.hooks]]` entries) (install from Settings → Agents or run `npm run install:codewhale-hooks`); Phase 1 drives idle, thinking, working, sleeping, error, attention, and sweeping animations only, without permission bubbles or subagent tracking
- **Reasonix CLI** — optional state-only command hooks via `<Reasonix home>/settings.json` (`~/.reasonix/settings.json` on macOS/Linux, `%APPDATA%\reasonix\settings.json` on Windows; install from Settings → Agents or run `npm run install:reasonix-hooks`); Phase 1 drives lifecycle, tool, notification, compaction, and subagent-stop animations while leaving permission decisions in Reasonix's own terminal flow
- **opencode** — optional [plugin integration](https://opencode.ai/docs/plugins) via the effective file under `~/.config/opencode/` (`config.json` → `opencode.json` → `opencode.jsonc`, later wins) (install from Settings → Agents or run `node hooks/opencode-install.js`); zero-latency event streaming and permission bubbles with Allow/Always/Deny. Child sessions spawned by the `task` tool are headless and do not participate in the visible multi-session animation fanout
- **MiMo Code** — optional [plugin integration](https://opencode.ai/docs/plugins) via the effective file under `~/.config/mimocode/` (`config.json` → `mimocode.json` → default `mimocode.jsonc`, later wins; install from Settings → Agents or run `npm run install:mimocode-plugin`); shares the same `@mimo-ai/plugin` SDK and permission behavior as opencode. Its `task` child sessions are likewise headless
- **Pi** — optional global extension via `~/.pi/agent/extensions/clawd-on-desk` (install from Settings → Agents or run `npm run install:pi-extension`); state-only interactive lifecycle and tool activity updates while preserving Pi's default YOLO behavior
- **OpenClaw** — optional state-only plugin integration via `~/.openclaw/openclaw.json` (install from Settings → Agents or run `npm run install:openclaw-plugin`; OpenClaw also needs an initialized config); local `openclaw tui --local` sessions drive Clawd animations, without permission bubbles or terminal focus in Phase 1
- **Hermes Agent** — optional [plugin integration](https://hermes-agent.org/) via Hermes' managed plugin directory (install from Settings → Agents or run `npm run install:hermes-plugin`); state, sessions, SessionEnd, terminal focus, and supported permission bubbles are available
- **Qoder** — optional state-only command hooks via `~/.qoder/settings.json` (install from Settings → Agents or run `npm run install:qoder-hooks`); Phase 1 drives Clawd animations only — Qoder permission prompts are observed as notifications, and every Allow / Deny choice stays in Qoder's own flow
- **QoderWork** — optional state-only command hooks via `~/.qoderwork/settings.json` (install from Settings → Agents or run `npm run install:qoderwork-hooks`); Phase 1 drives Clawd animations and the Session HUD — QoderWork permission events are observed silently as part of the working flow, and every Allow / Deny choice stays in QoderWork's own flow
- **QwenWork (千问办公)** — optional hook-only, state-only command hooks via `~/.QwenWorkCN/settings.json` (install from Settings → Agents or run `npm run install:qwenwork-hooks`, uninstall with `npm run uninstall:qwenwork-hooks`); macOS and Windows desktop only — [qwenwork.cn/download](https://qwenwork.cn/download) has no Linux client, so there is no WSL pairing. Phase 1 drives Clawd animations and the Session HUD; `PermissionRequest` / `PermissionDenied` are observed only and mapped to `working`, the hook's stdout is always `{}`, and Clawd never produces an Allow / Deny — QwenWork's native permission flow stays the only decision maker. No startup recovery: the desktop process is long-lived and does not mean a turn is running
- **DeepSeek Harness** — experimental, web-profile-only integration through a Clawd-managed in-process DSH plugin. Public session events drive Clawd state with per-session ordering, and public blocking `approval/request` calls can show an Allow Once / Deny bubble; no-decision always returns to DSH's native web answerer. `ask_user_question` stays entirely native to DSH, and Clawd never reads DSH projection storage. See the [DeepSeek Harness guide](docs/guides/dsh-setup.md)
- **Multi-agent coexistence** — run all agents simultaneously; Clawd tracks each session independently

### Animations & Interaction
- **Real-time state awareness** — agent hooks and log polling drive Clawd's animations automatically
- **12 animated states** — idle, thinking, typing, building, subagent groove, multi-subagent juggling, error, happy, notification, sweeping, carrying, sleeping
- **Codex Pet imports** — import Codex Pet zip packages from `Settings…` → `Theme`; Clawd adapts their atlas animations into managed themes
- **Eye tracking** — Clawd follows your cursor in idle state, with body lean and shadow stretch
- **Sleep sequence** — yawning, dozing, collapsing, sleeping after 60s idle; mouse movement triggers a startled wake-up animation
- **Click reactions** — double-click for a poke, 4 clicks for a flail
- **Drag from any state** — grab Clawd anytime (Pointer Capture prevents fast-flick drops), release to resume
- **Mini mode** — drag to right edge or right-click "Mini Mode"; Clawd hides at screen edge with peek-on-hover, mini alerts/celebrations, and parabolic jump transitions

### Permission Bubble
- **In-app permission review** — when a permission-capable integration sends a supported request, Clawd can pop a floating bubble card instead of waiting in the terminal; state-only agents keep their native permission flow
- **Allow / deny / agent-native extras** — one-click approve or reject, plus permission rules / `Always` actions when the source agent supports them
- **Permission handling modes** — choose **Ask every time**, confirmation-gated **Question prompts only** (tool-shaped requests from explicitly supported agents), or **Auto-approve**. Auto-approve handles every request the adapter marks automation-eligible—including unrecognized non-empty Claude/Qwen request names—but missing names, unsupported decision shapes, and CodeBuddy questions/plans still defer to the native flow. It downgrades after restart, and each eligible live session can independently choose Ask every time or tools-only. See the [setup guide](docs/guides/setup-guide.md#permission-handling-automation)
- **Optional remote approval** — Telegram and Feishu/Lark can mirror eligible pending requests while the local bubble remains available. A channel failure produces no remote decision and never a denial: the desktop request stays pending, while remote-only requests fall back to the agent only after every available client returns no decision
- **Global hotkeys** — `Ctrl+Shift+Y` to Allow, `Ctrl+Shift+N` to Deny the latest permission bubble (only registered while bubbles are visible)
- **Stacking layout** — multiple permission requests stack upward from the bottom-right corner
- **Auto-dismiss** — if you answer in the terminal first, the bubble disappears automatically
- **Per-agent toggle** — open `Settings…` → `Agents`, pick an agent, and turn off `Show pop-up bubbles` to keep prompts in that agent's own terminal/TUI

### Remote Notifications
- **Telegram / Feishu (Lark)** — interactive remote approval: route permission requests to your phone and Allow/Deny them without touching the desktop
- **Slack** — **notification-only**: task **done**, **errors**, and **permission requests** are pushed via a Slack Incoming Webhook (or an optional `xoxb-` bot token + channel id) as rich Block Kit cards. Slack cannot Allow or Deny in this version — a permission message is an announcement, and you decide in the desktop app. Configure it next to Telegram/Feishu in the remote approval channels; secrets are stored locally in an env file outside prefs (`0600` on macOS/Linux; Windows relies on the AppData ACL), and everything degrades gracefully when unconfigured or offline. Messages can carry the session title, folder, and host name, so a **private channel is recommended** — see [slack-notifications.md](docs/guides/slack-notifications.md)

### Session Intelligence
- **Multi-session tracking** — sessions across all agents resolve to the highest-priority state
- **Subagent awareness** — headphones groove for 1 subagent, three-ball juggling for 2+
- **Sessions dashboard + HUD** — right-click or tray → `Open Dashboard` to inspect live sessions, recent events, aliases, and jump to a terminal; a compact HUD near Clawd keeps current live sessions visible
- **Subscription quota at a glance** — optional Orbit rings beside the pet and detailed Dashboard bars show the quota windows reported by supported agents. Local Claude collection is off by default and uses Claude Code's [official status-line `rate_limits` payload](https://code.claude.com/docs/en/statusline); it does not make an additional request to Anthropic. See the [data-flow and 

> _README 过长已截断, 完整内容请查看 GitHub 仓库。_
