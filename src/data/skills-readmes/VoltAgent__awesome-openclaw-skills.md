<div align="center">

<a href="https://clawskills.sh/">
<img width="1500" height="500" alt="social" src="https://github.com/user-attachments/assets/a6f310af-8fed-4766-9649-b190575b399d" />
</a>

<br/>
<br/>

<div align="center">
    <strong>Discover 5300+ community-built OpenClaw skills, organized by category.
    </strong>
    <br />
    <br />
</div>
  
[![Awesome](https://awesome.re/badge.svg)](https://awesome.re)
[![Skills Count](https://img.shields.io/badge/skills-5200-blue?style=flat-square)](#table-of-contents)
[![Last Update](https://img.shields.io/github/last-commit/VoltAgent/awesome-clawdbot-skills?label=Last%20update&style=flat-square)](https://github.com/VoltAgent/awesome-clawdbot-skills/pulls?q=is%3Apr+is%3Amerged+sort%3Aupdated-desc)
<a href="https://github.com/VoltAgent/voltagent">
  <img alt="VoltAgent" src="https://cdn.voltagent.dev/website/logo/logo-2-svg.svg" height="20" />
</a> 
[![Discord](https://img.shields.io/discord/1361559153780195478.svg?label=&logo=discord&logoColor=ffffff&color=7389D8&labelColor=6A7EC2)](https://s.voltagent.dev/discord)

</div>



</div>

</div>

# Awesome OpenClaw Skills

OpenClaw is a locally-running AI assistant that operates directly on your machine. Skills extend its capabilities, allowing it to interact with external services, automate workflows, and perform specialized tasks. This collection helps you discover and install the right skills for your needs. It can also serve as a source of inspiration for OpenClaw use cases.

Skills in this list are sourced from ClawHub (OpenClaw's public skills registry) and categorized for easier discovery.

### Installation

#### OpenClaw CLI

```bash
openclaw skills install <skill-slug>
```

#### ClawHub CLI

Or with the ClawHub CLI, for registry-managed skill folders outside a full OpenClaw workspace:

```bash
npx clawhub install <skill-slug>
```

#### Manual Installation

Copy the skill folder to one of these locations:

| Location | Path |
|----------|------|
| Global | `~/.openclaw/skills/` |
| Workspace | `<project>/skills/` |

Priority: Workspace > Local > Bundled

#### Alternative

You can also paste the skill's GitHub repository link directly into your assistant's chat and ask it to use it. The assistant will handle the setup automatically in the background.


### Why This List Exists?

OpenClaw's public registry (ClawHub) hosts thousands of community-built skills. This awesome list curates the best of them. Here's what we filtered out:

| Filter | Excluded |
|--------|----------|
| Possibly spam — bulk accounts, bot accounts, test/junk | 4,065 |
| Duplicate / Similar name | 1,040 |
| Low-quality or non-English descriptions | 851 |
| Crypto / Blockchain / Finance / Trade | 886 |
| Malicious — identified by security audits published by researchers (excluding VirusTotal) | 373 |
| **Total not taken from OpenClaw's official skill registry** | **7,215** |


#### Want to add a skill?

This list only includes skills that are **already published** on [ClawHub](https://clawhub.ai), OpenClaw's public skills registry. We do not accept links to personal repos, gists, or any other external source. If your skill isn't on ClawHub yet, publish it there first.

Include the ClawHub link for your skill (e.g. `https://clawhub.ai/steipete/slack`) in your PR description — the `clawskills.sh` listings are managed by us separately. See [CONTRIBUTING.md](CONTRIBUTING.md) for details.


## OpenClaw Ecosystem Tools



### ☁️ Hosting & Deployment

You can deploy OpenClaw on any VPS or cloud platform to run your skills securely on your own infrastructure, or use a managed host that handles servers, updates, and isolation for you. 

<a href="https://myclaw.ai/?utm_source=github&utm_campaign=awesome-openclaw-skills">
<img src="https://cdn.voltagent.dev/awesome-repo/myclaw-banner.svg" alt="MyClaw"  /><br/>
You can run these skills without managing a server — a full cloud-hosted OpenClaw instance with one-click setup, 24/7 uptime, and complete data ownership.
</a>


<br/>
<br/>

> **Tip:** If you're self-hosting, pin your OpenClaw Docker image to a specific tag and snapshot your skills volume before upgrades — makes rollbacks painless when a skill update misbehaves.


### 🔍 Search & Web Data

OpenClaw agents often need fresh, real-world data — search results, product listings, videos, and more. You can scrape and parse it yourself, or use a search API that returns clean, structured data in real time without managing proxies, CAPTCHAs, or HTML parsing.

<a href="https://serpapi.com/search-engine-apis?utm_source=awesomeopenclawskills_github">
<img src="https://cdn.voltagent.dev/awesome-repo/serpapi.png" alt="SerpApi"  /><br/>
Give OpenClaw agents access to real-time Google Search, YouTube, Amazon Product, and web search data through a single API.
</a>


### 🛡️ Security & Config Auditing

As you add more skills, custom code, and connected services, your OpenClaw setup accumulates secrets, file access, and tool permissions that are easy to lose track of. You can review these by hand, or run a continuous audit that surfaces misconfigurations and over-broad permissions before they become a problem.

<a href="https://trent.ai/openclaw/?utm_source=github&utm_medium=referral&utm_campaign=volt-agent">
<img src="https://cdn.voltagent.dev/awesome-repo/trentclaw-banner.png" alt="trentclaw"  /><br/>
trentclaw: audits your OpenClaw config, installed skills and custom code, then returns fixes as diffs. Install with: openclaw skills install trentclaw
</a>


### 🤖 Model Providers

OpenClaw works with **25+ LLM providers** out of the box Anthropic, OpenAI and many more. Switch between them with a single config change.

<details>
<summary><strong>Example: Using OpenAI models</strong></summary>

OpenClaw supports `gpt-5.4` and `gpt-5.4-pro` via direct API key or ChatGPT/Codex OAuth. WebSocket transport is enabled by default for lower latency.

```bash
openclaw onboard --auth-choice openai-api-key
# or use subscription-based access:
openclaw onboard --auth-choice openai-codex
```
</details>


<div align="center">

<table>
<tr>
<td align="center" width="100%">

<h3>🦞 You can feature your OpenClaw ecosystem tool in the section above.</h3>

<p></p>

<sub>The #1 most visited community resource after the official OpenClaw resource</sub>


<a href="https://sponsors.voltagent.dev/#awesome-openclaw-skills"><img src="https://img.shields.io/badge/📩_Become_a_Sponsor-Contact_Us-blue?style=for-the-badge&logoColor=white" alt="Become a Sponsor" /></a>

</td>
</tr>
</table>

</div>



## Security Notice

Skills in this list are **curated, not audited**. They may be updated, modified, or replaced by their original maintainers at any time after being added here.

Before installing or using any Agent Skill, review potential security risks and validate the source yourself. OpenClaw has a **VirusTotal partnership** that provides security scanning for skills, visit a skill's page on ClawHub and check the VirusTotal report to see if it's flagged as risky.

**Recommended tools:**

- [Snyk Skill Security Scanner](https://github.com/snyk/agent-scan)
- [Agent Trust Hub](https://ai.gendigital.com/agent-trust-hub)
  
> Agent skills can include prompt injections, tool poisoning, hidden malware payloads, or unsafe data handling patterns. Always review the source code before installing and use skills at your own discretion.

 For a broader overview of the ClawHub ecosystem, see Trent AI's **[ClawHub by the Numbers](https://trent.ai/blog/clawhub-by-the-numbers/)**.


If you believe a skill in this list should be flagged or has a security concern, please [open an issue](https://github.com/VoltAgent/awesome-clawdbot-skills/issues) so we can review it.


## Table of Contents

| | | |
|---|---|---|
| [Git & GitHub](#git--github) (167) | [Marketing & Sales](#marketing--sales) (107) | [Communication](#communication) (146) |
| [Coding Agents & IDEs](#coding-agents--ides) (1184) | [Productivity & Tasks](#productivity--tasks) (207) | [Speech & Transcription](#speech--transcription) (46) |
| [Browser & Automation](#browser--automation) (323) | [AI & LLMs](#ai--llms) (176) | [Smart Home & IoT](#smart-home--iot) (41) |
| [Web & Frontend Development](#web--frontend-development) (920) | [Data & Analytics](#data--analytics) (28) | [Shopping & E-commerce](#shopping--e-commerce) (51) |
| [DevOps & Cloud](#devops--cloud) (393) | [Calendar & Scheduling](#calendar--scheduling) (66) | |
| [Image & Video Generation](#image--video-generation) (170) | [Media & Streaming](#media--streaming) (86) | [PDF & Documents](#pdf--documents) (105) |
| [Apple Apps & Services](#apple-apps--services) (44) | [Notes & PKM](#notes--pkm) (69) | [Self-Hosted & Automation](#self-hosted--automation) (33) |
| [Search & Research](#search--research) (342) | [iOS & macOS Development](#ios--macos-development) (29) | [Security & Passwords](#security--passwords) (54) |
| [Clawdbot Tools](#clawdbot-tools) (37) | [Transportation](#transportation) (111) | [Moltbook](#moltbook) (29) |
| [CLI Utilities](#cli-utilities) (180) | [Personal Development](#personal-development) (53) | [Gaming](#gaming) (35) |
| [Health & Fitness](#health--fitness) (87) | | |



<br/>

You ship products with AI, but every launch still dies quietly because nobody posts about it. [EveryFeed](https://everyfeed.ai/) plugs your AI assistant into a social workspace that drafts, schedules, and publishes across 35+ channels — no agency, no marketing hire.

<a href="https://everyfeed.ai/">
<img src="https://cdn.voltagent.dev/awesome-repo/everyfeed-social.png" alt="everyfeed"  /><br/>
</a>

<br/>
<br/>

Stop building from a blank page. [LaunchKit](https://launchkit.getdesign.md/) gives your AI coding assistant a complete, working product to start from — websites, startups, and web apps that are clickable on day one.

<a href="https://launchkit.getdesign.md/">
<img src="https://cdn.voltagent.dev/awesome-repo/new-launchkit.png" alt="launchkit"  /><br/>
</a>

<br/>

<details open>
<summary><h3 style="display:inline">Git & GitHub</h3></summary>

- [agent-commons](https://clawskills.sh/skills/zanblayde-agent-commons) - Consult, commit, extend, and challenge reasoning chains.
- [agent-team-orchestration](https://clawskills.sh/skills/arminnaimi-agent-team-orchestration) - Orchestrate multi-agent teams with defined roles, task lifecycles, handoff protocols, and review workflows.
- [agentdo](https://clawskills.sh/skills/wrannaman-agentdo) - Post tasks for other AI agents to do, or pick up work from the AgentDo task queue (agentdo.dev)
- [agentgate](https://clawskills.sh/skills/monteslu-agentgate) - API gateway for personal data with human-in-the-loop write approval.
- [airadar](https://clawskills.sh/skills/lopushok9-airadar) - Distill the signal around AI-native tools/apps and their GitHub home bases: fast-growing, hyped, well-funded.
- [alex-session-wrap-up](https://clawskills.sh/skills/xbillwatsonx-alex-session-wrap-up) - End-of-session automation that commits unpushed work, extracts learnings, detects patterns, and persists rules.
- [amazon-product-api-skill](https://clawskills.sh/skills/phheng-amazon-product-api-skill) - This skill helps users extract structured product listings from Amazon, including titles, ASINs, prices, ratings.
- [app-store-screenshot-generation](https://clawskills.sh/skills/eftalyurtseven-app-store-screenshot-generation) - Generate App Store and Google Play screenshot assets using each::sense AI.
- [arc-agent-lifecycle](https://clawskills.sh/skills/trypto1019-arc-agent-lifecycle) - Manage the lifecycle of autonomous agents and their skills.
- [arc-security-audit](https://clawskills.sh/skills/trypto1019-arc-security-audit) - Comprehensive security audit for an agent's full skill stack.
- [arc-skill-gitops](https://clawskills.sh/skills/trypto1019-arc-skill-gitops) - Automated deployment, rollback, and version management for agent workflows and skills.
- [arc-trust-verifier](https://clawskills.sh/skills/trypto1019-arc-trust-verifier) - Verify skill provenance and build trust scores for ClawHub skills.
- [arxiv-search-collector](https://clawskills.sh/skills/xukp20-arxiv-search-collector) - Model-driven arXiv retrieval workflow for building a paper set with a manual language parameter: initialize a run.
- [auto-pr-merger](https://clawskills.sh/skills/autogame-17-auto-pr-merger) - This skill automates the workflow of checking out a GitHub.
- [azhua-skill-vetter](https://clawskills.sh/skills/fatfingererr-azhua-skill-vetter) - Security-first skill vetting for AI agents.
- [azure-devops](https://clawskills.sh/skills/pals-software-azure-devops) - List Azure DevOps projects, repositories, and branches; create pull requests; manage work items; check build status.
- [bat-cat](https://clawskills.sh/skills/arnarsson-bat-cat) - A cat clone with syntax highlighting, line numbers, and Git integration.
- [beeminder](https://clawskills.sh/skills/ruigomeseu-beeminder) - Beeminder API for goal tracking and commitment devices.
- [billy-emergency-repair](https://clawskills.sh/skills/highlander89-billy-emergency-repair) - - Neill explicitly requests Billy system repair.
- [bitbucket-automation](https://clawskills.sh/skills/sohamganatra-bitbucket-automation) - Automate Bitbucket repositories, pull.
- [biz-reporter](https://clawskills.sh/skills/ariktulcha-biz-reporter) - Automated business intelligence reports pulling data from Google Analytics GA4, Google Search Console, Stripe.
- [blinko](https://clawskills.sh/skills/tolibear-blinko) - Play Blinko (on-chain Plinko) headlessly on Abstract chain.

> **[View all 159 skills in Git & GitHub →](categories/git-and-github.md)**
</details>

<details open>
<summary><h3 style="display:inline">Coding Agents & IDEs</h3></summary>

- [0g-compute](https://clawskills.sh/skills/in-liberty420-0g-compute) - Use cheap, TEE-verified AI models from the 0G Compute Network as OpenClaw providers.
- [0protocol](https://clawskills.sh/skills/0isone-0protocol) - Agents can sign plugins, rotate credentials without losing identity, and publicly attest to behavior.
- [2nd-brain](https://clawskills.sh/skills/coderaven-2nd-brain) - Personal knowledge base for capturing and retrieving information about people, places, restaurants, games, tech.
- [2slides-skills](https://clawskills.sh/skills/javainthinking-2slides-skills) - AI-powered presentation generation using 2slides API.
- [3d-cog](https://clawskills.sh/skills/nitishgargiitd-3d-cog) - Other tools need perfect images.
- [3d-model-generation](https://clawskills.sh/skills/eftalyurtseven-3d-model-generation) - Generate 3D models using each::sense AI.
- [a](https://clawskills.sh/skills/ricketh137-a) - Live stream as an AI VTuber on Lobster.fun.
- [aade-api-monitor](https://clawskills.sh/skills/satoshistackalotto-aade-api-monitor) - Real-time monitoring of Greek AADE tax authority systems — tracks deadlines, rate changes, and compliance updates.
- [abaddon](https://clawskills.sh/skills/enochosbot-bot-abaddon) - Red team security

> _README 过长已截断, 完整内容请查看 GitHub 仓库。_
