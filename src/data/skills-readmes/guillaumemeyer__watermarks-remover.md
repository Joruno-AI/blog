```
_ _ _ ____ ___ ____ ____ _  _ ____ ____ _  _ ____    ____ ____ _  _ ____ _  _ ____ ____
| | | |__|  |  |___ |__/ |\/| |__| |__/ |_/  [__  __ |__/ |___ |\/| |  | |  | |___ |__/
|_|_| |  |  |  |___ |  \ |  | |  | |  \ | \_ ___]    |  \ |___ |  | |__|  \/  |___ |  \
```

# watermarks-remover

<!-- logo: figlet -d .figlet -f cybermedium -w 120 "watermarks-remover" -->

[![CI](https://github.com/guillaumemeyer/watermarks-remover/actions/workflows/ci.yml/badge.svg)](https://github.com/guillaumemeyer/watermarks-remover/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/guillaumemeyer/watermarks-remover)](https://github.com/guillaumemeyer/watermarks-remover/releases)
[![Stars](https://img.shields.io/github/stars/guillaumemeyer/watermarks-remover)](https://github.com/guillaumemeyer/watermarks-remover/stargazers)
[![Forks](https://img.shields.io/github/forks/guillaumemeyer/watermarks-remover)](https://github.com/guillaumemeyer/watermarks-remover/forks)

Agent skill + stdlib Python service to strip **multi-vendor AI provenance marks** from text and files — for privacy and hygiene on content **you own**. The skill is a thin client: it drives the machinery over HTTP, so the agent host needs no Python.

| Layer | Target | How |
| --- | --- | --- |
| **A** | Invisible Unicode, exotic spaces, bidi, tag chars | Deterministic Python scripts |
| **B** | Statistical (token-sampling) text watermarks | Agent rewrite + optional `rewrite_text.py` hook |
| **Files** | C2PA / EXIF / XMP / doc props | PNG, JPEG, WebP, AVIF, HEIC, BMP, GIF, TIFF, SVG, PDF, DOCX, XLSX, PPTX, EPUB, ODT, HTML, Markdown, MP4/MOV/M4A/M4V, WAV, MP3, FLAC |

Vendors / ecosystems (class-level): **Claude**, **Gemini / SynthID-Text**, **OpenAI** provenance surfaces, **open-LLM** Kirchenbauer-style (green-list) and keyed-Gumbel / EXP (Aaronson) marks.

**Latest release:** [v0.5.0](https://github.com/guillaumemeyer/watermarks-remover/releases/tag/v0.5.0)

Skill path: [`skills/remove-ai-marks/`](skills/remove-ai-marks/)  
Service path: [`service/`](service/)  
(migration: formerly `remove-claude-marks`; slash alias `/remove-claude-marks` still documented)

## Install (agent skill)

The skill ships **no code** — it calls the service over HTTP. Install the skill (markdown only) and start the service, then set `WATERMARKS_SERVICE_URL` if it is not `http://127.0.0.1:8765`.

In Claude Code, the fastest route is the bundled
[plugin marketplace](#claude-code-plugin-marketplace) — no clone, and it updates
in place. Everywhere else, one installer covers every supported host
(Python 3.10+ stdlib, no dependencies):

```bash
python3 install_skill.py --skill remove-ai-marks --target claude-code
```

| Host | Target | Lands in |
| --- | --- | --- |
| Claude Code (personal) | `--target claude-code` | `~/.claude/skills/<skill>` (honors `CLAUDE_CONFIG_DIR`) |
| Claude Code (project) | `--target claude-project --project-dir PATH` | `PATH/.claude/skills/<skill>` |
| Cowork, claude.ai, cloud sessions, routines | `--target cowork` | `dist/<skill>.zip` to upload under **Customize → Skills** |
| Cursor | `--target cursor` (default) | `~/.cursor/skills/<skill>` |

Shipped skills: `remove-ai-marks` (full, service-backed) and
`clean-user-facing-text` (text only, self-contained). `--list` prints them.
Existing installations are preserved unless you pass `--force`; replacement is
staged first and the previous install is kept as a uniquely named backup.
`--link` symlinks this checkout instead of copying, so edits are picked up
live. On Windows, use `py install_skill.py ...`; the `install-skill.sh` wrapper
is provided for macOS/Linux shells.

Before writing anything, the installer validates the skill against the
[Agent Skills](https://agentskills.io) packaging rules that claude.ai uploads
and the Skills API enforce: spec-only frontmatter (`name`, `description`,
`license`, `compatibility`, `metadata`, `allowed-tools`), a lowercase hyphenated
`name` of at most 64 characters matching the directory, a non-empty
`description` of at most 1024 characters. The Cowork bundle additionally has
to fit the 30 MB upload limit, which the packager enforces.

### Automatic cleaning via hook (deterministic)

A skill is an instruction: the model decides whether to invoke it, and the
model is the thing producing the marks. A **hook** is executed by the harness
on every matching tool call, cooperation not required. That makes the hook the
deterministic half of this workflow.

The plugin registers a `PostToolUse` hook on `Write|Edit|MultiEdit|NotebookEdit`
that runs [`service/scripts/hook_written_file.py`](service/scripts/hook_written_file.py)
against the file the agent just wrote. Two modes, matching the pre-commit
convention of check-by-default:

| Mode | Behaviour |
| --- | --- |
| `check` (default) | Reports provenance marks, leaves the file alone. Findings go to the model (exit 2), so it can offer to clean them. |
| `clean` | Strips the marks in place, then tells the model the file on disk changed. |

Set the mode from the plugin's settings (**Hook mode** in `/plugin manage`,
read by the hook as `CLAUDE_PLUGIN_OPTION_HOOK_MODE`), or with
`WATERMARKS_HOOK_MODE=clean` in the environment. The hook command deliberately
does **not** interpolate `${user_config.hook_mode}`: Claude Code refuses to run
a hook that references an option the user has never opened `/plugin manage` to
set — a declared `default` does not satisfy it — so interpolating it would mean
the hook silently never runs on a fresh install. Detection reuses `audit_lib`'s
`scan_file` / `is_actionable`, so the hook, the pre-commit gate, and the CI
SARIF export agree on what counts as actionable; cleaning shells out to
`clean_file.py`, so no cleaning logic is duplicated. `clean` mode writes to a
sibling temp file and swaps only on a real difference, so files that were
already clean keep their mtime and don't retrigger file watchers.

Without the plugin, wire it in `~/.claude/settings.json` (or a project
`.claude/settings.json`) yourself:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit|MultiEdit|NotebookEdit",
        "hooks": [
          {
            "type": "command",
            "command": "python3",
            "args": ["/path/to/watermarks-remover/service/scripts/hook_written_file.py",
                     "--mode", "check"],
            "timeout": 30
          }
        ]
      }
    ]
  }
}
```

On Windows, replace `python3` with `py`.

**What a hook cannot do.** No hook can rewrite the assistant's chat message
before you read it. Claude Code's `Stop` hook receives `last_assistant_message`
read-only, and there is no pre-send filter for final responses — the same limit
this project already documents for Cursor rules. So the deterministic guarantee
covers **files the agent writes**, plus the
[pre-commit gate](#pre-commit-hook) for anything on its way into git. Text that
only ever exists in the chat transcript still depends on the skill workflow,
which is model-instruction-based and therefore best-effort.

### Claude Code plugin (marketplace)

The repository is also a Claude Code **plugin** and a single-plugin
**marketplace** (`.claude-plugin/`), so both skills install and update in two
commands, no clone or script required:

```
/plugin marketplace add guillaumemeyer/watermarks-remover
/plugin install watermarks-remover@watermarks-remover
```

The skills then load namespaced: `/watermarks-remover:remove-ai-marks` and
`/watermarks-remover:clean-user-facing-text` (the bare `/remove-ai-marks` also
works when nothing else claims the name). `/plugin marketplace update
watermarks-remover` pulls later versions. The same works from the CLI with
`claude plugin marketplace add …` / `claude plugin install …`, and from a local
checkout by passing a path instead of `owner/repo`.

Maintainers: `make plugin-validate` runs `claude plugin validate . --strict`
against both manifests; `tests/test_plugin_manifest.py` covers the same files
without needing the CLI.

### Claude Code

```bash
# Personal — available in all your projects
python3 install_skill.py --skill remove-ai-marks --target claude-code
# or: make install-claude-code-skill

# Project — commit .claude/skills/ to share it with the repo
python3 install_skill.py --skill remove-ai-marks --target claude-project \
  --project-dir /path/to/project
# or: make install-claude-project-skill PROJECT=/path/to/project
```

Claude Code picks up personal and project skills without a restart; `/skills`
lists what it loaded. Invoke with `/remove-ai-marks` or ask to “strip AI
watermarks / C2PA / Claude marks / SynthID-class text.” A project install is
also what [cloud sessions](https://code.claude.com/docs/en/cloud-environments)
read, since they clone the repository and load its `.claude/skills/`.

### Cowork (and claude.ai, cloud sessions, routines)

Cowork sessions do **not** read `~/.claude/skills` on your machine — they load
the skills enabled for your claude.ai account, synced when the session starts.
So install there by uploading a bundle:

```bash
python3 install_skill.py --skill remove-ai-marks --target cowork
# writes dist/remove-ai-marks.zip   (make package-cowork-skill)
```

Then, in the Claude Desktop app, open **Customize → Skills → Add** and upload
the zip (the same skill settings on claude.ai work too). The bundle is
reproducible and contains a single top-level `remove-ai-marks/` directory with
`SKILL.md` at its root, which is the layout the upload expects.

Service reachability matters more here than in a local install: the skill is a
thin HTTP client, so the session must be able to reach `WATERMARKS_SERVICE_URL`.
Cowork sessions that run locally on your machine reach a local `make serve`;
cloud sessions and routines run remotely and need a service URL reachable from
there (and `WATERMARKS_SERVER_API_KEY` set on it). If you want a skill with no
service at all, upload `clean-user-facing-text` instead — it is text-only and
ships its own scripts:

```bash
python3 install_skill.py --skill clean-user-facing-text --target cowork
```

### Grok

```bash
# Grok Build / project-local
mkdir -p .grok/skills
ln -sfn "$(pwd)/skills/remove-ai-marks" .grok/skills/remove-ai-marks

# User-global Grok
mkdir -p ~/.grok/skills
ln -sfn "$(pwd)/skills/remove-ai-marks" ~/.grok/skills/remove-ai-marks
```

### Optional text-only skill

[`skills/clean-user-facing-text/`](skills/clean-user-facing-text/) is a
self-contained skill for authorized manuscripts, documentation, and web
copy. It excludes image, C2PA, service, and external-model tooling, and runs
its own vendored Layer A scripts instead of calling the service.

```bash
python3 install_skill.py --skill clean-user-facing-text --target claude-code
python3 install_skill.py --skill clean-user-facing-text --target cursor
```

Skill invocation is model-selected. Projects that explicitly adopt this
workflow in Cursor can also copy the optional rule:

```bash
mkdir -p /path/to/project/.cursor/rules
cp integrations/cursor/clean-user-facing-text.mdc \
  /path/to/project/.cursor/rules/clean-user-facing-text.mdc
```

For all projects, put the same instruction in Cursor **User Rules** instead.
Rules improve consistency but remain model instructions; Cursor does not expose
a deterministic pre-send filter for final chat responses.

### Start the service

The fastest path is a local HTTP server (Python 3.10+ stdlib only — no deps, no Docker):

```bash
make serve                 # http://127.0.0.1:8765
# or directly:
python3 service/scripts/server.py --host 127.0.0.1 --port 8765
```

### Windows (no Docker)

See [docs/windows-autostart.md](docs/windows-autostart.md) for auto-starting the service at Windows login without Docker.

For the whole infra (core + optional harness/heavy backends), see [Docker / compose](#docker--compose) below.

Optional system tools (auto-used when present — preinstalled in the core Docker image):

| Tool | Role |
| --- | --- |
| [`c2patool`](https://github.com/contentauth/c2pa-rs/tree/main/cli) | Inspect C2PA manifests |
| [`exiftool`](https://exiftool.org/) | Residual metadata strip (esp. **PDF**) |
| [`qpdf`](https://qpdf.sourceforge.io/) | Structural PDF rebuild — **required** for a real PDF strip (see below) |

Core scripts need **Python 3.10+** stdlib only. Layer B model calls are optional.

## Quick use (scripts)

```bash
SCRIPTS=service/scripts

# Unified inspect / clean
python3 "$SCRIPTS/inspect_file.py" draft.md
python3 "$SCRIPTS/clean_file.py" draft.md -o draft.cleaned.md
python3 "$SCRIPTS/clean_file.py" photo.png -o photo.cleaned.png
python3 "$SCRIPTS/clean_file.py" notes.docx -o notes.cleaned.docx

# Text Layer A
python3 "$SCRIPTS/inspect_text.py" draft.md
python3 "$SCRIPTS/clean_text.py" draft.md -o draft.cleaned.md --stats

# Layer B rewrite hook (default: print prompt only — no model required)
python3 "$SCRIPTS/rewrite_text.py" draft.md --backend print-prompt --strength paraphrase
# Optional local Ollama (loopback only by default — remote endpoints require
# WATERMARKS_REWRITE_ALLOW_REMOTE=1 or --allow-remote):
# WATERMARKS_REWRITE_BACKEND=ollama WATERMARKS_REWRITE_MODEL=llama3.2 \
#   python3 "$SCRIPTS/rewrite_text.py" draft.md -o draft.rewritten.md
# API keys are read from WATERMARKS_REWRITE_API_KEY only (never argv).

# Images
python3 "$SCRIPTS/inspect_image.py" shot.png
python3 "$SCRIPTS/clean_image.py" shot.png -o shot.cleaned.png
```

### Text tools refuse binary input

`inspect_text.py`, `clean_text.py` and `rewrite_text.py` operate on text. Pointed
at a `.docx`, `.pdf` or image they used to decode the compressed bytes and report
whatever codepoints fell out — noise that tracks the compression, not the
content — and `clean_text.py` then wrote those mangled bytes back, destroying the
file. They now refuse binary input and name the tool that handles it:

```bash
python3 "$SCRIPTS/inspect_text.py" report.docx
# refusing to treat report.docx as text: it looks like a ZIP container (DOCX, ODT, …).
# Use inspect_file.py / clean_file.py, which route by format,
# or pass --force-text to scan the raw bytes anyway.
```

Detection is by magic number plus a control-byte ratio, so text in encodings
other than UTF-8 keeps working. `--force-text` overrides it everywhere.

### Unrecognized formats are never auto-cleaned

`classify()` labels bytes that match no supported text, image or container
format as **`unknown`** — it no longer falls back to "text". In auto mode
`clean_file.py` refuses such files (exit 2, no output written) instead of
decoding them as UTF-8 and writing back mangled bytes; `--as text` or
`--force-text` are the explicit opt-ins. `inspect_file.py` reports the file
as `unknown` (exit 0), and the HTTP service answers `/inspect` with
`kind: "unknown"` but rejects `/clean` of unknown formats (400 — send a
filename with a known extension, e.g. `notes.txt`).

## HTTP service

The same machinery runs as a stdlib HTTP service (`service/scripts/server.py`) — the interface the skill uses and the

> _README 过长已截断, 完整内容请查看 GitHub 仓库。_
