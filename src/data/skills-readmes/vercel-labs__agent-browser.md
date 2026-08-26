# agent-browser

Browser automation CLI for AI agents. Fast native Rust CLI.

[![skills.sh](https://skills.sh/b/vercel-labs/agent-browser)](https://skills.sh/vercel-labs/agent-browser)

## Installation

### Global Installation (recommended)

Installs the native Rust binary:

```bash
npm install -g agent-browser
agent-browser install  # Download Chrome from Chrome for Testing (first time only)
```

### Project Installation (local dependency)

For projects that want to pin the version in `package.json`:

```bash
npm install agent-browser
agent-browser install
```

Then use via `package.json` scripts or by invoking `agent-browser` directly.

### Homebrew (macOS)

```bash
brew install agent-browser
agent-browser install  # Download Chrome from Chrome for Testing (first time only)
```

### Cargo (Rust)

```bash
cargo install agent-browser
agent-browser install  # Download Chrome from Chrome for Testing (first time only)
```

### From Source

Requires Node.js 24+, pnpm 11+, and Rust.

```bash
git clone https://github.com/vercel-labs/agent-browser
cd agent-browser
pnpm install
pnpm build
pnpm build:native   # Requires Rust (https://rustup.rs)
pnpm link --global  # Makes agent-browser available globally
agent-browser install
```

### Linux Dependencies

On Linux, install system dependencies:

```bash
agent-browser install --with-deps
```

This exits nonzero if the package manager cannot install every required browser library.

### Updating

Upgrade to the latest version:

```bash
agent-browser upgrade
```

Detects your installation method (npm, Homebrew, or Cargo) and runs the appropriate update command automatically.

### Requirements

- **Chrome** - Run `agent-browser install` to download Chrome from [Chrome for Testing](https://developer.chrome.com/blog/chrome-for-testing/) (Google's official automation channel). Existing Chrome, Brave, Playwright, and Puppeteer installations are detected automatically. No Playwright or Node.js required for the daemon.
- **Node.js 24+ and pnpm 11+** - Only needed when building from source.
- **Rust** - Only needed when building from source (see From Source above).

## Quick Start

```bash
agent-browser open example.com
agent-browser snapshot                    # Get accessibility tree with refs
agent-browser click @e2                   # Click by ref from snapshot
agent-browser fill @e3 "test@example.com" # Fill by ref
agent-browser get text @e1                # Get text by ref
agent-browser screenshot page.png
agent-browser close
```

Clicks fail early when another element covers the target's click point, for example a consent banner or modal. Dismiss or interact with the reported covering element, then take a fresh snapshot before retrying the original ref.

Headless Chromium screenshots hide native scrollbars for consistent image output. Pass `--hide-scrollbars false` when launching to keep native scrollbars visible.

### Traditional Selectors (also supported)

```bash
agent-browser click "#submit"
agent-browser fill "#email" "test@example.com"
agent-browser find role button click --name "Submit"
```

## Commands

### Core Commands

```bash
agent-browser open                    # Launch browser (no navigation); stays on about:blank
agent-browser open <url>              # Launch + navigate to URL (aliases: goto, navigate)
agent-browser read [url]              # Fetch agent-readable text, or read rendered active-tab DOM
agent-browser click <sel>             # Click element (--new-tab to open in new tab)
agent-browser dblclick <sel>          # Double-click element
agent-browser focus <sel>             # Focus element
agent-browser type <sel> <text>       # Type into element
agent-browser fill <sel> <text>       # Clear and fill
agent-browser press <key>             # Press key (Enter, Tab, Control+a) (alias: key)
agent-browser keyboard type <text>    # Type with real keystrokes (no selector, current focus)
agent-browser keyboard inserttext <text>  # Insert text without key events (no selector)
agent-browser keydown <key>           # Hold key down
agent-browser keyup <key>             # Release key
agent-browser hover <sel>             # Hover element
agent-browser select <sel> <val>      # Select dropdown option
agent-browser check <sel>             # Check checkbox
agent-browser uncheck <sel>           # Uncheck checkbox
agent-browser scroll <dir> [px]       # Scroll (up/down/left/right, --selector <sel>)
agent-browser scrollintoview <sel>    # Scroll element into view (alias: scrollinto)
agent-browser drag <src> <tgt>        # Drag and drop
agent-browser upload <sel> <files>    # Upload files
agent-browser screenshot [path]       # Take screenshot (--full for full page, saves to a temporary directory if no path)
agent-browser screenshot --annotate   # Annotated screenshot with numbered element labels
agent-browser screenshot --screenshot-dir ./shots    # Save to custom directory
agent-browser screenshot --screenshot-format jpeg --screenshot-quality 80
agent-browser pdf <path>              # Save as PDF
agent-browser snapshot                # Accessibility tree with refs (best for AI)
agent-browser eval <js>               # Run JavaScript (-b for base64, --stdin for piped input)
agent-browser connect <port>          # Connect to browser via CDP
agent-browser stream enable [--port <port>]  # Start runtime WebSocket streaming
agent-browser stream status           # Show runtime streaming state and bound port
agent-browser stream disable          # Stop runtime WebSocket streaming
agent-browser close                   # Close browser (aliases: quit, exit)
agent-browser close --all             # Close all active sessions
agent-browser chat "<instruction>"    # AI chat: natural language browser control (single-shot)
agent-browser chat                    # AI chat: interactive REPL mode
```

### Get Info

```bash
agent-browser get text <sel>          # Get text content
agent-browser get html <sel>          # Get innerHTML
agent-browser get value <sel>         # Get input value
agent-browser get attr <sel> <attr>   # Get attribute
agent-browser get title               # Get page title
agent-browser get url                 # Get current URL
agent-browser get cdp-url             # Get CDP WebSocket URL (for DevTools, debugging)
agent-browser get count <sel>         # Count matching elements
agent-browser get box <sel>           # Get bounding box
agent-browser get styles <sel>        # Get computed styles
```

### Read Agent-Friendly Text

```bash
agent-browser read
agent-browser read https://example.com/article
agent-browser read https://example.com/article --filter overview
agent-browser read https://example.com/article --outline
agent-browser read https://docs.example.com --llms index --filter auth
agent-browser read https://docs.example.com --llms full --filter auth
agent-browser read example.com/article --require-md
agent-browser read https://example.com/article --json
```

`read` fetches a URL without launching Chrome. Omit the URL to read the rendered DOM of the active tab in the current browser session, including browser auth state and client-side updates. Explicit URL reads send `Accept: text/markdown` by default, try the same URL with `.md` appended when the first response is not markdown, walk ancestor paths toward `/` to find the nearest `llms.txt` for a matching docs link, print markdown or plain text when available, and fall back to readable text extracted from HTML. `--llms` and `--require-md` with no URL use the active tab URL because they depend on HTTP resources. `read` does not read `llms-full.txt` unless you ask for it.

Options: `--raw` prints the response body without HTML extraction, `--require-md` fails unless the server returns `Content-Type: text/markdown`, `--outline` prints a compact heading outline for one page, `--llms index` prints a compact nearest-ancestor `llms.txt` link list, `--llms full` reads the nearest-ancestor `llms-full.txt`, `--filter <text>` narrows page sections, llms links/sections, or outline headings, and `--timeout <ms>` changes the request timeout. Global safeguards such as `--allowed-domains`, `--content-boundaries`, and `--max-output` also apply to read fetches and output.

### Check State

```bash
agent-browser is visible <sel>        # Check if visible
agent-browser is enabled <sel>        # Check if enabled
agent-browser is checked <sel>        # Check if checked
```

### Find Elements (Semantic Locators)

```bash
agent-browser find role <role> <action> [value]       # By ARIA role
agent-browser find text <text> <action> [value]       # By text content
agent-browser find label <label> <action> [value]     # By label
agent-browser find placeholder <ph> <action> [value]  # By placeholder
agent-browser find alt <text> <action> [value]        # By alt text
agent-browser find title <text> <action> [value]      # By title attr
agent-browser find testid <id> <action> [value]       # By data-testid
agent-browser find first <sel> <action> [value]       # First match
agent-browser find last <sel> <action> [value]        # Last match
agent-browser find nth <n> <sel> <action> [value]     # Nth match
```

**Actions:** `click`, `fill`, `check`, `hover`, `text`

**Options:** `--name <name>` (filter role by accessible name), `--exact` (exact, case-sensitive match; for `role` it applies to the accessible name, whose default is a case-insensitive substring)

**Examples:**

```bash
agent-browser find role button click --name "Submit"
agent-browser find role heading text --name "Skills"     # implicit roles work: <h2>=heading, <ul>=list, top-level <header>=banner
agent-browser find text "Sign In" click
agent-browser find label "Email" fill "test@test.com"
agent-browser find first ".item" click
agent-browser find nth 2 "a" text
```

### Wait

```bash
agent-browser wait <selector>         # Wait for element to be visible
agent-browser wait <ms>               # Wait for time (milliseconds)
agent-browser wait --text "Welcome"   # Wait for text to appear (substring match)
agent-browser wait --url "**/dash"    # Wait for URL pattern
agent-browser wait --load networkidle # Wait for load state
agent-browser wait --fn "window.ready === true"  # Wait for JS condition

# Wait for text/element to disappear
agent-browser wait --fn "!document.body.innerText.includes('Loading...')"
agent-browser wait "#spinner" --state hidden
```

**Load states:** `load`, `domcontentloaded`, `networkidle`

### Batch Execution

Execute multiple commands in a single invocation. Commands can be passed as quoted arguments or piped as JSON via stdin. This avoids per-command process startup overhead when running multi-step workflows.

```bash
# Argument mode: each quoted argument is a full command
agent-browser batch "open https://example.com" "snapshot -i" "screenshot"

# With --bail to stop on first error
agent-browser batch --bail "open https://example.com" "click @e1" "screenshot"

# Stdin mode: pipe commands as JSON
echo '[
  ["open", "https://example.com"],
  ["snapshot", "-i"],
  ["click", "@e1"],
  ["screenshot", "result.png"]
]' | agent-browser batch --json
```

### Clipboard

```bash
agent-browser clipboard read                      # Read text from clipboard
agent-browser clipboard write "Hello, World!"     # Write text to clipboard
agent-browser clipboard copy                      # Copy current selection (Ctrl+C)
agent-browser clipboard paste                     # Paste from clipboard (Ctrl+V)
```

### Mouse Control

```bash
agent-browser mouse move <x> <y>      # Move mouse
agent-browser mouse down [button]     # Press button (left/right/middle)
agent-browser mouse up [button]       # Release button
agent-browser mouse wheel <dy> [dx]   # Scroll wheel
```

### Browser Settings

```bash
agent-browser set viewport <w> <h> [scale]  # Set viewport size (scale for retina, e.g. 2)
agent-browser set device <name>       # Emulate device ("iPhone 14")
agent-browser set geo <lat> <lng>     # Set geolocation
agent-browser set offline [on|off]    # Toggle offline mode
agent-browser set headers <json>      # Extra HTTP headers
agent-browser set credentials <u> <p> # HTTP basic auth
agent-browser set media [dark|light]  # Emulate color scheme
```

### Cookies & Storage

```bash
agent-browser cookies                 # Get all cookies
agent-browser cookies set <name> <val> # Set cookie
agent-browser cookies set --curl <file> # Import cookies from a Copy-as-cURL dump,
                                        # JSON array, or bare Cookie header (auto-detected)
agent-browser cookies clear           # Clear cookies

agent-browser storage local           # Get all localStorage
agent-browser storage local <key>     # Get specific key
agent-browser storage local set <k> <v>  # Set value
agent-browser storage local clear     # Clear all

agent-browser storage session         # Same for sessionStorage
```

### Network

```bash
agent-browser network route <url>              # Intercept requests
agent-browser network route <url> --abort      # Block requests
agent-browser network route <url> --body <json>  # Mock response
agent-browser network route '*' --abort --resource-type script  # Block scripts only
agent-browser network unroute [url]            # Remove routes
agent-browser network requests                 # View tracked requests
agent-browser network requests --filter api    # Filter requests
agent-browser network requests --type xhr,fetch  # Filter by resource type
agent-browser network requests --method POST   # Filter by HTTP method
agent-browser network requests --status 2xx    # Filter by status (200, 2xx, 400-499)
agent-browser network request <requestId>      # View full request/response detail
agent-browser network har start                # Start HAR recording (embeds text response bodies)
agent-browser network har start --content all  # Embed all response bodies (binary as base64)
agent-browser network har start --content none # Metadata only, no bodies
agent-browser network har stop [output.har]    # Stop and save HAR (temp path if omitted)
```

### Tabs & Windows

```bash
agent-browser tab                              # List tabs (shows `tabId` and optional label)
agent-browser tab new [url]                    # New tab (optionally with URL)
agent-browser tab new --label docs [url]       # New tab with a user-assigned label
agent-browser tab <t<N>|label>                 # Switch to a tab by id or label
agent-browser tab close [t<N>|label]           # Close a tab (defaults to active)
agent-browser window new                       # New window
```

Tab ids are stable strings of the form `t1`, `t2`, `t3`. They're never reused within a session, so scripts and agents can keep referring to the same tab even after other tabs are opened or closed. Positional integers like `tab 2` are **not** accepted; the `t` prefix disambiguates handles from indices and mirrors the `@e1` convention used for element refs.

You can also assign a memorable label (`docs`, `app`, `admin`) and use it interchangeably 

> _README 过长已截断, 完整内容请查看 GitHub 仓库。_
