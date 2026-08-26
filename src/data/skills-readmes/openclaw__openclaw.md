# OpenClaw 🦞 — Your assistant, on your devices, in your chats

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/openclaw/openclaw/main/docs/assets/openclaw-banner-light.png">
    <img src="https://raw.githubusercontent.com/openclaw/openclaw/main/docs/assets/openclaw-banner-dark.png" alt="OpenClaw — EXFOLIATE! EXFOLIATE! Your personal AI assistant, running on your own devices.">
  </picture>
</p>

<p align="center">
  <a href="https://github.com/openclaw/openclaw/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/openclaw/openclaw/ci.yml?branch=main&style=flat-square&label=ci" alt="CI status"></a>
  <a href="https://www.npmjs.com/package/openclaw"><img src="https://img.shields.io/npm/v/openclaw?style=flat-square&label=npm" alt="npm version"></a>
  <a href="https://nodejs.org"><img src="https://img.shields.io/node/v/openclaw?style=flat-square" alt="Node.js version"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" alt="License: MIT"></a>
  <a href="https://discord.gg/clawd"><img src="https://img.shields.io/discord/1456350064065904867?label=discord&logo=discord&logoColor=white&color=5865F2&style=flat-square" alt="Discord"></a>
</p>

OpenClaw is a personal AI assistant that runs on your devices and meets you in the channels you already use. It is designed for a single operator and connects models, tools, messaging channels, and optional companion apps through one Gateway.

[Website](https://openclaw.ai) · [Docs](https://docs.openclaw.ai) · [Getting started](https://docs.openclaw.ai/start/getting-started) · [Showcase](https://docs.openclaw.ai/start/showcase) · [FAQ](https://docs.openclaw.ai/help/faq) · [Vision](VISION.md) · [DeepWiki](https://deepwiki.com/openclaw/openclaw)

## Install

The installer supports macOS, Linux, and Windows. It provisions a supported Node.js runtime when needed.

```bash
# macOS / Linux / WSL2
curl -fsSL https://openclaw.ai/install.sh | bash
```

```powershell
# Windows PowerShell
iwr -useb https://openclaw.ai/install.ps1 | iex
```

Already manage Node.js? Install the published package instead (Node 22.22.3+, 24.15+, or 25.9+):

```bash
npm install -g openclaw@latest --allow-scripts=openclaw
```

That command is for npm 12 or npm 11.16+. On npm 11.15 and earlier, omit
`--allow-scripts=openclaw`. See the
[installation guide](https://docs.openclaw.ai/install) for the lifecycle script
contract, Docker, Nix, and other deployment paths.

## Quick start

On a fresh install, the installer scripts start onboarding automatically.
Complete the wizard they open. If you installed the package directly with npm,
pnpm, or Bun, run:

```bash
openclaw onboard --install-daemon
```

After onboarding:

```bash
openclaw gateway status
openclaw dashboard
```

Onboarding verifies model access, creates the workspace, and configures the Gateway. The last command opens the Control UI; send a message there to confirm the assistant is working. See the [getting started guide](https://docs.openclaw.ai/start/getting-started) for channel setup and troubleshooting.

## How it fits together

- The [Gateway](https://docs.openclaw.ai/gateway) is the local control plane for sessions, tools, events, and channel connections.
- The [Control UI](https://docs.openclaw.ai/web/control-ui), CLI, and [TUI](https://docs.openclaw.ai/web/tui) connect to the Gateway.
- [Channels](https://docs.openclaw.ai/channels) bring the assistant to WhatsApp, Telegram, Slack, Discord, Google Chat, Signal, iMessage, and other messaging services.
- [Companion apps and nodes](https://docs.openclaw.ai/platforms) add voice, Canvas, camera, screen, and device-local actions on supported platforms.

OpenClaw works with hosted and local [model providers](https://docs.openclaw.ai/concepts/model-providers). Its [tools](https://docs.openclaw.ai/tools), [skills](https://docs.openclaw.ai/tools/skills), and [plugins](https://docs.openclaw.ai/plugins) extend what an assistant can do.

## Security

Treat inbound messages as untrusted input. DM-capable channels pair unknown senders by default; approve a pairing request with `openclaw pairing approve <channel> <code>`.

Tools run on the host for the main session unless you configure sandboxing. Read the [security guide](https://docs.openclaw.ai/gateway/security), [exposure runbook](https://docs.openclaw.ai/gateway/security/exposure-runbook), and [sandboxing guide](https://docs.openclaw.ai/gateway/sandboxing) before connecting other users or exposing the Gateway remotely.

## Documentation

| Goal                             | Start here                                                                                                                                                                                                                                                           |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Configure models and auth        | [Models](https://docs.openclaw.ai/concepts/models) · [Model providers](https://docs.openclaw.ai/concepts/model-providers)                                                                                                                                            |
| Connect a messaging service      | [Channels](https://docs.openclaw.ai/channels)                                                                                                                                                                                                                        |
| Add tools, skills, and plugins   | [Tools](https://docs.openclaw.ai/tools) · [Skills](https://docs.openclaw.ai/tools/skills) · [Plugins](https://docs.openclaw.ai/plugins) · [ClawHub](https://clawhub.ai)                                                                                              |
| Run apps and device nodes        | [Platforms](https://docs.openclaw.ai/platforms) · [Nodes](https://docs.openclaw.ai/nodes)                                                                                                                                                                            |
| Use the CLI and chat commands    | [CLI reference](https://docs.openclaw.ai/cli) · [Slash commands](https://docs.openclaw.ai/tools/slash-commands)                                                                                                                                                      |
| Configure or operate the Gateway | [Configuration](https://docs.openclaw.ai/gateway/configuration) · [Architecture](https://docs.openclaw.ai/concepts/architecture) · [Updating](https://docs.openclaw.ai/install/updating) · [Release channels](https://docs.openclaw.ai/install/development-channels) |

## Development

The repository is a pnpm workspace. Plain `npm install` at the repository root is not supported.

```bash
git clone https://github.com/openclaw/openclaw.git
cd openclaw
pnpm install
pnpm build
pnpm ui:build
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the contribution workflow and the [source setup guide](https://docs.openclaw.ai/start/setup) for the development loop.

## Community

OpenClaw is developed in the open by the [OpenClaw Foundation](https://openclaw.org), a non-profit. See [CONTRIBUTING.md](CONTRIBUTING.md) for maintainers and contribution guidelines; AI-assisted PRs are welcome.

Use the [issue chooser](https://github.com/openclaw/openclaw/issues/new/choose) for bugs and feature requests, ask setup questions in [Discord](https://discord.gg/clawd), and report vulnerabilities through [SECURITY.md](SECURITY.md). New capabilities usually belong in plugins built on the [plugin SDK](https://docs.openclaw.ai/plugins/building-plugins) and shared through [ClawHub](https://clawhub.ai).

OpenClaw was built for **Molty**, a space lobster AI assistant, by Peter Steinberger and the community. Explore the [project lore](https://docs.openclaw.ai/start/lore), [soul.md](https://soul.md), [Peter's site](https://steipete.me), [Star History](https://www.star-history.com/#openclaw/openclaw&type=date&legend=top-left), and [@openclaw](https://x.com/openclaw).

Special thanks to [Mario Zechner](https://mariozechner.at/) for his support and for [pi](https://github.com/earendil-works/pi), and to Adam Doppelt for the lobster.bot domain.

## Sponsors

<table>
  <tr>
    <td align="center"><a href="https://github.com/openai"><picture><source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/openclaw/openclaw/main/docs/assets/sponsors/openai-light.svg"><img src="https://raw.githubusercontent.com/openclaw/openclaw/main/docs/assets/sponsors/openai.svg" alt="OpenAI" height="28"></picture></a></td>
    <td align="center"><a href="https://github.com/"><picture><source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/openclaw/openclaw/main/docs/assets/sponsors/github-light.svg"><img src="https://raw.githubusercontent.com/openclaw/openclaw/main/docs/assets/sponsors/github.svg" alt="GitHub" height="28"></picture></a></td>
    <td align="center"><a href="https://www.nvidia.com/"><picture><source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/openclaw/openclaw/main/docs/assets/sponsors/nvidia.svg"><img src="https://raw.githubusercontent.com/openclaw/openclaw/main/docs/assets/sponsors/nvidia-dark.svg" alt="NVIDIA" height="28"></picture></a></td>
    <td align="center"><a href="https://vercel.com/"><picture><source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/openclaw/openclaw/main/docs/assets/sponsors/vercel-light.svg"><img src="https://raw.githubusercontent.com/openclaw/openclaw/main/docs/assets/sponsors/vercel.svg" alt="Vercel" height="24"></picture></a></td>
    <td align="center"><a href="https://blacksmith.sh/"><picture><source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/openclaw/openclaw/main/docs/assets/sponsors/blacksmith-light.svg"><img src="https://raw.githubusercontent.com/openclaw/openclaw/main/docs/assets/sponsors/blacksmith.svg" alt="Blacksmith" height="28"></picture></a></td>
    <td align="center"><a href="https://www.convex.dev/"><picture><source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/openclaw/openclaw/main/docs/assets/sponsors/convex-light.svg"><img src="https://raw.githubusercontent.com/openclaw/openclaw/main/docs/assets/sponsors/convex.svg" alt="Convex" height="24"></picture></a></td>
  </tr>
</table>

## Contributors

Thanks to all clawtributors:

<!-- clawtributors:start -->

<a href="https://github.com/steipete"><img src="https://avatars.githubusercontent.com/u/58493?v=4&s=48" width="48" height="48" alt="steipete"></a> <a href="https://github.com/vincentkoc"><img src="https://avatars.githubusercontent.com/u/25068?v=4&s=48" width="48" height="48" alt="vincentkoc"></a> <a href="https://github.com/Takhoffman"><img src="https://avatars.githubusercontent.com/u/781889?v=4&s=48" width="48" height="48" alt="Takhoffman"></a> <a href="https://github.com/obviyus"><img src="https://avatars.githubusercontent.com/u/22031114?v=4&s=48" width="48" height="48" alt="obviyus"></a> <a href="https://github.com/gumadeiras"><img src="https://avatars.githubusercontent.com/u/5599352?v=4&s=48" width="48" height="48" alt="gumadeiras"></a> <a href="https://github.com/mbelinky"><img src="https://avatars.githubusercontent.com/u/132747814?v=4&s=48" width="48" height="48" alt="Mariano Belinky"></a> <a href="https://github.com/vignesh07"><img src="https://avatars.githubusercontent.com/u/1436853?v=4&s=48" width="48" height="48" alt="vignesh07"></a> <a href="https://github.com/joshavant"><img src="https://avatars.githubusercontent.com/u/830519?v=4&s=48" width="48" height="48" alt="joshavant"></a> <a href="https://github.com/scoootscooob"><img src="https://avatars.githubusercontent.com/u/167050519?v=4&s=48" width="48" height="48" alt="scoootscooob"></a> <a href="https://github.com/jacobtomlinson"><img src="https://avatars.githubusercontent.com/u/1610850?v=4&s=48" width="48" height="48" alt="jacobtomlinson"></a>
<a href="https://github.com/shakkernerd"><img src="https://avatars.githubusercontent.com/u/165377636?v=4&s=48" width="48" height="48" alt="shakkernerd"></a> <a href="https://github.com/sebslight"><img src="https://avatars.githubusercontent.com/u/19554889?v=4&s=48" width="48" height="48" alt="sebslight"></a> <a href="https://github.com/tyler6204"><img src="https://avatars.githubusercontent.com/u/64381258?v=4&s=48" width="48" height="48" alt="tyler6204"></a> <a href="https://github.com/ngutman"><img src="https://avatars.githubusercontent.com/u/1540134?v=4&s=48" width="48" height="48" alt="ngutman"></a> <a href="https://github.com/thewilloftheshadow"><img src="https://avatars.githubusercontent.com/u/35580099?v=4&s=48" width="48" height="48" alt="thewilloftheshadow"></a> <a href="https://github.com/Sid-Qin"><img src="https://avatars.githubusercontent.com/u/201593046?v=4&s=48" width="48" height="48" alt="Sid-Qin"></a> <a href="https://github.com/mcaxtr"><img src="https://avatars.githubusercontent.com/u/7562095?v=4&s=48" width="48" height="48" alt="mcaxtr"></a> <a href="https://github.com/eleqtrizit"><img src="https://avatars.githubusercontent.com/u/31522568?v=4&s=48" width="48" height="48" alt="eleqtrizit"></a> <a href="https://github.com/BunsDev"><img src="https://avatars.githubusercontent.com/u/68980965?v=4&s=48" width="48" height="48" alt="BunsDev"></a> <a href="https://github.com/cpojer"><img src="https://avatars.githubusercontent.com/u/13352?v=4&s=48" width="48" height="48" alt="cpojer"></a>
<a href="https://github.com/Glucksberg"><img src="https://avatars.githubusercontent.com/u/80581902?v=4&s=48" width="48" height="48" alt="Glucksberg"></a> <a href="https://github.com/osolmaz"><img src="https://avatars.githubusercontent.com/u/2453968?v=4&s=48" width="48" height="48" alt="osolmaz"></a> <a href="https://github.com/bmendonca3"><img src="https://avatars.githubusercontent.com/u/208517100?v=4&s=48" width="48" height="48" alt="bmendonca3"></a> <a href="https://github.com/jalehman"><img src="https://avatars.githubusercontent.com/u/550978?v=4&s=48" width="48" height="48" alt="jalehman"></a> <a href="https://github.com/huntharo"><img src="https://avatars.githubusercontent.com/u/5617868?v=4&s=48" width="48" height="48" alt="huntharo"></a> <a href="https://github.com/neeravmakwana"><img src="https://avatars.githubusercontent.com/u/261249544?v=4&s=48" width="48" height="48" alt="neeravmakwana"></a> <a href="https://github.com/openperf"><img src="https://avatars.githubusercontent.com/u/80630709?v=4&s=48" width="48" height="48" alt="openperf"></

> _README 过长已截断, 完整内容请查看 GitHub 仓库。_
