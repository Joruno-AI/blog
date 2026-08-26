<img width="2400" height="1000" alt="Rapid-MLX — the fastest local AI engine for Apple Silicon" src="docs/assets/readme-banner.png" />

<p align="center">
  <strong>The fastest local AI engine for Apple Silicon.</strong>
  <br>
  <em>Drop-in OpenAI / Anthropic API · up to 3× Ollama's throughput (<a href="https://rapidmlx.com/blog/rapid-mlx-vs-ollama-benchmark">measured</a>) · Runs on any M-series Mac.</em>
</p>

<p align="center">
  <a href="https://pypi.org/project/rapid-mlx/"><img src="https://img.shields.io/pypi/v/rapid-mlx?color=blue&label=PyPI" alt="PyPI"></a>
  <a href="https://formulae.brew.sh/formula/rapid-mlx"><img src="https://img.shields.io/badge/Homebrew-core-orange?logo=homebrew" alt="Homebrew core"></a>
  <a href="https://www.python.org/downloads/"><img src="https://img.shields.io/badge/python-3.10+-blue.svg" alt="Python 3.10+"></a>
  <a href="https://support.apple.com/en-us/HT211814"><img src="https://img.shields.io/badge/Apple_Silicon-M1%20|%20M2%20|%20M3%20|%20M4-black.svg?logo=apple" alt="Apple Silicon"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-Apache_2.0-blue.svg" alt="License"></a>
</p>

<p align="center">
  <a href="https://github.com/raullenchai/Rapid-MLX/actions/workflows/ci.yml"><img src="https://github.com/raullenchai/Rapid-MLX/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://github.com/raullenchai/Rapid-MLX/stargazers"><img src="https://img.shields.io/github/stars/raullenchai/Rapid-MLX?style=social" alt="GitHub stars"></a>
  <a href="https://github.com/raullenchai/Rapid-MLX/graphs/contributors"><img src="https://img.shields.io/github/contributors/raullenchai/Rapid-MLX?color=orange" alt="Contributors"></a>
  <a href="https://github.com/raullenchai/Rapid-MLX/commits/main"><img src="https://img.shields.io/github/last-commit/raullenchai/Rapid-MLX?color=orange" alt="Last commit"></a>
  <a href="https://discord.gg/nZcXkUjY5R"><img src="https://img.shields.io/discord/1540051732279599116?color=5865F2&label=Discord&logo=discord&logoColor=white" alt="Join the Rapid-MLX Discord"></a>
  <a href="https://deepwiki.com/raullenchai/Rapid-MLX"><img src="https://deepwiki.com/badge.svg" alt="Ask DeepWiki"></a>
</p>

<p align="center">
  <sub>
    <a href="https://rapidmlx.com"><b>rapidmlx.com</b></a> ·
    <a href="https://rapidmlx.com/docs/">Docs</a> ·
    <a href="https://models.rapidmlx.com/">Model mirror</a> ·
    <a href="https://rapidmlx.com/desktop">Desktop app</a> ·
    <a href="https://discord.gg/nZcXkUjY5R">Discord</a>
  </sub>
</p>

---

## Works with your AI stack

Use Rapid-MLX as a local backend for agents, apps, or your own code. If a
client accepts an OpenAI- or Anthropic-compatible endpoint, it can usually use
Rapid-MLX without an adapter.

<p>
  <a href="https://github.com/openai/codex"><img src="https://img.shields.io/badge/Codex_CLI-F3F4F6?style=flat&amp;logo=openai&amp;logoColor=111827" alt="Codex CLI"></a>
  <a href="https://www.anthropic.com/claude-code"><img src="https://img.shields.io/badge/Claude_Code-F3F4F6?style=flat&amp;logo=anthropic&amp;logoColor=111827" alt="Claude Code"></a>
  <a href="https://github.com/sst/opencode"><img src="https://img.shields.io/badge/OpenCode-F3F4F6?style=flat&amp;logo=github&amp;logoColor=111827" alt="OpenCode"></a>
  <a href="https://github.com/QwenLM/qwen-code"><img src="https://img.shields.io/badge/Qwen_Code-F3F4F6?style=flat&amp;logo=alibabacloud&amp;logoColor=111827" alt="Qwen Code"></a>
  <a href="https://github.com/All-Hands-AI/OpenHands"><img src="https://img.shields.io/badge/OpenHands-F3F4F6?style=flat&amp;logo=github&amp;logoColor=111827" alt="OpenHands"></a>
  <a href="https://github.com/NousResearch/hermes-agent"><img src="https://img.shields.io/badge/Hermes_Agent-F3F4F6?style=flat&amp;logo=github&amp;logoColor=111827" alt="Hermes Agent"></a>
  <a href="https://aider.chat"><img src="https://img.shields.io/badge/Aider-F3F4F6?style=flat&amp;logo=git&amp;logoColor=111827" alt="Aider"></a>
  <a href="https://github.com/Kilo-Org/kilocode"><img src="https://img.shields.io/badge/Kilo_Code-F3F4F6?style=flat&amp;logo=github&amp;logoColor=111827" alt="Kilo Code"></a>
  <a href="https://github.com/deepseek-ai/deepseek-harness"><img src="https://img.shields.io/badge/DeepSeek_Harness-F3F4F6?style=flat&amp;logo=github&amp;logoColor=111827" alt="DeepSeek Harness"></a>
  <a href="https://github.com/features/copilot"><img src="https://img.shields.io/badge/GitHub_Copilot-F3F4F6?style=flat&amp;logo=githubcopilot&amp;logoColor=111827" alt="GitHub Copilot"></a>
  <a href="https://factory.ai"><img src="https://img.shields.io/badge/Factory_Droid-F3F4F6?style=flat&amp;logo=robotframework&amp;logoColor=111827" alt="Factory Droid"></a>
  <a href="https://github.com/MoonshotAI/kimi-cli"><img src="https://img.shields.io/badge/Kimi_Code-F3F4F6?style=flat&amp;logo=github&amp;logoColor=111827" alt="Kimi Code"></a>
  <a href="https://langchain.com"><img src="https://img.shields.io/badge/LangChain-F3F4F6?style=flat&amp;logo=langchain&amp;logoColor=111827" alt="LangChain"></a>
  <a href="https://ai.pydantic.dev"><img src="https://img.shields.io/badge/PydanticAI-F3F4F6?style=flat&amp;logo=pydantic&amp;logoColor=111827" alt="PydanticAI"></a>
  <a href="https://github.com/huggingface/smolagents"><img src="https://img.shields.io/badge/smolagents-F3F4F6?style=flat&amp;logo=huggingface&amp;logoColor=111827" alt="smolagents"></a>
  <img src="https://img.shields.io/badge/%2B_any_local--endpoint_client-F3F4F6?style=flat" alt="Any local-endpoint client">
</p>

Five Tier-1 agents are exercised end-to-end on real weights before release.
See the [tested compatibility matrix](https://rapidmlx.com/docs/matrix.html)
for exact API coverage and setup status.

---

## Install

### Desktop — macOS (Apple Silicon)

The easiest way to chat locally, manage models, and use vision, files, voice,
and image generation from one app.

- [Download Rapid-MLX Desktop](https://rapidmlx.com/desktop)
- [Browse signed Desktop releases](https://github.com/raullenchai/Rapid-MLX/releases?q=rapid-mac-v)
- Requires an M-series Mac; Windows and Linux desktop builds are not available yet

### CLI and server — macOS (Apple Silicon)

```bash
# Homebrew — prebuilt bottle from homebrew-core
brew install rapid-mlx

# Or the guided installer — detects RAM and recommends a starter model
curl -fsSL https://rapidmlx.com/install.sh | bash
```

Both install the same `rapid-mlx` CLI. Prefer `uv` or `pip`, or want to verify
the installer before running it? See [alternative install methods](#alternative-install-methods)
and [install security](SECURITY.md).

The guided installer prints a serve command sized to your Mac (8–15 GB → `lfm2.5-2.6b-4bit`; 16–17 GB → `qwen3.5-4b-4bit`; 18–23 GB → `qwen3.5-9b-4bit`; 24–31 GB → `bonsai-27b-2bit`; 32 GB+ → `qwen3.8-27b-4bit`).

---

## Quick Start (60 seconds)

**1. Chat with a model right now:**

```bash
rapid-mlx chat
```

Defaults to `qwen3.5-4b-4bit`. First run downloads the weights (~3 GB) with a progress bar and drops you into a REPL. Type `/help` for slash commands, `/exit` to quit.

**2. Or serve it for use from other apps:**

```bash
rapid-mlx serve qwen3.5-4b-4bit
```

Starts an OpenAI-compatible HTTP server bound to `http://localhost:8000`. Point any client that supports a local custom endpoint (Aider, LangChain, OpenCode, PydanticAI, your own scripts) at **`http://localhost:8000/v1`**; Claude Code / Anthropic SDK uses **`http://localhost:8000`** (the Anthropic messages route lives at `/v1/messages` under the same host).

```bash
curl http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"default","messages":[{"role":"user","content":"Say hello"}]}'
```

```python
from openai import OpenAI
client = OpenAI(base_url="http://localhost:8000/v1", api_key="not-needed")
print(client.chat.completions.create(
    model="default",
    messages=[{"role": "user", "content": "Say hello"}],
).choices[0].message.content)
```

**3. Or wire up your coding agent — one command:**

```bash
rapid-mlx launch claude-code
```

With a server running (step 2), this patches Claude Code's local config (`~/.claude/settings.json`) to route at `http://localhost:8000` — no manual env vars, no editing JSON by hand. You get a fully local Claude Code: `$0` per token, nothing leaves your Mac. Swap in `cline` or `continue-dev` for the other IDE clients, or run `rapid-mlx launch list` to see what's detected on this machine.

> **Cursor:** Cursor currently routes BYOK requests through its own servers, so its servers cannot reach a Rapid-MLX endpoint on `localhost`. Rapid-MLX therefore does not generate a Cursor localhost config. If you intentionally expose the server through a public HTTPS tunnel, set `RAPID_MLX_API_KEY=your-secret` for both `rapid-mlx serve ...` and `rapid-mlx launch cursor --server-url https://your-public-host`. This is no longer a fully local connection; never expose an unauthenticated server. Rapid-MLX rejects explicit local/private addresses but cannot verify reachability from Cursor's network, whose DNS view may differ from your Mac.

> **Vision / audio / video / diffusion models?** Base install is text-only (~460 MB). Vision, audio (TTS, STT, voice cloning), video generation, embeddings, and DFlash speculative decoding ship as opt-in extras. → [Optional extras](https://rapidmlx.com/docs/extras.html)

> **Not into the terminal?** [**Rapid-MLX Desktop**](https://rapidmlx.com/desktop) bundles the same engine inside a one-click Mac app.

---

## Video generation

Run text-to-video or image-to-video locally through the OpenAI-compatible
Videos API. Three backends ship — **Wan 2.1 / 2.2**, **CogVideoX-Fun** and
**LTX-2.3** — across 8 registered checkpoints. `wan2.2-ti2v-5b-q8` is the
recommended starting point: smallest of the Wan set, and TI2V means one
checkpoint does both text-to-video and image-to-video.

Requires Python 3.11+ (the video runtime does not support 3.10; core text and
audio still do) and `ffmpeg` for the final MP4 mux.

```bash
pip install 'rapid-mlx[video]'
brew install ffmpeg
rapid-mlx serve wan2.2-ti2v-5b-q8
```

Create and download a clip:

```bash
curl http://localhost:8000/v1/videos \
  -F model=wan2.2-ti2v-5b-q8 \
  -F 'prompt=A fox running through fresh snow, cinematic tracking shot' \
  -F seconds=1 \
  -F size=832x512

# Poll until GET /v1/videos/VIDEO_ID reports "status": "completed", then:
curl http://localhost:8000/v1/videos/VIDEO_ID/content -o output.mp4
```

The create call returns a job immediately. Poll `GET /v1/videos/VIDEO_ID`
until `status` is `completed`. Add `-F input_reference=@start.png` for
image-to-video.

Generation is serialized — one clip at a time — because two diffusion
pipelines resident at once will exhaust unified memory. Expect minutes of
compute per second of footage, not real time.

→ [Every checkpoint, RAM requirement and tuning knob](https://rapidmlx.com/docs/models/families/video.html)

---

## Audio: speech, transcription, voice cloning

44 audio aliases behind the OpenAI-compatible `/v1/audio/*` endpoints — any
OpenAI SDK works unchanged.

```bash
pip install 'rapid-mlx[audio]'

# Text to speech
rapid-mlx serve kokoro
curl http://localhost:8000/v1/audio/speech \
  -H "Content-Type: application/json" \
  -d '{"model":"kokoro","input":"hello from rapid-mlx"}' --output hello.wav

# Transcription (Whisper / Parakeet / SenseVoice)
rapid-mlx serve whisper-large-v3-turbo
curl http://localhost:8000/v1/audio/transcriptions \
  -F file=@hello.wav -F model=whisper-large-v3-turbo
```

Beyond the basics, three things you may not expect to run locally:

- **Zero-shot voice cloning** from a reference clip. `indextts` is the only
  one that takes the clip alone; `qwen3-tts-clone`, `f5-tts-zh` and
  `chatterbox` all require `ref_text` (the clip's exact transcript) paired
  with `ref_audio`, and the request is rejected before generation if it is
  missing.
- **Voice design** — `qwen3-tts-voicedesign` has no named speakers at all.
  Describe the voice you want in natural language via `instructions`
  (timbre, gender, age, accent, emotion, prosody) and it synthesises it.
- **Forced alignment** — `qwen3-aligner` takes audio *plus the transcript you
  already have* and returns per-character timings. It never guesses at the
  words, so it cannot mis-hear them; that is what karaoke captions and
  beat-synced editing need.

Also: word-level timestamps on transcription, and local text-to-music at
`/v1/audio/music`.

→ [All 44 aliases across 13 families](https://rapidmlx.com/docs/models/families/audio.html)

---

## Why Rapid-MLX

| | |
|---|---|
| **Apple-Silicon-native** | Pure MLX kernels — no llama.cpp fallback, no Metal shim. Continuous batching, prompt cache (radix + DeltaNet RNN snapshots), and a quantized live KV cache (int4/int8 on the continuous-batching cache + TurboQuant K8V4 codec) run at native MLX bandwidth on M1 → M4. |
| **Drop-in OpenAI / Anthropic API** | `/v1/chat/completions`, `/v1/responses` (Codex CLI), `/v1/messages` (Anthropic SDK / Claude Code), `/v1/embeddings`, `/v1/audio/*`, `/v1/videos` — same wire as ChatGPT / Claude, no client adapter. |
| **First-class ecosystem coverage** | 12 agent CLIs and 3 Python frameworks are wire-verified against real weights every release (5 are Tier-1, re-verified on current binaries) — Codex CLI, Claude Code, OpenCode, Qwen Code, OpenHands, Hermes Agent, Aider, Kilo Code, DeepSeek Harness, GitHub Copilot, Factory Droid, Moonshot Kimi Code + LangChain, PydanticAI, smolagents. |

→ [Full feature breakdown](https://rapidmlx.com/docs/index.html)

---

## Use Cases

| | | |
|---|---|---|
| **Chat in the terminal** | `rapid-mlx chat qwen3.5-9b-4bit` | Streaming REPL, `/help` for slash commands, `--think` / `--no-think` to control CoT. |
| **OpenAI server for your apps** | `rapid-mlx serve qwen3.5-9b-4bit` | Point Aider, LibreChat, Open WebUI, or LangChain at `http://localhost:8000/v1`. |
| **Agent backends** | `rapid-mlx serve qwen3.6-35b-8bit &`<br>`rapid-mlx agents codex --setup && codex` | 10 agents auto-configure via `agents <name> --setup` once the server is up (12 wire-verified total, 5 Tier-1) — see [Agent support](#agent-support). |
| **Benchmark your Mac** | `rapid-mlx bench qwen3.5-9b-4bit --submit` | Standardized B=1 bench, opens a PR to publish your row on [rapidmlx.com](https://rapidmlx.com). |

→ [One-shot IDE setup](https://rapidmlx.com/docs/cli.html#launch) with `rapid-mlx launch <claude-code|cline|continue-dev>`

---

## Agent Support

All 12 agents below are wire-verified against real weights every release via their own integration-test cell. Of these, five are **Tier-1** — **Claude Code, Codex CLI, Hermes, Aider, and DeepSeek Harness** — re-verified end-to-end against the *current* client binary every release, with one guardian per API wire (Anthropic `/v1/messages`, OpenAI `/v1/responses`, and `/v1/chat/completions` covered for tool-calling depth, reach, and DeepSeek's own harness protocol). The o

> _README 过长已截断, 完整内容请查看 GitHub 仓库。_
