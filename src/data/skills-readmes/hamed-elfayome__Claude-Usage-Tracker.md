<div align="center">
  <a href="mailto:hamedelfayome@gmail.com?subject=Claude%20Usage%20Tracker%20%E2%80%94%20Sponsorship"><img src=".github/sponsor-slot.svg" alt="This spot is available for sponsors — get in touch: hamedelfayome@gmail.com" width="420"></a>
</div>

# Claude Usage Tracker

<div align="center">
  <img src=".github/cover.jpg" alt="Claude Usage Tracker" width="100%">

  **A native macOS menu bar application for real-time monitoring of Claude AI usage limits**

  ![macOS](https://img.shields.io/badge/macOS-14.0+-black?style=flat-square&logo=apple)
  ![Swift](https://img.shields.io/badge/Swift-5.0+-orange?style=flat-square&logo=swift)
  ![SwiftUI](https://img.shields.io/badge/SwiftUI-5.0+-blue?style=flat-square&logo=swift)
  ![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)
  ![Version](https://img.shields.io/badge/version-3.2.0-blue?style=flat-square)
  ![Languages](https://img.shields.io/badge/languages-13-purple?style=flat-square)

  <sub>🇬🇧 English • 🇪🇸 Español • 🇫🇷 Français • 🇩🇪 Deutsch • 🇮🇹 Italiano • 🇵🇹 Português • 🇧🇷 Português (BR) • 🇯🇵 日本語 • 🇰🇷 한국어 • 🇨🇳 简体中文 • 🇹🇼 繁體中文 • 🇹🇷 Türkçe • 🇺🇦 Українська</sub>

  ### [Download Latest Release (v3.2.0)](https://github.com/hamed-elfayome/Claude-Usage-Tracker/releases/latest/download/Claude-Usage.zip)

  <sub>macOS 14.0+ (Sonoma) | ~6 MB | Native Swift/SwiftUI | Officially Signed</sub>

  <a href="https://www.buymeacoffee.com/hamedelfayome" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" height="40"></a>
</div>

---

## Overview

Claude Usage Tracker is a lightweight, native macOS menu bar application that provides real-time monitoring of your Claude AI usage limits. Built entirely with Swift and SwiftUI, it offers a clean, intuitive interface to track your 5-hour session window, weekly usage limits, and Opus-specific consumption.

### Key Capabilities

- **Dynamic Island (Beta)**: A minimal notch HUD showing what Claude Code is doing in real time — current tool, session status, and a pulse when Claude needs your input
- **Multi-Profile Support**: Manage unlimited Claude accounts with isolated credentials and settings
- **Multi-Profile Display**: Monitor all profiles simultaneously in the menu bar
- **Claude Code Integration**: Sync CLI accounts and auto-switch credentials when changing profiles
- **Real-Time Monitoring**: Track session, weekly, and per-model usage (Fable, Opus, Sonnet, Design), API console usage, and API costs per profile
- **Usage History**: Interactive charts tracking session, weekly, and billing data over time
- **Global Shortcuts**: System-wide keyboard shortcuts (no Accessibility permission)
- **Headless Mode**: Works on headless Macs via Remote Desktop
- **Customizable Interface**: 5 icon styles + 3 color modes (Multi-Color/Greyscale/Single Color) + per-element statusline colors + remaining/used percentage toggle
- **Smart Automation**: Auto-start sessions, auto-switch profiles, threshold notifications
- **Developer Tools**: Terminal statusline integration with model, context, profile display, weekly/extra usage segments, pace markers, per-element colors, and color modes
- **Privacy-First**: Credentials in the macOS Keychain, local storage, minimal anonymous analytics (version-only heartbeat), no cloud sync
- **Native Performance**: Lightweight Swift/SwiftUI design for macOS

<div align="center">
  <img src=".github/settings.gif" alt="Quick Walkthrough" width="600">
  <img src=".github/icon.jpg" alt="Menu Bar Icon" height="180">
  <img src=".github/popover.png" alt="Popover Interface" width="200">

  <sub>Menu bar icon and detailed usage popover</sub>

  <img src=".github/statusline.png" alt="Claude Code Statusline">
  <br>
  <sub>Live terminal statusline showing directory, branch, model, context, and color-coded usage</sub>
</div>

---

## What's New

- **v3.2.0 (2026-07-12)**: **Dynamic Island (Beta)** — live Claude Code activity HUD at the notch; **Fable per-model tracking** via the new `limits[]` usage format; credentials moved to the macOS Keychain (GHSA-mfxh-xpwm-23c7); profile switching overhaul (no more forced re-logins); usage history storage fix (silent settings loss on macOS 26); macOS 26/27 crash and sign-in fixes; localization parity across all 13 languages. Huge thanks to 9 community contributors.

- **v3.1.0 (2026-04-14)**: Peak hours indicator with flame icon and countdown popover, right-click context menu on menu bar icons, per-element statusline color customization (#208), weekly & extra usage segments in statusline (#177), active profile indicator in multi-profile mode, Nix installation option (#211), 3 new languages (Brazilian Portuguese, Turkish, Ukrainian) bringing total to 12, 13 bug fixes including popover crash on profile switch, app hang on launch, and E3000 unauthorized errors

- **v3.0.3 (2026-03-10)**: 6-tier pace system with colored pace markers, 3 color modes (Multi-Color/Greyscale/Single Color), label toggles, 24-hour time format, terminal-matching preview colors

- **v3.0.2 (2026-03-10)**: API cost tracking with daily chart, browser-based authentication, rate limit header usage for CLI OAuth, auto-sizing popover, session key expiry tracking

- **v3.0.1 (2026-03-08)**: Popover settings tab, multi-display CPU fix

- **v3.0.0 - Major Release (2026-03-08)**: Headless mode, usage history charts, global shortcuts, auto-switch profiles, borderless settings, 6 new statusline components, Simplified Chinese

- **v2.3.0** – Multi-profile menu bar display, remaining percentage toggle
- **v2.2.0** – Multi-profile management, CLI integration, Korean language
- **v2.0.0** – Apple code signing, automatic updates, Keychain security

**[View Full Release History](CHANGELOG.md)**

---

## Getting Started

### Prerequisites

Before installing Claude Usage Tracker, ensure you have:

- **macOS 14.0 (Sonoma) or later** - Check: Apple menu → About This Mac
- **Active Claude AI account** - Sign up at [claude.ai](https://claude.ai)

**Authentication** (choose one method):
- **Easiest**: [Claude Code](https://claude.com/claude-code) installed and logged in - App automatically uses CLI credentials (v2.2.2+)
- **Browser Sign-In**: Sign in via the built-in browser — session key extracted automatically (v3.0.2+)
- **Manual**: Web browser access to extract session key from claude.ai (Chrome, Safari, Firefox, etc.)

**Note**: For terminal statusline integration, you'll still need to manually configure a session key even if using Claude Code OAuth

### Installation

#### Option 1: Homebrew (Recommended)

```bash
brew install --cask hamed-elfayome/claude-usage/claude-usage-tracker
```

Or tap first, then install:

```bash
brew tap hamed-elfayome/claude-usage
brew install --cask claude-usage-tracker
```

**Note**: Starting with v2.0.0, the app is officially signed with an Apple Developer certificate. No security workarounds needed!

**To update**:
```bash
brew upgrade --cask claude-usage-tracker
```

Or use the built-in automatic update feature (Settings → Updates).

**To uninstall**:
```bash
brew uninstall --cask claude-usage-tracker
```

#### Option 2: Nix

Test the app:

```bash
nix-shell -p claude-usage-tracker
```

Install it using home-manager:

```nix
home.packages = with pkgs; [
  claude-usage-tracker
];
```

#### Option 3: Direct Download

**[Download Claude-Usage.zip](https://github.com/hamed-elfayome/Claude-Usage-Tracker/releases/latest/download/Claude-Usage.zip)**

1. Download the `.zip` file from the link above
2. Extract the zip file (double-click or use Archive Utility)
3. Drag `Claude Usage.app` to your Applications folder
4. Double-click to launch - that's it!

**v2.0.0+ Note**: The app is now officially signed with an Apple Developer certificate. You can install and run it like any other Mac application - no security warnings or workarounds needed.

**Automatic Updates**: Once installed, the app will automatically check for updates and notify you when new versions are available (Settings → Updates).

#### Option 4: Build from Source

```bash
# Clone the repository
git clone https://github.com/hamed-elfayome/Claude-Usage-Tracker.git
cd Claude-Usage-Tracker

# Open in Xcode
open "Claude Usage.xcodeproj"

# Build and run (⌘R)
```

### Quick Start Guide

#### Option A: Automatic Setup with Claude Code (Easiest)

**New in v2.2.2**: If you have Claude Code installed and logged in, the app works automatically!

1. **Install Claude Code** (if not already installed)
   - Download from [claude.com/claude-code](https://claude.com/claude-code)
   - Log in using `claude login`

2. **Launch Claude Usage Tracker**
   - The app automatically detects your Claude Code Account
   - No manual configuration needed!

3. **Verify It's Working**
   - Click the menu bar icon
   - You should see your usage statistics immediately

#### Option B: Browser Sign-In (v3.0.2+)

If you don't use Claude Code, sign in directly through the app:

1. **Click the menu bar icon** and select "Settings"
2. **Navigate to "Personal Usage"** tab
3. **Click "Sign in to Claude.ai"** — an embedded browser opens
4. **Log in** with your Claude.ai credentials (email, Google SSO, etc.)
5. **Session key is extracted automatically** — the app validates and saves it
6. **Select your organization** from the list and confirm

#### Option C: Manual Setup with Session Key

If you prefer manual configuration:

**Step 1: Extract Your Session Key**

1. **Open Claude AI**
   - Navigate to [claude.ai](https://claude.ai) in your browser
   - Make sure you're logged in

2. **Open Developer Tools**
   - **Chrome/Edge**: Press `F12` or `Cmd+Option+I` (macOS) / `Ctrl+Shift+I` (Windows)
   - **Safari**: Enable Developer menu in Preferences → Advanced, then press `Cmd+Option+I`
   - **Firefox**: Press `F12` or `Cmd+Option+I` (macOS) / `Ctrl+Shift+I` (Windows)

3. **Navigate to Cookies**
   - Go to: **Application** tab (Chrome/Edge) or **Storage** tab (Firefox)
   - Expand: **Cookies** → **https://claude.ai**
   - Find: `sessionKey` cookie
   - Copy: The value (starts with `sk-ant-sid01-...`)

**Step 2: Configure Session Key**

1. **Click the menu bar icon** and select "Settings"
2. **Navigate to "Personal Usage"** tab
3. **Expand "Advanced: Manual Session Key"**
4. **Paste your session key** and click "Test Connection"
5. **Select your organization** from the list
6. **Review and click "Save Configuration"**

**Step 3: Verify It's Working**

1. **Check Menu Bar**: You should see the Claude Usage icon in your menu bar
2. **Click the Icon**: Popover appears showing your usage statistics
3. **View Data**: Session usage, weekly usage, and reset timers should display

**Success!** The app is now monitoring your Claude usage.

#### Next Steps

- **Customize Icon**: Go to Settings → Appearance to choose your preferred menu bar style
- **Enable Notifications**: Settings → Notifications to get threshold alerts
- **Auto-Start Sessions**: Settings → Session Management to enable automatic session initialization
- **Terminal Integration**: Settings → Claude Code to set up statusline (requires session key configuration)
- **Keyboard Shortcuts**: Settings → Shortcuts to configure global hotkeys

---

## Advanced Configuration

### Manual Session Key Setup

If you prefer to configure the session key manually instead of using the setup wizard:

```bash
# Create session key file
echo "sk-ant-sid01-YOUR_SESSION_KEY_HERE" > ~/.claude-session-key

# Set secure permissions (important for security)
chmod 600 ~/.claude-session-key
```

After creating the file, launch the app and it will automatically detect the session key.

---

## Multi-Profile Management

**New in v2.2.0**: Claude Usage Tracker now supports unlimited profiles, allowing you to manage multiple Claude accounts seamlessly with automatic credential switching.

**New in v3.0.0**: Auto-switch profiles when session limit reached, usage history tracking, and global keyboard shortcuts!

### Features

#### Profile Management
- **Unlimited Profiles**: Create as many profiles as needed for different Claude accounts
- **Multi-Profile Display**: Show all profiles in the menu bar at once
  - Toggle between Single mode (active profile only) and Multi mode (all profiles)
  - Each profile displays with its own icon style and settings
  - Click any profile icon to view its usage details
  - Independent refresh rates per profile
- **Fun Auto-Names**: Profiles auto-generate with names like "Quantum Llama", "Sneaky Penguin", "Turbo Sloth"
- **Custom Names**: Rename profiles to whatever you prefer
- **Quick Switching**: Switch profiles instantly via popover dropdown or settings sidebar
- **Profile Badges**: Visual indicators show which profiles have Claude.ai credentials and CLI accounts

#### Claude Code CLI Integration
- **One-Click Sync**: Sync your currently logged-in Claude Code account to a profile
- **Automatic Switching**: When you switch profiles, CLI credentials automatically update
- **Credential Display**: View masked access tokens and subscription type
- **Smart Re-Sync**: Credentials automatically refresh before profile switches to capture CLI changes
- **Per-Profile CLI**: Each profile can have its own Claude Code account or share the system account

#### Per-Profile Settings
Each profile has isolated settings:
- **Credentials**: Separate Claude.ai session keys, API keys, and organization IDs
- **Appearance**: Independent icon styles and monochrome mode
- **Refresh Interval**: Custom refresh rates (5-300 seconds)
- **Auto-Start Sessions**: Enable/disable per profile
- **Notifications**: Independent threshold alerts (75%, 90%, 95%)
- **Usage Data**: Tracked separately per profile

#### Profile Switcher
Access profile switcher in multiple places:
- **Popover Header**: Dropdown menu with profile badges
- **Settings Sidebar**: Active profile picker with visual indicators
- **Manage Profiles Tab**: Full profile management interface

#### How to Use

1. **Create Profiles**:
   - Go to Settings → Manage Profiles
   - Click "Create New Profile"
   - Auto-generates a fun name or enter your own

2. **Configure Credentials**:
   - Switch to desired profile in sidebar
   - Go to Claude.AI / API Console / CLI Account tabs
   - Enter credentials (isolated per profile)

3. **Sync Claude Code** (Optional):
   - Log in to Claude Code in terminal
   - Open Settings → CLI Account
   - Click "Sync from Claude Code"
   - Now when you switch profiles, CLI credentials auto-update!

4. **Switch Profiles**:
   - Click popover dropdown
   - Or use settings sidebar picker
   - CLI credentials apply automatically


---

## Features

### Installation & Updates
- **Official Apple Code Signing**: Professionally signed application - installs like any Mac app
- **Automatic Updates**: Built-in update system powered by Sparkle framework
- **One-Click Installation**: No security workarounds or manual approvals needed
- **Update Notifications**: Get notified when new version

> _README 过长已截断, 完整内容请查看 GitHub 仓库。_
