<h1 align="center">
	<a href="https://github.com/mnfst/awesome-free-llm-apis">
		<img src="media/awesome-free-llm-apis.png" width="500" alt="Awesome Free LLM APIs">
	</a>
</h1>

<p align="center">
	<a href="https://awesome.re">
		<img src="https://awesome.re/badge-flat2.svg" alt="Awesome">
	</a>
</p>

<p align="center">LLM APIs with permanent free tiers for text inference.</p>

<p align="center"><sub>All endpoints are OpenAI SDK-compatible unless noted. Each link points to the provider's API key page.</sub></p>

<hr>

<p align="center">
	<a href="https://manifest.build">
		<picture>
			<source media="(prefers-color-scheme: dark)" srcset="media/manifest-logo-dark.png">
			<img src="media/manifest-logo-light.png" width="240" alt="Manifest">
		</picture>
	</a>
</p>

<p align="center"><em>All of those free LLM APIs are available at <a href="https://manifest.build">manifest.build</a> - make reliable agents.</em></p>

## Contents

- [Provider APIs](#provider-apis)
- [Inference providers](#inference-providers)
- [Glossary](#glossary)

## Provider APIs

APIs run by the companies that train or fine-tune the models themselves.

### [Aion Labs](https://www.aionlabs.ai/app/api-keys/) 🇮🇱

Permanent free tier, no credit card required. 15 RPM, 20K tokens/day. Specialized for roleplay and storytelling.

Base URL: `https://api.aionlabs.ai/v1`

| Model Name                       | Context | Max Output | Modality         | Rate Limit      |
| -------------------------------- | ------- | ---------- | ---------------- | --------------- |
| `aion-labs/aion-2.0`             | 128K    | 32K        | Text (reasoning) | 15 RPM, 20K TPD |
| `aion-labs/aion-rp-llama-3.1-8b` | 32K     | 32K        | Text             | 15 RPM, 20K TPD |
| `aion-labs/aion-3.0`             | 128K    | 32K        | Text (reasoning) | 15 RPM, 20K TPD |
| `aion-labs/aion-3.0-mini`        | 128K    | 32K        | Text (reasoning) | 15 RPM, 20K TPD |

### [Cohere](https://dashboard.cohere.com/api-keys) 🇨🇦

Free "Trial" API key, no credit card. 1,000 API calls/month. Non-commercial use only.

Base URL: `https://api.cohere.com/v2`

| Model Name          | Context | Max Output | Modality         | Rate Limit |
| ------------------- | ------- | ---------- | ---------------- | ---------- |
| Command A+ (218B)   | 128K    | 64K        | Text + Image     | 20 RPM     |
| Command A (111B)    | 256K    | 8K         | Text             | 20 RPM     |
| Command R+          | 128K    | 4K         | Text             | 20 RPM     |
| Command R           | 128K    | 4K         | Text             | 20 RPM     |
| Command R7B         | 128K    | 4K         | Text             | 20 RPM     |
| Command A Reasoning | 256K    | 32K        | Text (reasoning) | 20 RPM     |
| Command A Translate | 8K      | 8K         | Text             | 20 RPM     |
| Command A Vision    | 128K    | 8K         | Text + Image     | 20 RPM     |
| Command R7B Arabic  | 128K    | ~4K        | Text             | 20 RPM     |
| Aya Expanse 32B     | 128K    | 4K         | Text             | 20 RPM     |
| Aya Vision 32B      | 16K     | 4K         | Text + Image     | 20 RPM     |

### [Google Gemini](https://aistudio.google.com/app/apikey) 🇺🇸

Free tier, no credit card. Free-tier prompts may be used by Google to improve products. [^1]

Base URL: `https://generativelanguage.googleapis.com/v1beta`

| Model Name            | Context | Max Output | Modality                     | Rate Limit        |
| --------------------- | ------- | ---------- | ---------------------------- | ----------------- |
| Gemini 3.7 Flash      | 1M      | 65K        | Text + Image + Audio + Video | —                 |
| Gemini 3.6 Flash      | 1M      | 65K        | Text + Image + Audio + Video | 15 RPM, 1,500 RPD |
| Gemini 3.5 Flash      | 1M      | 65K        | Text + Image + Audio + Video | 15 RPM, 1,500 RPD |
| Gemini 3.5 Flash-Lite | 1M      | 65K        | Text + Image + Audio + Video | 30 RPM, 1,500 RPD |
| Gemini 3.1 Flash-Lite | 1M      | 65K        | Text + Image + Audio + Video | 30 RPM, 1,500 RPD |
| Gemini 2.5 Flash      | 1M      | 65K        | Text + Image + Audio + Video | 15 RPM, 1,500 RPD |
| Gemini 2.5 Flash-Lite | 1M      | 65K        | Text + Image + Audio + Video | 30 RPM, 1,500 RPD |
| Gemini 2.5 Pro        | 1M      | 65K        | Text + Image + Audio + Video | 5 RPM, 50 RPD     |
| Gemma 4 31B           | 256K    | 32K        | Text                         | —                 |
| Gemma 4 26B A4B       | 256K    | 32K        | Text                         | —                 |

### [Mistral AI](https://console.mistral.ai/api-keys) 🇫🇷

Free mode, enabled by default, no credit card required. $10/month in API credits, and free-mode prompts may be used to train Mistral models unless you opt out. [^13]

Base URL: `https://api.mistral.ai/v1`

| Model Name                | Context | Max Output | Modality            | Rate Limit       |
| ------------------------- | ------- | ---------- | ------------------- | ---------------- |
| Mistral Medium 3.5 (128B) | 256K    | —          | Text + Image + Code | ~1 RPS, 500K TPM |
| Mistral Small 4           | 256K    | —          | Text + Image + Code | ~1 RPS, 500K TPM |
| Mistral Large 3           | 256K    | —          | Multimodal          | ~1 RPS, 500K TPM |
| Ministral 3 8B            | 256K    | —          | Text + Vision       | ~1 RPS, 500K TPM |
| Codestral                 | 128K    | —          | Code                | ~1 RPS, 500K TPM |
| Ministral 3 3B            | 256K    | —          | Text + Vision       | ~1 RPS, 500K TPM |
| Ministral 3 14B           | 256K    | —          | Text + Vision       | ~1 RPS, 500K TPM |

### [Z AI (Zhipu AI)](https://open.bigmodel.cn/usercenter/apikeys) 🇨🇳

Permanent free models, no credit card required. [^12]

Base URL: `https://open.bigmodel.cn/api/paas/v4`

| Model Name                           | Context | Max Output | Modality         | Rate Limit           |
| ------------------------------------ | ------- | ---------- | ---------------- | -------------------- |
| GLM-4.7-Flash                        | 200K    | 128K       | Text (reasoning) | 1 concurrent request |
| GLM-4.5-Flash (retirement announced) | 128K    | 96K        | Text (reasoning) | 1 concurrent request |
| GLM-4.6V-Flash                       | 128K    | 32K        | Multimodal       | 1 concurrent request |

## Inference providers

Third-party platforms that host open-weight models from various sources.

### [Cloudflare Workers AI](https://dash.cloudflare.com/profile/api-tokens) 🇺🇸

10,000 Neurons/day free, no credit card required. 75+ models available on the free tier. [^11]

Base URL: `https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/run`

| Model Name                                     | Context | Max Output        | Modality                       | Rate Limit               |
| ---------------------------------------------- | ------- | ----------------- | ------------------------------ | ------------------------ |
| `@cf/meta/llama-3.3-70b-instruct-fp8-fast`     | 24K     | Shared w/ context | Text                           | 10K neurons/day (shared) |
| `@cf/meta/llama-4-scout-17b-16e-instruct`      | 131K    | Shared w/ context | Multimodal                     | 10K neurons/day (shared) |
| `@cf/openai/gpt-oss-120b`                      | 128K    | Shared w/ context | Text                           | 10K neurons/day (shared) |
| `@cf/google/gemma-4-26b-a4b-it`                | 256K    | Shared w/ context | Text + Vision                  | 10K neurons/day (shared) |
| `@cf/zai-org/glm-4.7-flash`                    | 131K    | Shared w/ context | Text                           | 10K neurons/day (shared) |
| `@cf/mistralai/mistral-small-3.1-24b-instruct` | 128K    | Shared w/ context | Text                           | 10K neurons/day (shared) |
| `@cf/deepseek-ai/deepseek-r1-distill-qwen-32b` | 80K     | Shared w/ context | Text (reasoning)               | 10K neurons/day (shared) |
| + 72 more models                               | Varies  | Varies            | Text, Image, Audio, Embeddings | 10K neurons/day (shared) |

### [Groq](https://console.groq.com/keys) 🇺🇸

Free tier, no credit card. Ultra-fast LPU inference. [^2]

Base URL: `https://api.groq.com/openai/v1`

| Model Name            | Context | Max Output | Modality | Rate Limit        |
| --------------------- | ------- | ---------- | -------- | ----------------- |
| `openai/gpt-oss-120b` | 131K    | 65K        | Text     | 30 RPM, 1,000 RPD |
| `openai/gpt-oss-20b`  | 131K    | 65K        | Text     | 30 RPM, 1,000 RPD |
| `groq/compound`       | 131K    | 8K         | Text     | 30 RPM, 250 RPD   |
| `groq/compound-mini`  | 131K    | 8K         | Text     | 30 RPM, 250 RPD   |
| `qwen/qwen3.6-27b`    | 131K    | 16K        | Text     | 30 RPM, 1,000 RPD |

### [Hugging Face](https://huggingface.co/settings/tokens) 🇺🇸

$0.10/month in Inference Provider credits for free users (subject to change). Routes to Fireworks, Together, Hyperbolic, Nebius, Novita, DeepInfra and others. Thousands of models.

Base URL: `https://router.huggingface.co/v1`

| Model Name                      | Context | Max Output | Modality                       | Rate Limit     |
| ------------------------------- | ------- | ---------- | ------------------------------ | -------------- |
| Meta-Llama-3.1-8B-Instruct      | 128K    | ~4K        | Text                           | Credit-metered |
| gemma-3-4b-it                   | 131K    | ~4K        | Text                           | Credit-metered |
| phi-4                           | 16K     | ~4K        | Text                           | Credit-metered |
| Qwen2.5-Coder-7B-Instruct       | 131K    | ~4K        | Text                           | Credit-metered |
| Qwen2.5-7B-Instruct             | 131K    | ~4K        | Text                           | Credit-metered |
| + thousands of community models | Varies  | Varies     | Text, Image, Audio, Embeddings | Credit-metered |

### [Kilo Code](https://app.kilo.ai/profile) 🇺🇸

Free models with no credit card and no API key required. `kilo-auto/free` auto-router dynamically routes to models in the free pool. [^5]

Base URL: `https://api.kilo.ai/api/gateway`

| Model Name                                           | Context | Max Output | Modality      | Rate Limit |
| ---------------------------------------------------- | ------- | ---------- | ------------- | ---------- |
| `nvidia/nemotron-3-ultra-550b-a55b:free`             | 1M      | 65K        | Text          | 200 req/hr |
| `stepfun/step-3.7-flash:free`                        | 262K    | 262K       | Text + Vision | 200 req/hr |
| `nvidia/nemotron-3-super-120b-a12b:free`             | 262K    | 262K       | Text          | 200 req/hr |
| `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free` | 256K    | 65K        | Multimodal    | 200 req/hr |
| `poolside/laguna-s-2.1:free`                         | 262K    | 32K        | Text (code)   | 200 req/hr |
| `poolside/laguna-xs-2.1:free`                        | 262K    | 32K        | Text (code)   | 200 req/hr |
| `cohere/north-mini-code:free`                        | 256K    | 64K        | Text (code)   | 200 req/hr |
| `openrouter/free`                                    | Varies  | Varies     | Text          | 200 req/hr |
| `tencent/hy3:free`                                   | 262K    | 128K       | Text          | 200 req/hr |
| `nvidia/nemotron-3.5-lightning:free`                 | 1M      | 65K        | Text          | 200 req/hr |
| `liquid/lfm-2.5-2.6b:free`                           | 64K     | 8K         | Text          | 200 req/hr |

### [LLM7.io](https://token.llm7.io) 🇬🇧

API gateway with a free tier. Anonymous access needs no key and reaches the `turbo` models; a free token from token.llm7.io raises the rate and token limits but reaches the same models. [^10]

Base URL: `https://api.llm7.io/v1`

| Model Name                 | Context | Max Output | Modality         | Rate Limit                    |
| -------------------------- | ------- | ---------- | ---------------- | ----------------------------- |
| `gpt-oss:20b`              | 128K    | —          | Text             | 10 RPM, 60 req/hr (anonymous) |
| mistral-Nemo-Instruct-2407 | 128K    | —          | Text             | 10 RPM, 60 req/hr (anonymous) |
| minimax-m2.7               | 180K    | —          | Text (reasoning) | 10 RPM, 60 req/hr (anonymous) |

### [ModelScope](https://modelscope.cn/my/myaccesstoken) 🇨🇳

Free API-Inference for registered users. Requires Alibaba Cloud account binding + real-name verification. [^6]

Base URL: `https://api-inference.modelscope.cn/v1`

| Model Name                     | Context | Max Output | Modality  | Rate Limit                                 |
| ------------------------------ | ------- | ---------- | --------- | ------------------------------------------ |
| `Qwen/Qwen3.5-35B-A3B`         | 256K    | —          | Text      | 2,000 RPD total; <=500 RPD/model (dynamic) |
| `Qwen/Qwen3.5-27B`             | 256K    | —          | Text      | 2,000 RPD total; <=500 RPD/model (dynamic) |
| + API-Inference-enabled models | Varies  | Varies     | LLM, MLLM | Dynamic quotas + dynamic concurrency       |

### [NVIDIA NIM](https://build.nvidia.com/explore/discover) 🇺🇸

Free with NVIDIA Developer Program membership. 100+ models. Rate-limited per model.

Base URL: `https://integrate.api.nvidia.com/v1`

| Model Name                                | Context | Max Output | Modality                               | Rate Limit         |
| ----------------------------------------- | ------- | ---------- | -------------------------------------- | ------------------ |
| `nvidia/nemotron-3-super-120b-a12b`       | 1M      | 262K       | Text                                   | 40 RPM, 10,000 RPD |
| `nvidia/nemotron-3-nano-30b-a3b`          | 262K    | 32K        | Text                                   | 40 RPM, 10,000 RPD |
| `nvidia/llama-3.1-nemotron-ultra-253b-v1` | 128K    | 4K         | Text                                   | 40 RPM, 10,000 RPD |
| `meta/llama-3.3-70b-instruct`             | 128K    | 4K         | Text                                   | 40 RPM, 10,000 RPD |
| `mistralai/mistral-nemotron`              | 128K    | 8K         | Text                                   | 40 RPM, 10,000 RPD |
| `google/gemma-4-31b-it`                   | 262K    | 8K         | Text                                   | 40 RPM, 10,000 RPD |
| `mistralai/mistral-large-2-instruct`      | 128K    | 4K         | Text                                   | 40 RPM, 10,000 RPD |
| `minimaxai/minimax-m3`                    | 1M      | ~64K       | Text                                   | 40 RPM, 10,000 RPD |
| `nvidia/nemotron-3-ultra-550b-a55b`       | 1M      | 262K       | Text                                   | 40 RPM, 10,000 RPD |
| `openai/gpt-oss-120b`                     | 131K    | 131K       | Te

> _README 过长已截断, 完整内容请查看 GitHub 仓库。_
