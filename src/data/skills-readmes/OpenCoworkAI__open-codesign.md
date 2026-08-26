# Open CoDesign

**简体中文**: [README.zh-CN.md](./README.zh-CN.md)

> Your prompts. Your model. Your laptop.
>
> Turn prompts into polished artifacts — locally, openly, and with whichever model you already pay for.

[Website](https://opencoworkai.github.io/open-codesign/) · [Quickstart](#quickstart) · [What's new](https://github.com/OpenCoworkAI/open-codesign/releases) · [Changelog](./CHANGELOG.md) · [Discussions](https://github.com/OpenCoworkAI/open-codesign/discussions) · [Docs](https://opencoworkai.github.io/open-codesign/quickstart) · [Contributing](./CONTRIBUTING.md) · [Security](./SECURITY.md)

**Open-source alternative to:** [Claude Design](https://opencoworkai.github.io/open-codesign/claude-design-alternative) · [v0 by Vercel](https://opencoworkai.github.io/open-codesign/v0-alternative) · [Lovable](https://opencoworkai.github.io/open-codesign/lovable-alternative) · [Bolt.new](https://opencoworkai.github.io/open-codesign/bolt-alternative) · [Figma AI](https://opencoworkai.github.io/open-codesign/figma-ai-alternative)

<p align="center">
  <img src="https://raw.githubusercontent.com/OpenCoworkAI/open-codesign/main/website/public/screenshots/product-hero.png" alt="Open CoDesign — prompt on the left, live artifact on the right" width="1000" />
</p>

<p align="center">
  <a href="https://github.com/OpenCoworkAI/open-codesign/releases"><img alt="GitHub release" src="https://img.shields.io/github/v/release/OpenCoworkAI/open-codesign?label=release&color=c96442" /></a>
  <a href="LICENSE"><img alt="License" src="https://img.shields.io/badge/license-MIT-blue" /></a>
  <a href="https://github.com/OpenCoworkAI/open-codesign/actions"><img alt="CI" src="https://img.shields.io/github/actions/workflow/status/OpenCoworkAI/open-codesign/ci.yml?label=CI" /></a>
  <a href="https://github.com/OpenCoworkAI/open-codesign/stargazers"><img alt="Stars" src="https://img.shields.io/github/stars/OpenCoworkAI/open-codesign?style=social" /></a>
  <a href="#community"><img alt="WeChat Group" src="https://img.shields.io/badge/WeChat-Group-07C160?logo=wechat&logoColor=white" /></a>
</p>

<p align="center">
  <a href="https://github.com/OpenCoworkAI/open-codesign/commits/main"><img alt="Last commit" src="https://img.shields.io/github/last-commit/OpenCoworkAI/open-codesign?label=last%20commit&color=40b4a1" /></a>
  <a href="https://github.com/OpenCoworkAI/open-codesign/pulse"><img alt="Commit activity" src="https://img.shields.io/github/commit-activity/m/OpenCoworkAI/open-codesign?label=commits%2Fmonth" /></a>
  <a href="https://github.com/OpenCoworkAI/open-codesign/graphs/contributors"><img alt="Contributors" src="https://img.shields.io/github/contributors/OpenCoworkAI/open-codesign" /></a>
  <a href="https://github.com/OpenCoworkAI/open-codesign/releases"><img alt="Downloads" src="https://img.shields.io/github/downloads/OpenCoworkAI/open-codesign/total?label=downloads&color=6c5ce7" /></a>
</p>

<p align="center">
  <sub><code>claude-code</code> · <code>claude-design-alternative</code> · <code>v0-alternative</code> · <code>bolt-alternative</code> · <code>lovable-alternative</code> · <code>figma-alternative</code> · <code>ai-design</code> · <code>design-to-code</code> · <code>prompt-to-design</code> · <code>ai-prototyping</code> · <code>desktop-design-tool</code> · <code>byok</code> · <code>local-first</code> · <code>multi-model</code> · <code>electron</code></sub>
</p>

---

## What's new

- **`feat/decompose-to-ui-kit`** *(branch)* — Image -> componentized `ui_kits/<slug>/` bundle for coding-agent handoff · Boolean-per-dimension visual parity judge (12 standard checks) · Verify-and-iterate loop · Per-decompose cost row · See [BENCHMARKS.md](./BENCHMARKS.md). Refs [#225](https://github.com/OpenCoworkAI/open-codesign/issues/225).
- **v0.2.0** *(2026-05-09)* — Agentic Design: workspace-backed sessions · permissioned local tools · Files panel upgrades · provider diagnostics · security hardening · `DESIGN.md` design systems
- **v0.1.4** *(2026-04-23)* — AI image generation · ChatGPT Plus/Codex subscription support · CLIProxyAPI one-click import · API config hardening
- **v0.1.3** *(2026-04-21)* — Gemini `models/` prefix fix · OpenAI-compatible relay "instructions required" fix · third-party relay SSE-truncation hint
- **v0.1.2** *(2026-04-21)* — Release pipeline · Homebrew / winget / Scoop packaging manifests

[Full release history →](https://github.com/OpenCoworkAI/open-codesign/releases) · [Changelog →](./CHANGELOG.md)

---

## What it is

Turn a prompt into a polished prototype, slide deck, or marketing asset, locally, with the model you already use.

**Open CoDesign is the open-source Claude Design alternative** — built for people who want the speed of AI-native design tools without subscription lock-in, cloud-only workflows, or being forced onto a single provider. An MIT-licensed desktop app, local-first from day one, with BYOK for any model (Claude, GPT, Gemini, DeepSeek, Kimi, GLM, Ollama, or any OpenAI-compatible endpoint) plus direct ChatGPT Plus / Pro / Team subscription sign-in for Codex models. One-click import of existing Claude Code or Codex provider configs, or one-click ChatGPT sign-in, gets you running in under 90 seconds.

---

## See it generate

From a blank prompt to a finished artifact, the agent plans, writes, self-checks, and ships something with hover states, tabs, and empty states already wired up:

![Generate a design from scratch](https://raw.githubusercontent.com/OpenCoworkAI/open-codesign/main/website/public/demos/generate-from-scratch.gif)

---

## Why people star it

- **Runs on your laptop** — no mandatory cloud workspace
- **Works with your model** — Claude, GPT, Gemini, Ollama, OpenRouter, and more
- **Exports real files** — HTML, PDF, PPTX, ZIP, Markdown
- **Shows its work** — live agent activity, visible tool calls, interruptible generation

---

## Why Open CoDesign?

Open source, desktop-native, and built for people who do not want their design workflow locked to one model or one cloud.

| | **Open CoDesign** | Claude Design | v0 by Vercel | Lovable |
|---|:---:|:---:|:---:|:---:|
| Open source | ✅ MIT | ❌ Closed | ❌ Closed | ❌ Closed |
| Desktop native | ✅ Electron | ❌ Web only | ❌ Web only | ❌ Web only |
| Bring your own key | ✅ Any provider | ❌ Anthropic only | ❌ Vercel only | ⚠️ Limited |
| Local / offline | ✅ Fully local app | ❌ Cloud | ❌ Cloud | ❌ Cloud |
| Models | ✅ 20+ (Claude, GPT, Gemini, Ollama…) | Claude only | GPT-4o | Multi-LLM |
| Version history | ✅ Local sessions + workspace files | ❌ | ❌ | ❌ |
| Data privacy | ✅ On-device app state | ❌ Cloud-processed | ❌ Cloud | ❌ Cloud |
| Editable export | ✅ HTML, PDF, PPTX, ZIP, Markdown | ⚠️ Limited | ⚠️ Limited | ⚠️ Limited |
| Price | ✅ Free app, provider/subscription cost only | 💳 Subscription | 💳 Subscription | 💳 Subscription |

---

## Highlights

<table>
  <tr>
    <td width="50%">
      <a href="https://raw.githubusercontent.com/OpenCoworkAI/open-codesign/main/website/public/screenshots/comment-mode.png">
        <img src="https://raw.githubusercontent.com/OpenCoworkAI/open-codesign/main/website/public/screenshots/comment-mode.png" alt="Click any element, leave a pin, let the model rewrite that region" />
      </a>
      <p><b>Comment, don’t retype.</b><br/>Click any element, drop a pin, and let the model rewrite only that region.</p>
    </td>
    <td width="50%">
      <a href="https://raw.githubusercontent.com/OpenCoworkAI/open-codesign/main/website/public/screenshots/tweaks-sliders.png">
        <img src="https://raw.githubusercontent.com/OpenCoworkAI/open-codesign/main/website/public/screenshots/tweaks-sliders.png" alt="AI-emitted tweaks panel with color pickers and RGB inputs" />
      </a>
      <p><b>AI-tuned sliders.</b><br/>The model surfaces the parameters worth tweaking, so you can refine color, spacing, and typography without another full prompt.</p>
    </td>
  </tr>
  <tr>
    <td width="50%">
      <a href="https://raw.githubusercontent.com/OpenCoworkAI/open-codesign/main/website/public/screenshots/hub-your-designs.png">
        <img src="https://raw.githubusercontent.com/OpenCoworkAI/open-codesign/main/website/public/screenshots/hub-your-designs.png" alt="Your Designs hub, filled with real generated artifacts" />
      </a>
      <p><b>Every iteration, kept.</b><br/>Designs are saved locally, with instant switching between recent versions.</p>
    </td>
    <td width="50%">
      <a href="https://raw.githubusercontent.com/OpenCoworkAI/open-codesign/main/website/public/screenshots/agent-panel.png">
        <img src="https://raw.githubusercontent.com/OpenCoworkAI/open-codesign/main/website/public/screenshots/agent-panel.png" alt="Live agent panel showing todos and streaming tool calls" />
      </a>
      <p><b>Watch the agent work.</b><br/>Todos, tool calls, and live progress stay visible and interruptible throughout generation.</p>
    </td>
  </tr>
</table>

---

## Quickstart

**Time to first artifact:** about 3 minutes

**Requires:** one API key, ChatGPT subscription sign-in, or local Ollama

**Runs on:** macOS 12+ (Monterey or later), Windows 10+, Linux (glibc ≥ 2.31)

### 1. Install

**Package manager** (recommended):

```bash
# macOS
brew install --cask opencoworkai/tap/open-codesign

# Windows — Scoop
scoop bucket add opencoworkai https://github.com/OpenCoworkAI/scoop-bucket
scoop install opencoworkai/open-codesign
```

**Or direct download** from the [v0.2.0 GitHub Release](https://github.com/OpenCoworkAI/open-codesign/releases/tag/v0.2.0):

| Platform | File |
|---|---|
| macOS (Apple Silicon) | `open-codesign-*-arm64.dmg` |
| macOS (Intel) | `open-codesign-*-x64.dmg` |
| Windows (x64) | `open-codesign-*-x64-setup.exe` |
| Windows (ARM64) | `open-codesign-*-arm64-setup.exe` |
| Linux (x64, AppImage) | `open-codesign-*-x64.AppImage` |
| Linux (x64, Debian/Ubuntu) | `open-codesign-*-x64.deb` |
| Linux (x64, Fedora/RHEL) | `open-codesign-*-x64.rpm` |

Each release ships with `SHA256SUMS.txt` and a CycloneDX SBOM (`*-sbom.cdx.json`) so you can verify what you downloaded.

<details>
<summary><b>More package managers</b></summary>

| Manager | Command | Status |
|---|---|---|
| Homebrew Cask (macOS) | `brew install --cask opencoworkai/tap/open-codesign` | 🟢 Live |
| Scoop (Windows) | `scoop bucket add opencoworkai https://github.com/OpenCoworkAI/scoop-bucket && scoop install opencoworkai/open-codesign` | 🟢 Live |
| winget (Windows) | `winget install OpenCoworkAI.OpenCoDesign` | 🟡 PR submitted; waiting for Microsoft review |
| Flathub (Linux) | `flatpak install flathub ai.opencowork.codesign` | ⏸ Deferred; needs signed build + AppStream metadata |
| Snap (Linux) | `snap install --dangerous open-codesign-*.snap` | 🟡 Attached to releases best-effort; Snap Store publish not yet wired |

After each stable tag push, CI syncs SHAs back into `packaging/` and publishes downstream Homebrew/Scoop updates when the repo secrets are configured. The first winget submission is in review; once Microsoft accepts the package, future winget bumps can be automated from the release workflow. Every `packaging/*/README.md` documents its own channel.
</details>

> **Unsigned installer note:** installers are not notarized or Authenticode-signed yet. On **macOS Sequoia 15+** right-click → Open no longer bypasses Gatekeeper, and "Open Anyway" in System Settings often fails. Reliable one-liner:
>
> ```sh
> xattr -cr "/Applications/Open CoDesign.app"
> ```
>
> Then double-click normally. (Older 0.1.x builds are installed as `/Applications/open-codesign.app`.)
> On **Windows**: SmartScreen → More info → Run anyway.
>
> Want a verified build? Compile from source — see [CONTRIBUTING.md](./CONTRIBUTING.md).

### 2. Add a provider

On first launch, Open CoDesign opens the Settings page. Pick the path that matches how you already use models:

- **ChatGPT subscription** — sign in with ChatGPT to use Codex models without pasting an API key.
- **API key** — paste Anthropic (`sk-ant-...`), OpenAI (`sk-...`), Google Gemini, OpenRouter, SiliconFlow, DeepSeek, or another supported provider key.
- **Local / keyless** — use Ollama or an IP-allowlisted OpenAI-compatible gateway.

Credentials stay in `~/.config/open-codesign/config.toml` and the ChatGPT OAuth token store under the app config directory. Nothing leaves your machine unless your chosen model route requires it.

### 3. Type your first prompt

Pick one of **fifteen built-in demos** — landing page, dashboard, pitch slide, pricing, mobile app, chat UI, event calendar, blog article, receipt/invoice, portfolio, settings panel, and more — or describe your own. A sandboxed prototype appears in seconds.

---

## Bring your stack

Already using Claude Code or Codex? API-key provider configs import in one click, with no copy-paste and no need to re-enter settings. If you use Codex through ChatGPT subscription login, sign in directly from Settings:

![Import from Claude Code or Codex in one click](https://raw.githubusercontent.com/OpenCoworkAI/open-codesign/main/website/public/demos/claude-code-import.gif)

---

## Built-in taste

Generic AI tools tend to produce generic output. Open CoDesign ships with **twelve built-in design skill modules** — slide decks, dashboards, landing pages, SVG charts, glassmorphism, editorial typography, heroes, pricing, footers, chat UIs, data tables, and calendars — plus a built-in taste layer that steers the model toward considered typography, purposeful whitespace, and meaningful color.

Every skill is available in every generation. Before the model writes a line of CSS, it selects the skills that fit the brief and reasons through layout intent, design-system coherence, and contrast, bringing higher-quality design behavior to whichever model you choose.

Add a `SKILL.md` to any project to teach the model your own taste.

---

## What you get

### Models and providers
- **Unified provider model** — Anthropic, OpenAI, Gemini, DeepSeek, OpenRouter, SiliconFlow, local Ollama, or any OpenAI-compatible relay; keyless (IP-allowlisted) proxies supported
- **One-click import and sign-in** — bring Claude Code / Codex API-key provider configs across, or sign in with ChatGPT subscription for Codex models
- **Dynamic model picker** — every provider exposes its real model catalogue, not a hardcoded shortlist

### Generation and editing
- **Prompt → HTML or JSX/React component** prototype, rendered in a sandboxed iframe (vendored React 18 + Babel on-device)
- **Fifteen built-in demos + twelve design skill modules** — ready-to-edit starting points for common design briefs
- **Live agent panel** — watch tool calls stream in real time as the model edits files
- **AI image generation** — opt-in bitmap assets for heroes, product shots, backgrounds, and illustrations via OpenAI, OpenRouter, or signed-in ChatGPT subscription
- **AI-generated sliders** — the model emits the parameters worth tweaking (color, spacing, font)
- **Comment mode** — click any element in the preview to drop a pin, leave a no

> _README 过长已截断, 完整内容请查看 GitHub 仓库。_
