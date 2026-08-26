<p align="center">
  <h1 align="center">🧠⚡ Claude Code Local</h1>
  <p align="center">
    <strong>Run Claude Code 100% on-device with local AI on Apple Silicon.<br>No cloud, no API key, no proxy — an MLX-native server that speaks the Anthropic API.<br>🥊 Pick your fighter: Hermes 4 14B · Gemma 4 31B · Muse-Glimmer 30B · Qwen 3.8 27B bf16 · Llama 3.3 70B · Qwen 3.5 122B · DeepSeek V4 Flash (1M context via <a href="#-deepseek-v4-flash-via-ds4"><code>ds4</code></a>).</strong>
  </p>
  <p align="center">
    <a href="https://github.com/nicedreamzapp/claude-code-local/stargazers"><img src="https://img.shields.io/github/stars/nicedreamzapp/claude-code-local?style=for-the-badge&logo=github&color=f5c542&labelColor=1f2328" alt="GitHub stars"></a>
    <a href="https://github.com/nicedreamzapp/claude-code-local/network/members"><img src="https://img.shields.io/github/forks/nicedreamzapp/claude-code-local?style=for-the-badge&logo=github&color=4c9a2a&labelColor=1f2328" alt="GitHub forks"></a>
    <a href="#-the-lineup--pick-your-fighter"><img src="https://img.shields.io/badge/🥊_Lineup-7_Models-red?style=for-the-badge" alt="7 Models"></a>
    <a href="https://nicedreamzapp.github.io/agent12/"><img src="https://img.shields.io/badge/🏆_Agent--12-Local_Agent_Leaderboard-gold?style=for-the-badge" alt="Agent-12 leaderboard"></a>
    <a href="#-benchmarks"><img src="https://img.shields.io/badge/⚡_Qwen_3.5-65_tok%2Fs-brightgreen?style=for-the-badge" alt="Qwen 3.5 speed"></a>
    <a href="#-benchmarks"><img src="https://img.shields.io/badge/🚀_Claude_Code_Task-17.6s-blue?style=for-the-badge" alt="Claude Code task time"></a>
    <a href="#-privacy--how-the-data-flows"><img src="https://img.shields.io/badge/🔒_Privacy-100%25_Local-success?style=for-the-badge" alt="100% Local"></a>
    <a href="docs/VOICE-MODE.md"><img src="https://img.shields.io/badge/🎤_Voice-Hands_Free-orange?style=for-the-badge" alt="Hands-Free Voice"></a>
    <a href="LICENSE"><img src="https://img.shields.io/badge/📜_License-MIT-yellow?style=for-the-badge" alt="MIT"></a>
    <a href="https://discord.gg/ZdSqgAxUW"><img src="https://img.shields.io/discord/1497121921580404818?label=NiceDreamzApps&logo=discord&color=5865F2&style=for-the-badge" alt="Join the NiceDreamzApps Discord"></a>
  </p>
  <p align="center">
    <a href="#-hit-your-claude-usage-limit">🛑 Usage Limit</a> ·
    <a href="#-what-is-this">🤔 What Is This</a> ·
    <a href="#-quick-start-one-command">🚀 Quick Start</a> ·
    <a href="#-which-model-should-i-run--the-agent-12-leaderboard">🏆 Leaderboard</a> ·
    <a href="#-the-lineup--pick-your-fighter">🥊 Lineup</a> ·
    <a href="#-the-modes">🎮 Modes</a> ·
    <a href="#-privacy--how-the-data-flows">🔒 Privacy</a> ·
    <a href="#-benchmarks">📊 Benchmarks</a> ·
    <a href="docs/VOICE-MODE.md">🎤 Voice</a> ·
    <a href="docs/BROWSER-AGENT.md">🌐 Browser</a> ·
    <a href="docs/PHONE-CONTROL.md">📱 Phone</a> ·
    <a href="docs/MCP-SERVERS.md">🔌 MCP</a> ·
    <a href="#-whats-next">🛣️ Roadmap</a>
  </p>
</p>

---

## 🛑 Hit your Claude usage limit?

If Claude Code just told you **"you've reached your usage limit"** and gave you a reset time hours away, that's what this is for. You keep working — same Claude Code, same terminal, same project — except the model answering is running on your own Mac.

```bash
curl -fsSL https://raw.githubusercontent.com/nicedreamzapp/claude-code-local/main/install.sh | bash
```

No API key. No second subscription. No waiting until 3pm. It works on a **16 GB MacBook** and gets better the more RAM you have — [see what runs on your Mac](#-what-you-need).

<p align="center">
  <img src="assets/demo.gif" width="900" alt="Claude Code editing a file with Gemma 4 31B running locally on a Mac, no cloud">
</p>

<p align="center">
  <em>Real session, unedited. Claude Code reads and edits the file — the model answering is Gemma 4 31B on the laptop.</em>
</p>

---

## 🤔 What Is This?

Your Mac has a powerful GPU built right into the chip. This project uses that GPU to run **massive AI models — the same kind that power ChatGPT and Claude — entirely on your computer**, and plugs them into Claude Code so the whole coding experience works offline.

No internet, no subscription, nobody sees your code — and it's the full Claude Code experience: edit files, manage projects, drive your browser, or run a hands-free voice session.

**The trick:** Claude Code speaks the **Anthropic API**. Local model servers speak the **OpenAI API**. So everyone bolts a translation proxy in between — and the proxy is slow and fragile. This server speaks Anthropic natively. One process, zero translations:

| 🐌 What everyone else does | 🚀 What we did |
|---|---|
| Claude Code → **Proxy** → Ollama → Model | Claude Code → **Our Server** → Model |
| 3 processes, 2 API translations | **1 process, 0 translations** |
| 133 seconds per task | **17.6 seconds per task** |

> 🎯 That one change — **eliminating the proxy** — made it **7.5× faster**.

---

## 🎬 Watch It Run — AirGap AI

**A real NDA. Llama 3.3 70B. Wi-Fi physically OFF. `lsof` running live.** Watch a 70-billion-parameter model audit a confidential legal document, on-device, with the receipts on screen.

<p align="center">
  <a href="https://www.youtube.com/watch?v=V_J1LpNGwmY">
    <img src="https://img.youtube.com/vi/V_J1LpNGwmY/maxresdefault.jpg" width="720" alt="AirGap AI — Wi-Fi OFF NDA Demo">
  </a>
</p>

<p align="center">
  <em>AirGap is this whole build running as one private workstation — a capability, not a product. Everything you need is in this repo. If your firm needs one built, <a href="https://nicedreamzwholesale.com/airgap/">here's what it looks like</a>.</em>
</p>

**More local-AI demos on the channel:**

| Video | What happens |
|---|---|
| [🌌 The Rematch](https://www.youtube.com/watch?v=03KVQmEx13Q) | 4 AI engines build northern lights, 3 fully local — the local challenger painted the best aurora |
| [🏁 Hexagon Shootout](https://www.youtube.com/watch?v=2KeTDDodE0A) | Gemma 31B vs Llama 70B vs cloud Claude, same physics prompt, live counters — 2 of 3 with zero cloud calls |
| [🐳 DeepSeek Three-Way](https://youtu.be/7l8-s8xkpms) | DeepSeek V4 Flash local beats cloud Claude on wall-clock, same MacBook |
| [🎤 NarrateClaude](https://www.youtube.com/watch?v=4ETqEjjopUk) | Speak to Claude Code, hear replies in a cloned voice — 100% on-device |
| [🏠 Mac mini as home AI](https://www.youtube.com/watch?v=PLbV4QtFmFY) | Chat with the Mac mini at home from any browser on any phone |

---

## 🏆 Which model should I run? — The Agent-12 Leaderboard

The question every issue here eventually asks. So we measure it. **[Agent-12](https://nicedreamzapp.github.io/agent12/)** runs each local model through real agent tasks in a sandboxed working directory, judged by what ends up on the filesystem, never by the model's prose. Temperature 0, fixed caps, fresh sandbox per task, one variable moved per comparison. Tasks, judges, runner and the judge-validation gate are all open at [github.com/nicedreamzapp/agent12](https://github.com/nicedreamzapp/agent12).

| Model | Easy (12) | time | Hard (8) | time | tok/s |
|---|:---:|:---:|:---:|:---:|:---:|
| 🏆 **Qwen3.6-35B-A3B** (MLX 8-bit) | **12/12** | 64s | **8/8** | 125s | 46 |
| Qwen3-Coder-30B-A3B (MLX 8-bit) | 12/12 | 43s | 7/8 | 392s | 84 |
| Gemma 4 31B (MLX 4-bit) | 11/12 | 92s | 8/8 | 348s | 26 |
| DeepSeek V4 Flash (2-bit, 0731 imatrix, `ds4`) | 12/12 | 203s | 8/8 | 551s | 8.4 |
| Qwen3.8-27B (MLX 8-bit, dense) | 12/12 | 351s | 7/8 | 1156s | — |
| *Claude Sonnet 5 (cloud, reference only)* | 12/12 | 122s | 8/8 | 131s | — |

All local rows: Apple M5 Max, 128 GB. The headline: the local champion clears the same hard suite as cloud Claude, and does it **faster on wall-clock** (125s vs 131s) because there is no network in the loop. Read the launch story: [*I took down six of my own benchmark videos, then built the leaderboard*](https://nicedreamzwholesale.com/2026/08/10/i-took-down-six-of-my-own-benchmark-videos-then-i-built-the-local-agent-leaderboard/) · [71-second video](https://youtu.be/O0yWqc46tGM).

Qwen 3.8 reaches 8/8 hard when given an 8000-token budget, but at 16.9× Qwen3.6's wall-clock ([full writeup](https://github.com/nicedreamzapp/agent12/blob/main/writeups/qwen38_vs_qwen36.md)). Muse-Glimmer 30B and Nemotron Omni are listed on the board in a separate **vendor-reported** section with Meta's and NVIDIA's own published numbers, credited and linked, until they get a real Agent-12 run.

---

## 🥊 The Lineup — Pick Your Fighter

We started with one model. Now we ship a **roster** — and it's a **living lineup**: we're builders, this repo is always testing and updating, and new fighters get added the day they drop and benchmarked as we run them. Same MLX server, same Anthropic API — swap one env var and you swap the brain. Plus the `ds4` engine for DeepSeek V4 Flash via its own native Metal runtime.

| | 🟡 **Hermes 4 14B** | 🟢 **Gemma 4 31B** | ✨ **Muse-Glimmer 30B** | 🟣 **Qwen 3.8 27B** 🆕 | 🟠 **Llama 3.3 70B** | 🔵 **Qwen 3.5 122B** | 🐳 **DeepSeek V4 Flash** ⭐ |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| Nickname | **The One That Runs On Your Laptop** | The Quick One | The Fresh Agent | **The Full-Precision Sprinter** | The Wise One | The Beast | The 1M-Context Whale |
| Build | 4-bit abliterated | 4-bit IT abliterated | 8-bit abliterated (in-house) | **bf16, nothing quantized** + DFlash 2 drafter | 8-bit abliterated | 4-bit MoE (A10B) | 2-bit asymmetric (ds4 GGUF) |
| Speed | not benchmarked yet | ~15 tok/s | **~18 tok/s** | **36.5 tok/s** (9.7 without the drafter) | ~7 tok/s | **65 tok/s** 🚀 | ~32 tok/s |
| Params | 14 B dense (Qwen3 base) | 31 B dense | ~30 B | 27 B dense | 71 B dense | 122 B / 10 B active | **284 B / 37 B active** |
| Context | 40 K | 128 K | 128 K | **262 K** | 128 K | 256 K | **1 M tokens** |
| RAM | ~8 GB | ~18 GB | ~30 GB | ~59 GB (55 weights + 4 drafter) | ~70 GB | ~75 GB | ~81 GB |
| Min RAM to run | **16 GB** | 32 GB | 48 GB | 96 GB | 96 GB | 96 GB | 128 GB |
| Best at | Everyday edits on a stock MacBook | Daily coding | Vision + agentic tool use, uncensored | Full-precision coding + vision at quantized speed | Hardest reasoning, full precision | Max throughput, active sparsity | Long context, agentic loops |
| Engine | MLX Native | MLX Native | MLX Native | [`mlx-dspark`](https://github.com/ARahim3/mlx-dspark) (MLX + DFlash 2) | MLX Native | MLX Native | [`antirez/ds4`](https://github.com/antirez/ds4) |
| Launcher | `Claude Local.command` | `Gemma 4 Code.command` | *coming* | *coming* | `Llama 70B.command` | `Claude Local.command` | `DeepSeek V4 Flash.app` |

> 🟣 **Qwen 3.8 27B just landed (Aug 20, 2026) — and we run it at full bf16.** Alibaba's new 27B dense model (Apache 2.0, native image + video input, 262K context) is the first small model we'd put next to the cloud ones, so we refused to quantize it. The trick that makes bf16 livable is **[DFlash 2](https://inco.ai/blog/dflash2/)**, a speculative-decoding drafter from Inco AI / Z Lab: a 2B draft model proposes a block of tokens, the 27B verifies the block in one pass, and the output is **byte-identical** to plain decoding. Measured on our M5 Max 128 GB, same prompt, 600 tokens, greedy: **9.7 tok/s plain → 36.5 tok/s with DFlash 2** (3.8×, 4.4 accepted tokens per round). Weights: [`mlx-community/Qwen3.8-27B-bf16`](https://huggingface.co/mlx-community/Qwen3.8-27B-bf16) (54.7 GB) + drafter [`incoai/Qwen3.8-27B-DFlash2`](https://huggingface.co/incoai/Qwen3.8-27B-DFlash2) (3.8 GB), served by [`mlx-dspark`](https://github.com/ARahim3/mlx-dspark) (`pip install mlx-dspark`, OpenAI-compatible API). Two tips that survived a night of testing: keep the draft block at 5 on Metal (4/6/7/10 were all slower for us and for others), and drop the community **[Sharp chat template](https://huggingface.co/peculiar-ragdoll/Qwen-Sharp-Chat-Templates)** into the model folder — it fixes the stock template's empty-think aborts, defaults reasoning to `medium` instead of `xhigh`, and makes the model lead with the answer. Vision works through `mlx-vlm` (no drafter on that path yet). Claude Code launcher is next on the list.
>
> 🧪 **Muse-Glimmer just landed (Aug 2026)** — Meta's new agentic 30B, [abliterated in-house](#-our-own-mlx-abliterated-uploads) (our first self-abliteration). Decode speed is measured — **~18 tok/s** on an M-series Max, 8-bit (a touch quicker than Gemma 4 31B).
>
> 👁️ **Now with vision** via the [`-MM-bf16`](https://huggingface.co/divinetribe/Muse-Glimmer-30B-Abliterated-MM-bf16) build — **[watch it read a chart, a neon sign and a blurred car badge](https://www.youtube.com/watch?v=5fs_FfkCaDA)**. Details in [our uploads](#-our-own-mlx-abliterated-uploads).

> 💻 **Got a 16 GB MacBook Air?** Start with Hermes. `setup.sh` picks it for you automatically — you don't need 96 GB of RAM to use this.

> 💡 **Fun fact:** Qwen wins raw speed because it's an MoE — only 10B of 122B params activate per token. DeepSeek V4 Flash is even bigger (284B) but only ~37B active per token, *and* it ships with on-disk KV cache so a 25k-token Claude Code system prompt prefills exactly once, ever.

### 🐳 DeepSeek V4 Flash via `ds4`

We tested it the day Antirez (the Redis guy) shipped `ds4`. **Local DeepSeek beat cloud Claude on wall-clock time** on the same MacBook, same prompt — [watch the three-way](https://youtu.be/7l8-s8xkpms).

| | |
|---|---|
| 🧠 **Engine** | [`antirez/ds4`](https://github.com/antirez/ds4) — pure C + Metal kernels, ~few thousand lines |
| 🤗 **Weights** | [`antirez/deepseek-v4-gguf`](https://huggingface.co/antirez/deepseek-v4-gguf) (q2: 81 GB, q4: 153 GB) |
| 📦 **Server wrapper** | `~/.local/bin/ds4-server-up` (boots on demand) |
| 🚀 **Claude Code wrapper** | `~/.local/bin/claude-ds4` (drop-in replacement for `claude`) |
| 📏 **Context** | 1 M tokens; 200 K is sane for most agent runs |
| 💾 **Disk KV cache** | Persists across restarts — first prefill is the only one that ever happens |

### ⭐ Our Own MLX Abliterated Uploads

The models in this lineup aren't from generic mirrors — **we package and upload our own abliterated MLX builds** to HuggingFace so anyone running this repo can pull them with one command. Browse the full set at [huggingface.co/divinetribe](https://huggingface.co/divinetribe).

```bash
# Llama 3.3 70B — full-precision feel
MLX_MODEL=divinetribe/Llama-3.3-70B-Instruct-abliterated-8bit-mlx \
  bash scripts/start-mlx-server.sh

# Gemma 4 31B — fast daily driver
MLX_MODEL=divinetribe/gemma-4-31b-it-abliterated-4bit-mlx \
  bash scripts/start-mlx-server.sh

# Hermes 4 14B — sweet spot for 16/32 GB Macs
MLX_MODEL=divinetribe/Hermes-4-14B-abliterated-4bit-mlx \
  bash scripts/start-mlx-server.sh

# Muse-Glimmer 30B — Meta's new agentic model, abliterated in-house
MLX_MODEL=divinetribe/Muse-Glimmer-30B-Abliterated-8bit \
  bash scripts/start-mlx-server.sh
```

Every public model on [huggingface.co/divinetribe](https://huggingface.co/di

> _README 过长已截断, 完整内容请查看 GitHub 仓库。_
