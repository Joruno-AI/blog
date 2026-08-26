<div align="center">

<img src="assets/banner.png" alt="ClawRouter Banner" width="600">

<h1>The LLM router built for autonomous agents</h1>

<p>Agents can't sign up for accounts. Agents can't enter credit cards.<br>
Agents can only sign transactions.<br><br>
<strong>ClawRouter is the only LLM router that lets agents operate independently.</strong><br><br>
<em><!-- br:models.free -->5<!-- /br:models.free --> models free, no crypto required. No signup. No API key. No credit card.</em></p>

<br>

<img src="https://img.shields.io/badge/🆓_5_Free_Models-success?style=for-the-badge" alt="5 free models">&nbsp;
<img src="https://img.shields.io/badge/🤖_Agent--Native-black?style=for-the-badge" alt="Agent native">&nbsp;
<img src="https://img.shields.io/badge/🔑_Zero_API_Keys-blue?style=for-the-badge" alt="No API keys">&nbsp;
<img src="https://img.shields.io/badge/⚡_Local_Routing-yellow?style=for-the-badge" alt="Local routing">&nbsp;
<img src="https://img.shields.io/badge/💰_x402_USDC-purple?style=for-the-badge" alt="x402 USDC">&nbsp;
<img src="https://img.shields.io/badge/🔓_Open_Source-green?style=for-the-badge" alt="Open source">

[![npm version](https://img.shields.io/npm/v/@blockrun/clawrouter.svg?style=flat-square&color=cb3837)](https://npmjs.com/package/@blockrun/clawrouter)
[![npm downloads](https://img.shields.io/npm/dm/@blockrun/clawrouter.svg?style=flat-square&color=blue)](https://npmjs.com/package/@blockrun/clawrouter)
[![GitHub stars](https://img.shields.io/github/stars/BlockRunAI/ClawRouter?style=flat-square&label=GitHub%20stars)](https://github.com/BlockRunAI/ClawRouter)
[![CI](https://img.shields.io/github/actions/workflow/status/BlockRunAI/ClawRouter/ci.yml?branch=main&style=flat-square&label=CI)](https://github.com/BlockRunAI/ClawRouter/actions)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

[![USDC Hackathon Winner](https://img.shields.io/badge/🏆_USDC_Hackathon-Agentic_Commerce_Winner-gold?style=flat-square)](https://x.com/USDC/status/2021625822294216977)
[![x402 Protocol](https://img.shields.io/badge/x402-Micropayments-purple?style=flat-square)](https://x402.org)
[![Base Network](https://img.shields.io/badge/Base-USDC-0052FF?style=flat-square&logo=coinbase&logoColor=white)](https://base.org)
[![Solana](https://img.shields.io/badge/Solana-USDC-9945FF?style=flat-square&logo=solana&logoColor=white)](https://solana.com)
[![OpenClaw Plugin](https://img.shields.io/badge/OpenClaw-Plugin-orange?style=flat-square)](https://openclaw.ai)
[![Telegram](https://img.shields.io/badge/Telegram-Community-26A5E4?style=flat-square&logo=telegram)](https://t.me/blockrunAI)

</div>

> **ClawRouter** is an open-source smart LLM router that reduces AI API costs by up to <!-- br:savings.autoVsBaselinePct -->88<!-- /br:savings.autoVsBaselinePct -->%. It analyzes each request across <!-- br:clawrouter.dimensions -->15<!-- /br:clawrouter.dimensions --> dimensions and routes to the cheapest capable model in under 1ms, entirely locally. ClawRouter is the only LLM router built for autonomous AI agents — it uses wallet signatures for authentication (no API keys) and USDC micropayments via the x402 protocol (no credit cards). <!-- br:models.chatVisible -->71<!-- /br:models.chatVisible --> models from OpenAI, Anthropic, Google, xAI, DeepSeek, and more. MIT licensed.

---

## Why ClawRouter exists

Every other LLM router was built for **human developers** — create an account, get an API key, pick a model from a dashboard, pay with a credit card.

**Agents can't do any of that.**

ClawRouter is built for the agent-first world:

- **Starts at $0** — <!-- br:models.free -->5<!-- /br:models.free --> NVIDIA models are free forever (incl. 1M-context DeepSeek V4 Flash + a vision-capable Nemotron Omni)
- **No accounts** — a wallet is generated locally, no signup
- **No API keys** — your wallet signature IS authentication
- **No model selection** — <!-- br:clawrouter.dimensions -->15<!-- /br:clawrouter.dimensions -->-dimension scoring picks the right model automatically
- **No credit cards** — agents pay per-request with USDC via [x402](https://x402.org)
- **No trust required** — runs locally, <1ms routing, zero external dependencies

This is the stack that lets agents operate autonomously: **x402 + USDC + local routing**.

---

## How it compares

|                  | OpenRouter        | LiteLLM          | Martian           | Portkey           | **ClawRouter**                                                         |
| ---------------- | ----------------- | ---------------- | ----------------- | ----------------- | ---------------------------------------------------------------------- |
| **Models**       | 200+              | 100+             | Smart routing     | Gateway           | **<!-- br:models.chatVisible -->71<!-- /br:models.chatVisible -->**    |
| **Free tier**    | Rate-limited      | BYO keys         | No                | No                | **<!-- br:models.free -->5<!-- /br:models.free --> models, no signup** |
| **Routing**      | Manual selection  | Manual selection | Smart (closed)    | Observability     | **Smart (open source)**                                                |
| **Auth**         | Account + API key | Your API keys    | Account + API key | Account + API key | **Wallet signature**                                                   |
| **Payment**      | Credit card       | BYO keys         | Credit card       | $49-499/mo        | **USDC per-request**                                                   |
| **Runs locally** | No                | Yes              | No                | No                | **Yes**                                                                |
| **Open source**  | No                | Yes              | No                | Partial           | **Yes**                                                                |
| **Agent-ready**  | No                | No               | No                | No                | **Yes**                                                                |

✓ Open source · ✓ Smart routing · ✓ Runs locally · ✓ Crypto native · ✓ Agent ready

**We're the only one that checks all five boxes.**

---

## Quick Start

> **No wallet? <!-- br:models.free -->5<!-- /br:models.free --> models work free out of the box.** Install, run, and pin `free/mistral-nemotron` (or any of the <!-- br:models.free -->5<!-- /br:models.free -->) — no crypto, no signup, no balance required. Add USDC later when you want paid models.

### Option A — OpenClaw Agent

[OpenClaw](https://openclaw.ai) is an AI coding agent. If you're using it, ClawRouter installs as a plugin. **Two paths:**

**A1. Recommended — one-shot install script:**

```bash
curl -fsSL https://blockrun.ai/ClawRouter-update | bash
openclaw gateway restart
```

This handles everything: registration, models config, auth profile, wallet setup. Smart routing (`blockrun/auto`) is now your default model.

**A2. If you prefer pure npm:**

```bash
npm install -g @blockrun/clawrouter
clawrouter setup            # finishes OpenClaw integration — REQUIRED
openclaw gateway restart
```

> ⚠️ **Skipping `clawrouter setup` will leave you broken.** Bare `npm install -g` only puts the package on disk; it does NOT register the plugin with OpenClaw, sync the models allowlist, or write the auth profile. Symptom: `/models` in your bot shows only ~7 entries (OpenClaw's hardcoded defaults) instead of the full ~44 BlockRun models. Run `clawrouter setup` to repair, or use path A1 to begin with.

### Option B — Standalone (continue.dev, Cursor, VS Code, any OpenAI-compatible client)

> **Using Claude Code?** Check out [BRCC](https://blockrun.ai/brcc.md) — it's purpose-built for Claude Code with the same smart routing and x402 payments.
>
> **Using NousResearch Hermes?** See [ClawRouter-Hermes](https://github.com/BlockRunAI/ClawRouter-Hermes) — a Python plugin that wires Hermes into the ClawRouter proxy. Same wallet, same <!-- br:models.chatVisible -->71<!-- /br:models.chatVisible --> models, same x402 USDC settlement on Base & Solana.

No OpenClaw required. ClawRouter runs as a local proxy on port 8402.

**1. Start the proxy**

```bash
npx @blockrun/clawrouter
```

**2. Fund your wallet** — optional, skip for free tier
Your wallet address is printed on first run. For paid models, send a few USDC on Base or Solana — $5 covers thousands of requests. To stay at $0, pin any of the <!-- br:models.free -->5<!-- /br:models.free --> free models (e.g. `free/mistral-nemotron`) or use `/model free` inside OpenClaw.

**3. Point your client at `http://localhost:8402`**

<details>
<summary><strong>continue.dev</strong> — <code>~/.continue/config.yaml</code></summary>

> **Important:** `apiBase` must end with `/v1/` (including the trailing slash). Without it, continue.dev constructs the URL as `/chat/completions` instead of `/v1/chat/completions`, and the proxy returns 404.

```yaml
models:
  - name: ClawRouter Auto
    provider: openai
    model: blockrun/auto
    apiBase: http://localhost:8402/v1/
    apiKey: x402
    roles:
      - chat
      - edit
      - apply
```

To pin a specific model, replace `blockrun/auto` with any model from [blockrun.ai/models](https://blockrun.ai/models), e.g. `anthropic/claude-opus-5`, `xai/grok-4.5`.

Both `provider: openai` and `provider: clawrouter` work — just make sure `apiBase` ends with `/v1/`.

<details>
<summary>Legacy JSON format (<code>~/.continue/config.json</code>)</summary>

```json
{
  "models": [
    {
      "title": "ClawRouter Auto",
      "provider": "openai",
      "model": "blockrun/auto",
      "apiBase": "http://localhost:8402/v1/",
      "apiKey": "x402"
    }
  ]
}
```

</details>
</details>

<details>
<summary><strong>Cursor</strong> — Settings → Models → OpenAI-compatible</summary>

Set base URL to `http://localhost:8402`, API key to `x402`, model to `blockrun/auto`.

</details>

<details>
<summary><strong>Any OpenAI SDK</strong></summary>

```python
from openai import OpenAI
client = OpenAI(base_url="http://localhost:8402", api_key="x402")
response = client.chat.completions.create(model="blockrun/auto", messages=[...])
```

</details>

---

## Routing Profiles

Choose your routing strategy with `/model <profile>`:

| Profile       | Strategy           | Savings                                                                                                                                                                                                                                                                                           | Best For             |
| ------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| `/model free` | Free NVIDIA models | **100%**                                                                                                                                                                                                                                                                                          | $0 balance, learning |
| `/model auto` | Balanced (default) | † Withheld from `/v1/models` — the router still calls it by direct ID, but you will not find it on the public pricing page. See [savings-mix.json](https://github.com/BlockRunAI/blockrun/blob/main/src/brand/savings-mix.json), which prices the published savings claim on visible models only. |

**<!-- br:savings.autoVsBaselinePct -->88<!-- /br:savings.autoVsBaselinePct -->%** | General use |
| `/model eco` | Cheapest possible | **<!-- br:savings.ecoVsBaselinePct -->98<!-- /br:savings.ecoVsBaselinePct -->%** | Maximum savings |
| `/model premium` | Best quality | 0% | Mission-critical |

**Shortcuts:** `/model grok`, `/model br-sonnet`, `/model gpt5`, `/model o3`

---

## How It Works

**100% local routing. <1ms latency. Zero external API calls.**

The scorer weighs <!-- br:clawrouter.dimensions -->15<!-- /br:clawrouter.dimensions --> dimensions of the request:

```
Request → Weighted Scorer → Tier → Best Model → Response
```

| Tier      | ECO Model                               | AUTO Model                              | PREMIUM Model                |
| --------- | --------------------------------------- | --------------------------------------- | ---------------------------- |
| SIMPLE    | step-3.7-flash (**FREE**)               | gemini-2.5-flash ($0.30/$2.50)          | kimi-k2.7 † ($0.95/$4.00)    |
| MEDIUM    | gemini-3.1-flash-lite ($0.25/$1.50)     | kimi-k2.7 ($0.95/$4.00)                 | gpt-5.3-codex ($1.75/$14.00) |
| COMPLEX   | gemini-3.1-flash-lite ($0.25/$1.50)     | gemini-3.1-pro ($2/$12)                 | claude-fable-5 ($10/$50)     |
| REASONING | grok-4-1-fast-reasoning † ($0.20/$0.50) | grok-4-1-fast-reasoning † ($0.20/$0.50) | claude-sonnet-4.6 ($3/$15)   |

**<!-- br:savings.autoVsBaselinePct -->88<!-- /br:savings.autoVsBaselinePct -->% cheaper than pinning Claude Opus 5** for the same traffic, on `auto`; **<!-- br:savings.ecoVsBaselinePct -->98<!-- /br:savings.ecoVsBaselinePct -->%** on `eco`.

Not an "up to" figure. The baseline, the workload mix and the token ratio are
published in [`savings-mix.json`](https://github.com/BlockRunAI/blockrun/blob/main/src/brand/savings-mix.json),
priced against the live catalog, so anyone can recompute it and get the same
answer. Models withheld from `/v1/models` are excluded from the mix — pricing a
public claim on a model you cannot look up is not defensible — which makes the
number conservative.

---

## Image Generation

Generate images directly from chat with `/cr-imagegen`:

```
/cr-imagegen a dog dancing on the beach
/cr-imagegen --model gpt-image-2 a futuristic city at sunset
/cr-imagegen --model banana-pro --size 2048x2048 mountain landscape
```

> The slash command is `/cr-imagegen` to avoid colliding with Telegram channel commands. Typing `/imagegen` in chat still works for backward compatibility.

| Model                        | Provider             | Price        | Max Size  |
| ---------------------------- | -------------------- | ------------ | --------- |
| `nano-banana`                | Google Gemini Flash  | $0.05/image  | 1024x1024 |
| `banana-2`                   | Google Nano Banana 2 | $0.09/image  | 1024x1024 |
| `banana-pro`                 | Google Gemini Pro    | $0.10/image  | 4096x4096 |
| `gpt-image`                  | OpenAI GPT Image 1   | $0.02/image  | 1536x1024 |
| `gpt-image-2`                | OpenAI GPT Image 2   | $0.06/image  | 1536x1024 |
| `seedream`                   | ByteDance Seedream 5 | $0.045/image | 2848x1600 |


> _README 过长已截断, 完整内容请查看 GitHub 仓库。_
