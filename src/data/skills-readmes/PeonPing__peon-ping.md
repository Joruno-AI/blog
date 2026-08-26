# peon-ping
<div align="center">

**English** | [한국어](README_ko.md) | [中文](README_zh.md) | [日本語](README_ja.md)

![macOS](https://img.shields.io/badge/macOS-blue) ![WSL2](https://img.shields.io/badge/WSL2-blue) ![Linux](https://img.shields.io/badge/Linux-blue) ![Windows](https://img.shields.io/badge/Windows-blue) ![MSYS2](https://img.shields.io/badge/MSYS2-blue) ![SSH](https://img.shields.io/badge/SSH-blue)
![License](https://img.shields.io/badge/license-MIT-green)

![Claude Code](https://img.shields.io/badge/Claude_Code-hook-ffab01) ![Amp](https://img.shields.io/badge/Amp-adapter-ffab01) ![Gemini CLI](https://img.shields.io/badge/Gemini_CLI-adapter-ffab01) ![GitHub Copilot](https://img.shields.io/badge/GitHub_Copilot-adapter-ffab01) ![Codex](https://img.shields.io/badge/Codex-adapter-ffab01) ![Cursor](https://img.shields.io/badge/Cursor-adapter-ffab01) ![OpenCode](https://img.shields.io/badge/OpenCode-adapter-ffab01) ![Kilo CLI](https://img.shields.io/badge/Kilo_CLI-adapter-ffab01) ![Kiro](https://img.shields.io/badge/Kiro-adapter-ffab01) ![Kimi Code](https://img.shields.io/badge/Kimi_Code-adapter-ffab01) ![Windsurf](https://img.shields.io/badge/Windsurf-adapter-ffab01) ![Antigravity](https://img.shields.io/badge/Antigravity-adapter-ffab01) ![OpenClaw](https://img.shields.io/badge/OpenClaw-adapter-ffab01) ![Rovo Dev CLI](https://img.shields.io/badge/Rovo_Dev_CLI-adapter-ffab01) ![DeepAgents](https://img.shields.io/badge/DeepAgents-adapter-ffab01) ![oh-my-pi](https://img.shields.io/badge/oh--my--pi-adapter-ffab01) ![Qwen Code](https://img.shields.io/badge/Qwen_Code-adapter-ffab01) ![iFlow CLI](https://img.shields.io/badge/iFlow_CLI-adapter-ffab01) ![Trae](https://img.shields.io/badge/Trae-adapter-ffab01) ![Kiro IDE](https://img.shields.io/badge/Kiro_IDE-adapter-ffab01) ![ECA](https://img.shields.io/badge/ECA-adapter-ffab01)

**Game character voice lines + visual overlay notifications when your AI coding agent needs attention — or let the agent pick its own sound via MCP.**

AI coding agents don't notify you when they finish or need permission. You tab away, lose focus, and waste 15 minutes getting back into flow. peon-ping fixes this with voice lines and bold on-screen banners from Warcraft, StarCraft, Portal, Zelda, and more — works with **Claude Code**, **Amp**, **GitHub Copilot**, **Codex**, **Cursor**, **OpenCode**, **Kilo CLI**, **Kiro**, **Kimi Code**, **Windsurf**, **Google Antigravity**, **Rovo Dev CLI**, **DeepAgents**, **Qwen Code**, **iFlow CLI**, **Trae**, **Kiro IDE**, **ECA**, and any MCP client.

**See it in action** &rarr; [peonping.com](https://peonping.com/)

<video src="https://github.com/user-attachments/assets/149b6d15-65c2-41f2-9b56-13575ff8364b" autoplay loop muted playsinline width="400"></video>

</div>

---

- [Install](#install)
- [What you'll hear](#what-youll-hear)
- [Quick controls](#quick-controls)
- [Configuration](#configuration)
- [Peon Trainer](#peon-trainer)
- [MCP server](#mcp-server)
- [Multi-IDE support](#multi-ide-support)
- [Remote development](#remote-development-ssh--devcontainers--codespaces)
- [Mobile notifications](#mobile-notifications)
- [Sound packs](#sound-packs)
- [Creating packs](#creating-packs)
- [Debugging](#debugging)
- [Uninstall](#uninstall)
- [Requirements](#requirements)
- [How it works](#how-it-works)
- [Links](#links)

---

## Install

### Option 1: Homebrew (recommended)

```bash
brew install PeonPing/tap/peon-ping
```

Then run `peon-ping-setup` to register hooks and download sound packs. macOS and Linux.

### Option 2: Installer script (macOS, Linux, WSL2)

```bash
curl -fsSL https://raw.githubusercontent.com/PeonPing/peon-ping/main/install.sh | bash
```

⚠️ **WSL2 audio notes.** peon-ping plays audio on the Windows side. On first run it probes your Windows host once (cached per Windows build) to pick the best playback path:

- On **Windows 10 / Windows 11 pre-24H2**, WPF MediaPlayer is used directly — native MP3 + WAV, no extra dependencies.
- On **Windows 11 24H2+** (build 26100+), Microsoft removed legacy Windows Media Player from the OS and WPF MediaPlayer fails (`MILAVERR_INVALIDWMPVERSION`). peon-ping falls back to `System.Media.SoundPlayer`, which uses the Win32 `PlaySound` API and works everywhere — but it's WAV-only, so MP3 packs require **ffmpeg** to transcode on the fly:

  ```sh
  sudo apt update; sudo apt install -y ffmpeg
  ```

You can override the auto-detection with `PEON_WSL_AUDIO_BACKEND=auto|mediaplayer|soundplayer`:

- `auto` (default) — probe + cache as described above
- `mediaplayer` — force WPF MediaPlayer over the WSL UNC path (fails silently on 24H2+)
- `soundplayer` — force tmpfile copy + `SoundPlayer` (universal, requires ffmpeg for non-WAV files)

### Option 3: Installer for Windows

```powershell
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/PeonPing/peon-ping/main/install.ps1" -OutFile ".\install.ps1" -UseBasicParsing
powershell -ExecutionPolicy Bypass -File .\install.ps1
```

Installs a curated starter set of packs by default. Re-run to update while preserving config/state. Or **[pick your packs interactively at peonping.com](https://peonping.com/#picker)** and get a custom install command.

Windows installer parameters:

- `-All` — install all available packs
- `-Packs peon,sc_kerrigan,...` — install specific packs only
- `-Lang en,fr,...` — install only packs matching language(s)
- `-Local` — install packs, config, hooks, and skills into `./.claude/` for the current project
- `-Global` — explicit global install (same as default)
- `-InitLocalConfig` — create `./.claude/hooks/peon-ping/config.json` only

`-Local` does not install the global `peon` CLI shim or modify your user `PATH`. Hooks are registered in the project-level `./.claude/settings.json` with absolute paths so they work from any working directory within the project.

Windows examples:

```powershell
powershell -ExecutionPolicy Bypass -File .\install.ps1 -All
powershell -ExecutionPolicy Bypass -File .\install.ps1 -Packs peon,sc_kerrigan
powershell -ExecutionPolicy Bypass -File .\install.ps1 -Local
powershell -ExecutionPolicy Bypass -File .\install.ps1 -InitLocalConfig
```

If the initial download fails with a TLS error on older Windows PowerShell, run this once in the same session and retry:

```powershell
[Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12
```

### Option 4: Clone and inspect first

```bash
git clone https://github.com/PeonPing/peon-ping.git
cd peon-ping
./install.sh
```

On Windows PowerShell:

```powershell
git clone https://github.com/PeonPing/peon-ping.git
Set-Location peon-ping
.\install.ps1
```

### Option 5: Nix (macOS, Linux)

Run directly from source without installing:

```bash
nix run github:PeonPing/peon-ping -- status
nix run github:PeonPing/peon-ping -- packs install peon
```

Or install to your profile:

```bash
nix profile install github:PeonPing/peon-ping
```

Development shell (bats, shellcheck, nodejs):

```bash
nix develop  # or use direnv
```

#### Home Manager module (declarative configuration)

For reproducible setups, use the Home Manager module:

```nix
# In your home.nix or flake.nix
{ inputs, pkgs, ... }:

let
  peonCursorAdapterPath = "${inputs.peon-ping.packages.${pkgs.system}.default}/share/peon-ping/adapters/cursor.sh";
in {
  imports = [ inputs.peon-ping.homeManagerModules.default ];

  programs.peon-ping = {
    enable = true;
    package = inputs.peon-ping.packages.${pkgs.system}.default;
    claudeCodeIntegration = true;

    settings = {
      default_pack = "glados";
      volume = 0.7;
      enabled = true;
      desktop_notifications = true;
      categories = {
        "session.start" = true;
        "task.complete" = true;
        "task.error" = true;
        "input.required" = true;
        "resource.limit" = true;
        "user.spam" = true;
      };
    };

    # Install packs from og-packs (simple string notation)
    # and custom sources (attrset with name + src)
    installPacks = [
      "peon"
      "glados"
      "sc_kerrigan"
      # Custom pack from GitHub (openpeon.com registry)
      {
        name = "mr_meeseeks";
        src = pkgs.fetchFromGitHub {
          owner = "kasperhendriks";
          repo = "openpeon-mrmeeseeks";
          rev = "main";  # or use a commit hash for reproducibility
          sha256 = "sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
        };
      }
    ];
    enableZshIntegration = true;
  };

  # Optional extra IDE hooks, like Cursor
  home.file.".cursor/hooks.json".text = builtins.toJSON {
    version = 1;
    hooks = {
      afterAgentResponse = [{ command = "bash ${peonCursorAdapterPath} afterAgentResponse"; }];
      stop               = [{ command = "bash ${peonCursorAdapterPath} stop"; }];
    };
  };
}
```

**Sound pack installation**: The `installPacks` option supports two formats:
- **Simple strings** (e.g., `"peon"`, `"glados"`) — fetched from the [og-packs](https://github.com/PeonPing/og-packs) repository
- **Custom sources** — attrset with `name` and `src` fields, where `src` can be any Nix fetcher result (e.g., `pkgs.fetchFromGitHub`)

For packs listed on [openpeon.com](https://openpeon.com/), find the GitHub repository link and use `pkgs.fetchFromGitHub`:
```nix
{
  name = "pack_name";
  src = pkgs.fetchFromGitHub {
    owner = "github-owner";
    repo = "repo-name";
    rev = "main";  # or a commit hash/tag
    sha256 = "";   # Leave empty first, Nix will tell you the correct hash
  };
}
```

**Claude Code hooks**: set `programs.peon-ping.claudeCodeIntegration = true;` to install the Claude Code hook scripts under `~/.claude/hooks/peon-ping/` and merge the standard peon-ping hook entries into `~/.claude/settings.json`.

**Other IDE hooks**: adapters for other IDEs are still opt-in so the module does not overwrite unrelated IDE settings. peon-ping provides adapter scripts such as `cursor.sh` in [`adapters/`](https://github.com/PeonPing/peon-ping/tree/main/adapters), and you can wire them like this:
  ```sh
  ${inputs.peon-ping.packages.${pkgs.system}.default}/share/peon-ping/adapters/$YOUR_IDE.sh EVENT_NAME
  ```
  See the Cursor example above.

## What you'll hear

| Event | CESP Category | Examples |
|---|---|---|
| Session starts | `session.start` | *"Ready to work!"*, *"Something need doing?"* |
| Task finishes | `task.complete` | *"Work complete."*, *"Work, work."* |
| Agent acknowledged task | `task.acknowledge` | *"I can do that."*, *"Be happy to."*, *"Okie dokie."* *(disabled by default)* |
| Permission needed | `input.required` | *"Hmm?"*, *"What you want?"*, *"Yes?"* |
| Tool or command error | `task.error` | *"Me not that kind of orc!"*, *"Ugh."* |
| Rate or token limit hit | `resource.limit` | *"Why not?"* |
| Rapid prompts (3+ in 10s) | `user.spam` | *"Whaaat?"*, *"Me busy, leave me alone!"*, *"No time for play."* |

Plus **large overlay banners** on every screen (macOS/WSL/MSYS2) and terminal tab titles (`● project: done`) — you'll know something happened even if you're in another app.

peon-ping implements the [Coding Event Sound Pack Specification (CESP)](https://github.com/PeonPing/openpeon) — an open standard for coding event sounds that any agentic IDE can adopt.

## Quick controls

Need to mute sounds and notifications during a meeting or pairing session? Two options:

| Method | Command | When |
|---|---|---|
| **Slash command** | `/peon-ping-toggle` | While working in Claude Code |
| **CLI** | `peon toggle` | From any terminal tab |

Prefer it to happen automatically? Set [`focus_detect`](#configuration) to have peon-ping honor macOS **Focus / Do Not Disturb**. Sounds and notifications go quiet whenever a Focus is on and resume when you turn it off. See also `headphones_only` and `meeting_detect`.

Other CLI commands:

> Windows note: Windows currently supports the day-one controls (`status`, `toggle`, `volume`, core `packs`, `notifications on/off`, `debug`, `logs`, `trainer`). More advanced commands like `setup`, `rotation`, `preview`, and `mobile` are tracked as follow-up Windows parity work.

```bash
peon setup                # Interactive setup wizard (volume, categories, notifications)
peon pause                # Mute sounds
peon resume               # Unmute sounds
peon mute                 # Alias for 'pause'
peon unmute               # Alias for 'resume'
peon status               # Check if paused or active (concise)
peon status --verbose     # Show full details (notifications, headphones, IDEs, etc.)
peon volume               # Show current volume
peon volume 0.7           # Set volume (0.0–1.0)
peon rotation             # Show current rotation mode
peon rotation random      # Set rotation mode (random|round-robin|session_override)
peon packs list           # List installed sound packs
peon packs list --registry # Browse all available packs in the registry
peon packs community      # List all registry packs grouped by trust tier (Windows)
peon packs search <query> # Search registry packs by name (Windows)
peon packs install <p1,p2> # Install packs from the registry
peon packs install --all  # Install all packs from the registry
peon packs install-local <path> # Install a pack from a local directory
peon packs use <name>     # Switch to a specific pack (auto-installs from registry on Windows)
peon packs use --install <name>  # Switch to pack, installing from registry if needed
peon packs next           # Cycle to the next pack
peon packs remove <p1,p2> # Remove specific packs
peon packs bind <name>    # Bind a pack to the current directory
peon packs bind --pattern <path> # Bind a pack to a directory pattern, e.g. "*/services"
peon packs unbind         # Remove the current directory
peon packs bindings       # List all assigned bindings
peon packs ide-bind <ide> <name> # Bind a pack to an IDE id, e.g. codex
peon packs ide-unbind <ide> # Remove an IDE binding
peon packs ide-bindings   # List all IDE-based bindings
peon packs exclude add <path> # Silence sounds & notifications for a glob or directory
peon packs exclude remove <path> # Stop silencing the given path
peon packs exclude list   # List silenced paths
peon create               # Draft a new sound pack via your own Claude Code (interactive, or --name/--flavor/--vibe)
peon eval <name-or-path>  # Open the eval gate to audition/reroll/approve a draft (or re-draft an installed pack)
peon sounds list [pack]   # List sounds in a pack, marking disabled ones
peon sounds disable <category> <file> [--pack=<name>]  # Mute a single sound within a pack
peon sounds enable <category> <file> [--pack=<name>]   # Re-enable a previously disabled sound
peon notifications on     # Enable desktop notifications
peon notifications off    # Disable desktop notifications
peon notifications overlay   # Use large overlay banners (default)
peon notifications standard  # Use standard system notifications
peon notifications test      # Send a test notification
peon notifications position [p

> _README 过长已截断, 完整内容请查看 GitHub 仓库。_
