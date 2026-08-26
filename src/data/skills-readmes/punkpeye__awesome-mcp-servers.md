[![ไทย](https://img.shields.io/badge/Thai-Click-blue)](README-th.md)
[![English](https://img.shields.io/badge/English-Click-yellow)](README.md)
[![繁體中文](https://img.shields.io/badge/繁體中文-點擊查看-orange)](README-zh_TW.md)
[![简体中文](https://img.shields.io/badge/简体中文-点击查看-orange)](README-zh.md)
[![日本語](https://img.shields.io/badge/日本語-クリック-青)](README-ja.md)
[![한국어](https://img.shields.io/badge/한국어-클릭-yellow)](README-ko.md)
[![Português Brasileiro](https://img.shields.io/badge/Português_Brasileiro-Clique-green)](README-pt_BR.md)
[![Discord](https://img.shields.io/discord/1312302100125843476?logo=discord&label=discord)](https://glama.ai/mcp/discord)
[![Subreddit subscribers](https://img.shields.io/reddit/subreddit-subscribers/mcp?style=flat&logo=reddit&label=subreddit)](https://www.reddit.com/r/mcp/)

> [!IMPORTANT]
> [Awesome MCP Servers](https://glama.ai/mcp/servers) web directory.

A curated list of awesome Model Context Protocol (MCP) servers.

* [What is MCP?](#what-is-mcp)
* [Clients](#clients)
* [Tutorials](#tutorials)
* [Community](#community)
* [Legend](#legend)
* [Server Implementations](#server-implementations) 
* [Frameworks](#frameworks)
* [Tips & Tricks](#tips-and-tricks)

## What is MCP?

[MCP](https://modelcontextprotocol.io/) is an open protocol that enables AI models to securely interact with local and remote resources through standardized server implementations. This list focuses on production-ready and experimental MCP servers that extend AI capabilities through file access, database connections, API integrations, and other contextual services.

## Clients

Checkout [awesome-mcp-clients](https://github.com/punkpeye/awesome-mcp-clients/) and [glama.ai/mcp/clients](https://glama.ai/mcp/clients).

## Tutorials

* [Tool Definition Quality Score (TDQS)](https://github.com/glama-ai/tool-definition-quality-score)
* [Model Context Protocol (MCP) Quickstart](https://glama.ai/blog/2024-11-25-model-context-protocol-quickstart)
* [Setup Claude Desktop App to Use a SQLite Database](https://youtu.be/wxCCzo9dGj0)

## Community

* [r/mcp Reddit](https://www.reddit.com/r/mcp)
* [Discord Server](https://glama.ai/mcp/discord)

## Legend

* 🎖️ – official implementation
* programming language
  * 🐍 – Python codebase
  * 📇 – TypeScript (or JavaScript) codebase
  * 🏎️ – Go codebase
  * 🦀 – Rust codebase
  * #️⃣ - C# Codebase
  * ☕ - Java codebase
  * 🌊 – C/C++ codebase
  * 💎 - Ruby codebase

* scope
  * ☁️ - Cloud Service
  * 🏠 - Local Service
  * 📟 - Embedded Systems
* operating system
  * 🍎 – For macOS
  * 🪟 – For Windows
  * 🐧 - For Linux

> [!NOTE]
> Confused about Local 🏠 vs Cloud ☁️?
> * Use local when MCP server is talking to a locally installed software, e.g. taking control over Chrome browser.
> * Use cloud when MCP server is talking to remote APIs, e.g. weather API.

## Server Implementations

> [!NOTE]
> We now have a [web-based directory](https://glama.ai/mcp/servers) that is synced with the repository.

* 🔗 - [Aggregators](#aggregators)
* 🤝 - [Agreements & Coordination](#agreements--coordination)
* 🎨 - [Art & Culture](#art-and-culture)
* 📐 - [Architecture & Design](#architecture-and-design)
* 📂 - [Browser Automation](#browser-automation)
* 🧬 - [Biology Medicine and Bioinformatics](#bio)
* ☁️ - [Cloud Platforms](#cloud-platforms)
* 👨‍💻 - [Code Execution](#code-execution)
* 🤖 - [Coding Agents](#coding-agents)
* 🖥️ - [Command Line](#command-line)
* 💬 - [Communication](#communication)
* 🗣️ - [Conversational AI](#conversational-ai)
* 🔑 - [Cryptography](#cryptography)
* 👤 - [Customer Data Platforms](#customer-data-platforms)
* 🗄️ - [Databases](#databases)
* 📊 - [Data Platforms](#data-platforms)
* 🚚 - [Delivery](#delivery)
* 🛠️ - [Developer Tools](#developer-tools)
* 🧮 - [Data Science Tools](#data-science-tools)
* 📊 - [Data Visualization](#data-visualization)
* 📟 - [Embedded system](#embedded-system)
* 🎓 - [Education](#education)
* 🛒 - [E-Commerce](#e-commerce)
* 🌳 - [Environment & Nature](#environment-and-nature)
* 📂 - [File Systems](#file-systems)
* 💰 - [Finance & Fintech](#finance--fintech)
* 🎮 - [Gaming](#gaming)
* 🏠 - [Home Automation](#home-automation)
* 🏭 - [Industrial & IoT](#industrial--iot)
* 🧠 - [Knowledge & Memory](#knowledge--memory)
* ⚖️ - [Legal](#legal)
* 🗺️ - [Location Services](#location-services)
* 🎯 - [Marketing](#marketing)
* 📊 - [Monitoring](#monitoring)
* 🎥 - [Multimedia Process](#multimedia-process)
* 🖥️ - [OS Automation](#os-automation)
* 🎙️ - [Podcasts](#podcasts)
* 📋 - [Product Management](#product-management)
* 🏠 - [Real Estate](#real-estate)
* 🔬 - [Research](#research)
* 🔎 - [Search & Data Extraction](#search)
* 🔒 - [Security](#security)
* 🌐 - [Social Media](#social-media)
* 🔮 - [Spirituality & Esoterica](#spirituality-and-esoterica)
* 🏃 - [Sports](#sports)
* 🎧 - [Support & Service Management](#support-and-service-management)
* 🌎 - [Translation Services](#translation-services)
* 🎧 - [Text-to-Speech](#text-to-speech)
* 🎙️ - [Speech-to-Text](#speech-to-text)
* 🚆 - [Travel & Transportation](#travel-and-transportation)
* 🔄 - [Version Control](#version-control)
* 🏢 - [Workplace & Productivity](#workplace-and-productivity)
* 🛠️ - [Other Tools and Integrations](#other-tools-and-integrations)

### 🔗 <a name="aggregators"></a>Aggregators

Servers for accessing many apps and tools through a single MCP server.

- [Correctover/mcp-server](https://github.com/Correctover/mcp-server) [![Correctover MCP server](https://glama.ai/mcp/servers/Correctover/mcp-server/badges/score.svg)](https://glama.ai/mcp/servers/Correctover/mcp-server) 📇 ☁️ 🏠 🍎 🪟 🐧 - Contract validation and self-healing failover for LLM APIs. 6-dimension verification (structure, schema, latency, cost, identity, integrity) in 22μs P50. 87 self-healing rules with MAPE-K autonomic loop. BYOK direct connect to 9 providers (OpenAI, Anthropic, DeepSeek, Moonshot, Zhipu AI, Qwen, SiliconFlow, Groq, Together AI). L3 failover in 949ms E2E. Install: `npx -y correctover-mcp-server`.
- [daedalusdevelopmentgroup/ddg-agent-payable-services](https://github.com/daedalusdevelopmentgroup/ddg-agent-payable-services) [![daedalusdevelopmentgroup/ddg-agent-payable-services MCP server](https://glama.ai/mcp/servers/daedalusdevelopmentgroup/ddg-agent-payable-services/badges/score.svg)](https://glama.ai/mcp/servers/daedalusdevelopmentgroup/ddg-agent-payable-services) 🐍 ☁️ - Pay-per-call x402 gateway: one MCP server for 90+ agent tools (utilities, DNS/WHOIS, blockchain RPC, market data, prediction markets, DEX data, security audits) plus an OpenAI-compatible LLM gateway. USDC on Base, free-trial calls per agent. `pip install ddg-agent-services-mcp` or remote `https://mcp.daedalusdevelopmentgroup.com/mcp`.
- [forgemeshlabs/coinopai-mcp](https://github.com/forgemeshlabs/coinopai-mcp) [![forgemeshlabs/coinopai-mcp MCP server](https://glama.ai/mcp/servers/forgemeshlabs/coinopai-mcp/badges/score.svg)](https://glama.ai/mcp/servers/forgemeshlabs/coinopai-mcp) 📇 - Local stdio MCP server for x402-powered paid crypto intelligence: preflight checks, trade decisions with `decision_id`, later audit against real prices, risk state, signal history, and agent automation search over USDC micropayments on Base.
- [forgemeshlabs/anomaly-mcp](https://github.com/forgemeshlabs/anomaly-mcp) [![forgemeshlabs/anomaly-mcp MCP server](https://glama.ai/mcp/servers/forgemeshlabs/anomaly-mcp/badges/score.svg)](https://glama.ai/mcp/servers/forgemeshlabs/anomaly-mcp) 📇 ☁️ - Real-time anomaly detection powered by NASA-derived sequence mining across blockchain, mempool, stablecoin depeg, aviation, and GitHub signals via x402 USDC micropayments on Base. `npx -y @forgemeshlabs/anomaly-mcp`
- [1mcp/agent](https://github.com/1mcp-app/agent) 📇 ☁️ 🏠 🍎 🪟 🐧 - A unified Model Context Protocol server implementation that aggregates multiple MCP servers into one.
- [2s-io/sdk](https://github.com/2s-io/sdk) [![2s-io/sdk MCP server](https://glama.ai/mcp/servers/2s-io/sdk/badges/score.svg)](https://glama.ai/mcp/servers/2s-io/sdk) 📇 ☁️ 🍎 🪟 🐧 - Unified API for AI agents — 180+ tools across geocoding, weather (NWS), climate stations (NOAA), earthquakes (USGS), tides (NOAA), points of interest (OpenStreetMap), patents (USPTO ODP), US case law (CourtListener / Free Law Project), Federal Register, Wikipedia, scientific papers (arXiv / PubMed / Semantic Scholar), AI summarize / translate / extract / screenshot / image-describe, image compression, DNS / WHOIS, crypto address-validate + EVM gas oracle, OFAC sanctions screening, US Census ACS demographics, airport / ZIP lookup. Sub-cent to a few cents per call in USDC on Base via x402 — no API keys, no signup. `npx -y @2sio/mcp`
- [8randonpickart5/alderpost-mcp](https://github.com/8randonpickart5/alderpost-mcp) [![alderpost-mcp MCP server](https://glama.ai/mcp/servers/8randonpickart5/alderpost-mcp/badges/score.svg)](https://glama.ai/mcp/servers/8randonpickart5/alderpost-mcp) 📇 ☁️ - 8 bundled intelligence endpoints (security, company, threat, compliance, sales, sports, property, health) via x402 micropayments on Base.
- [GTCC777/pulsenetwork-mcp](https://github.com/GTCC777/pulsenetwork-mcp) [![GTCC777/pulsenetwork-mcp MCP server](https://glama.ai/mcp/servers/GTCC777/pulsenetwork-mcp/badges/score.svg)](https://glama.ai/mcp/servers/GTCC777/pulsenetwork-mcp) 📇 - One MCP server exposing 66 specialized intelligence APIs (660+ endpoints) — finance, crypto, legal, immigration, healthcare cost, real estate, tax, climate, sports, science, and more — each an x402 pay-per-call tool in USDC on Base and Solana. Includes a `discover` meta-tool over the whole network and a cross-vertical referral graph. No API keys. `npx mcp-pulsenetwork`
- [mcpqueen/mcpqueen](https://github.com/mcpqueen/mcpqueen) [![mcpqueen/mcpqueen MCP server](https://glama.ai/mcp/servers/mcpqueen/mcpqueen/badges/score.svg)](https://glama.ai/mcp/servers/mcpqueen/mcpqueen) 🎖️ 📇 ☁️ - The graded MCP registry: live-probes every remote server in the official registry (initialize, tools/list, schema quality, latency, provenance) and publishes evidence-backed grades — searchable by agents via its own MCP endpoint at [mcpqueen.com](https://mcpqueen.com).
- [szp2005/llm-prices-cn](https://github.com/szp2005/llm-prices-cn) [![szp2005/llm-prices-cn MCP server](https://glama.ai/mcp/servers/szp2005/llm-prices-cn/badges/score.svg)](https://glama.ai/mcp/servers/szp2005/llm-prices-cn) 🐍 ☁️ - Daily-verified LLM API pricing dataset (44+ models, CN & global) with a hosted MCP server for live price queries and token cost estimation.
- [tadas-github/a2asearch-mcp](https://github.com/tadas-github/a2asearch-mcp) [![tadas-github/a2asearch-mcp MCP server](https://glama.ai/mcp/servers/tadas-github/a2asearch-mcp/badges/score.svg)](https://glama.ai/mcp/servers/tadas-github/a2asearch-mcp) 📇 ☁️ - MCP server to search 4,800+ MCP servers, AI agents, CLI tools and agent skills. Install: `npx -y a2asearch-mcp`. Ask Claude: "Find MCP servers for database access". Free, no auth required.
- [Aganium/agenium](https://github.com/Aganium/agenium) 📇 ☁️ 🍎 🪟 🐧 - Bridge any MCP server to the agent:// network — DNS-like identity, discovery, and trust for AI agents. Makes your tools discoverable and callable by other agents via `agent://` URIs with mTLS, trust scores, and capability search.
- [agentbodegastore/agentbodega](https://github.com/agentbodegastore/agentbodega) [![agentbodega MCP server](https://glama.ai/mcp/servers/agentbodegastore/agentbodega/badges/score.svg)](https://glama.ai/mcp/servers/agentbodegastore/agentbodega) 📇 ☁️ - AgentBodega MCP gives agents a live catalog of 65 x402-payable HTTP tools across search, public data, social media, status checks, media conversion, and agent-readiness checks. No API keys; install with `npx -y @agentbodega/mcp`.
- [elisymlabs/elisym](https://github.com/elisymlabs/elisym) [![elisymlabs/elisym MCP server](https://glama.ai/mcp/servers/elisymlabs/elisym/badges/score.svg)](https://glama.ai/mcp/servers/elisymlabs/elisym) 📇 ☁️ 🍎 🪟 🐧 - AI agent discovery and marketplace on Nostr with Solana payments (SOL, USDC). NIP-89 discovery, NIP-90 jobs, NIP-44 v2 encryption, on-chain micropayments.
- [espadaw/Agent47](https://github.com/espadaw/Agent47) 📇 ☁️ - Unified job aggregator for AI agents across 9+ platforms (x402, RentAHuman, Virtuals, etc).
- [doggychip/agentforge](https://github.com/doggychip/agentforge) [![doggychip/agentforge MCP server](https://glama.ai/mcp/servers/doggychip/agentforge/badges/score.svg)](https://glama.ai/mcp/servers/doggychip/agentforge) 📇 ☁️ - Unified API gateway and marketplace for 300+ AI agents. One API key, REST + streaming, 90% creator revenue share, health monitoring. Self-hostable (MIT).
- [AgentHotspot](https://github.com/AgentHotspot/agenthotspot-mcp) 🐍 ☁️ 🏠 🍎 🪟 🐧 - Search, integrate and monetize MCP connectors on the AgentHotspot MCP marketplace
- [aidevelopers2/remoteopenclaw-mcp](https://github.com/aidevelopers2/remoteopenclaw-mcp) [![aidevelopers2/remoteopenclaw-mcp MCP server](https://glama.ai/mcp/servers/aidevelopers2/remoteopenclaw-mcp/badges/score.svg)](https://glama.ai/mcp/servers/aidevelopers2/remoteopenclaw-mcp) 📇 🏠 - MCP server and CLI to search the Remote OpenClaw directory of 13,870+ MCP servers, 4,384+ agent skills, and plugins. Returns names, links, and install commands. Install: `claude mcp add remoteopenclaw -- npx -y remoteopenclaw`. CLI: `npx remoteopenclaw search <query>`. Free, no API key.
- [garasegae/aiskillstore](https://github.com/garasegae/aiskillstore) [![garasegae/aiskillstore MCP server](https://glama.ai/mcp/servers/garasegae/aiskillstore/badges/score.svg)](https://glama.ai/mcp/servers/garasegae/aiskillstore) ☁️ - Agent-first skill marketplace where AI agents discover, purchase, and integrate skills via MCP protocol. Supports 7+ platforms including Claude, hGPT, and Gemini.
- [alexanderclapp/clirank-mcp-server](https://github.com/alexanderclapp/clirank-mcp-server) [![alexanderclapp/clirank-mcp-server MCP server](https://glama.ai/mcp/servers/alexanderclapp/clirank-mcp-server/badges/score.svg)](https://glama.ai/mcp/servers/alexanderclapp/clirank-mcp-server) 📇 ☁️ 🍎 🪟 🐧 - API intelligence for AI coding agents. 387 APIs scored on agent-friendliness with tools to recommend, compare, check scores, and discover APIs. Install: `npx clirank-mcp-server`. Web: [clirank.dev](https://clirank.dev).
- [Work90210/APIFold](https://github.com/Work90210/APIFold) [![Work90210/APIFold MCP server](https://glama.ai/mcp/servers/Work90210/APIFold/badges/score.svg)](https://glama.ai/mcp/servers/Work90210/APIFold) 📇 ☁️ - Turn any REST API into a hosted MCP server. 18 free public servers (GitHub, Stripe, Slack, OpenAI, Notion, and more) — no setup required, bring your own API key.
- [alexar76/aimarket-plugins](https://github.com/alexar76/aimarket-plugins) [![alexar76/aimarket-plugins MCP server](https://glama.ai/mcp/servers/alexar76/aimarket-plugins/badges/score.svg)](https://glama.

> _README 过长已截断, 完整内容请查看 GitHub 仓库。_
