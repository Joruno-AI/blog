<a href="https://github.com/VoltAgent/voltagent">
    <img width="1500" height="500" alt="codex" src="https://github.com/user-attachments/assets/35f56654-e3e7-4023-a7d5-acd5215455de" />
</a>

<br />
<br />

<div align="center">
    <strong>The awesome collection of 171+ Codex subagents across 13 categories.</strong>
    <br />
    <br />
</div>

   
<div align="center">
    
[![Awesome](https://awesome.re/badge.svg)](https://awesome.re)
![Subagent Count](https://img.shields.io/badge/subagents-171-blue?style=classic)
[![Last Update](https://img.shields.io/github/last-commit/VoltAgent/awesome-codex-subagents?label=Last%20update&style=classic)](https://github.com/VoltAgent/awesome-codex-subagents)
[![Discord](https://img.shields.io/discord/1361559153780195478.svg?label=&logo=discord&logoColor=ffffff&color=7389D8&labelColor=6A7EC2)](https://s.voltagent.dev/discord)

</div>

<br />

# Awesome Codex Subagents

This repository serves as the definitive collection of [Codex Subagents](https://developers.openai.com/codex/subagents), specialized AI assistants designed for specific development tasks. Written specifically for Codex and aligned with the official docs.

## Installation

Use Codex custom agent directories exactly as documented:

- `~/.codex/agents/` for global agents (available in all projects)
- `.codex/agents/` for project-specific agents (higher precedence in that repo)

1. Clone this repository.
2. Copy the `.toml` agent files you want into one of the directories above.
3. Restart or refresh your Codex session if needed.
4. Delegate explicitly in prompts (Codex does not auto-spawn custom subagents).

Examples:
```bash
mkdir -p ~/.codex/agents
cp categories/01-core-development/backend-developer.toml ~/.codex/agents/
```

```bash
mkdir -p .codex/agents
cp categories/04-quality-security/reviewer.toml .codex/agents/
```

If you use agent configuration in Codex, keep it in `.codex/config.toml` under `[agents]` as described in the official docs.


## Sponsors

|                                                                                                                                                                                                                                                                                                                                                               |                                                                                                                                                                                                                                                           |
| :-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------: | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| <a href="https://lite.ego.app/?utm_source=awesome-codex-subagents&utm_medium=sponsor&utm_campaign=github-sponsor"><picture><source media="(prefers-color-scheme: dark)" srcset="https://cdn.voltagent.dev/awesome-repo/ego-lite/logo_wordmark_lite_white.svg"><img alt="Ego Lite" src="https://cdn.voltagent.dev/awesome-repo/ego-lite/logo_wordmark_lite_dark.svg" width="425"></picture></a> | [Ego Lite](https://lite.ego.app/?utm_source=awesome-codex-subagents&utm_medium=sponsor&utm_campaign=github-sponsor) is the fastest browser for your AI agents to run browser automation tasks, 3.45x faster than agent-browser (Vercel), always free, no setup, and lets your agents run 100+ browser tasks at the same time in their Spaces. |


<div align="center">

<table>
<tr>
<td align="center" width="100%">
<h4>👉 You can feature your product here and reach developers using AI coding agents like Claude Code, Codex, Gemini, and more.</h4>
     
<a href="https://sponsors.voltagent.dev/#awesome-codex-subagents"><img src="https://img.shields.io/badge/📩_Become_a_Sponsor-Contact_Us-blue?style=for-the-badge&logoColor=white" alt="Become a Sponsor" /></a>

</td>
</tr>
</table>

</div>

### Subagent Storage Locations

| Type | Path | Availability | Precedence |
|------|------|--------------|------------|
| Project Subagents | `.codex/agents/` | Current project only | Higher |
| Global Subagents | `~/.codex/agents/` | All projects | Lower |

Note: When naming conflicts occur, project-specific subagents override global ones.


## Subagent Structure

Each subagent uses a Codex-native `.toml` format:

```toml
name = "subagent-name"
description = "When this agent should be invoked"
model = "gpt-5.3-codex-spark"
model_reasoning_effort = "medium"
sandbox_mode = "read-only"

[instructions]
text = """
You are a [role description and expertise areas]...

[Agent-specific checklists, patterns, and guidelines]...
"""
```

### Smart Model Routing

Each subagent includes a `model` field that automatically routes it to the right model -- balancing quality and cost:

| Model | When It's Used | Examples |
|-------|----------------|----------|
| `gpt-5.4` | Deep reasoning -- architecture reviews, security audits, financial logic | `security-auditor`, `architect-reviewer`, `fintech-engineer` |
| `gpt-5.3-codex-spark` | Fast scanning, synthesis, and lighter research tasks | `search-specialist`, `docs-researcher`, `agent-installer` |

### Sandbox Mode Philosophy

Each subagent's `sandbox_mode` field controls filesystem access:
- **Read-only agents** (reviewers, auditors): `sandbox_mode = "read-only"` - analyze without modifying
- **Workspace-write agents** (developers, engineers): `sandbox_mode = "workspace-write"` - create and modify files






## Categories

### [01. Core Development](categories/01-core-development/)

Essential development subagents for everyday coding tasks.

- [**api-designer**](categories/01-core-development/api-designer.toml) - REST and GraphQL API architect
- [**backend-developer**](categories/01-core-development/backend-developer.toml) - Server-side expert for scalable APIs
- [**code-mapper**](categories/01-core-development/code-mapper.toml) - Code path mapping and ownership boundary analysis
- [**design-bridge**](categories/01-core-development/design-bridge.toml) - Translates DESIGN.md specs into implementation-ready UI instructions
- [**electron-pro**](categories/01-core-development/electron-pro.toml) - Desktop application expert
- [**frontend-developer**](categories/01-core-development/frontend-developer.toml) - UI/UX specialist for React, Vue, and Angular
- [**fullstack-developer**](categories/01-core-development/fullstack-developer.toml) - End-to-end feature development
- [**graphql-architect**](categories/01-core-development/graphql-architect.toml) - GraphQL schema and federation expert
- [**microservices-architect**](categories/01-core-development/microservices-architect.toml) - Distributed systems designer
- [**mobile-developer**](categories/01-core-development/mobile-developer.toml) - Cross-platform mobile specialist
- [**ui-designer**](categories/01-core-development/ui-designer.toml) - Visual design and interaction specialist
- [**ui-fixer**](categories/01-core-development/ui-fixer.toml) - Smallest safe patch for reproduced UI issues
- [**websocket-engineer**](categories/01-core-development/websocket-engineer.toml) - Real-time communication specialist

### [02. Language Specialists](categories/02-language-specialists/)

Language-specific experts with deep framework knowledge.
- [**angular-architect**](categories/02-language-specialists/angular-architect.toml) - Angular 15+ enterprise patterns expert
- [**cpp-pro**](categories/02-language-specialists/cpp-pro.toml) - C++ performance expert
- [**csharp-developer**](categories/02-language-specialists/csharp-developer.toml) - .NET ecosystem specialist
- [**django-developer**](categories/02-language-specialists/django-developer.toml) - Django 4+ web development expert
- [**dotnet-core-expert**](categories/02-language-specialists/dotnet-core-expert.toml) - .NET 8 cross-platform specialist
- [**dotnet-framework-4.8-expert**](categories/02-language-specialists/dotnet-framework-4.8-expert.toml) - .NET Framework legacy enterprise specialist
- [**elixir-expert**](categories/02-language-specialists/elixir-expert.toml) - Elixir and OTP fault-tolerant systems expert
- [**erlang-expert**](categories/02-language-specialists/erlang-expert.toml) - Erlang/OTP and rebar3 engineering expert
- [**expo-react-native-expert**](categories/02-language-specialists/expo-react-native-expert.toml) - Expo and React Native mobile development expert
- [**fastapi-developer**](categories/02-language-specialists/fastapi-developer.toml) - Modern async Python API framework expert
- [**flutter-expert**](categories/02-language-specialists/flutter-expert.toml) - Flutter 3+ cross-platform mobile expert
- [**golang-pro**](categories/02-language-specialists/golang-pro.toml) - Go concurrency specialist
- [**java-architect**](categories/02-language-specialists/java-architect.toml) - Enterprise Java expert
- [**javascript-pro**](categories/02-language-specialists/javascript-pro.toml) - JavaScript development expert
- [**kotlin-specialist**](categories/02-language-specialists/kotlin-specialist.toml) - Modern JVM language expert
- [**laravel-specialist**](categories/02-language-specialists/laravel-specialist.toml) - Laravel 10+ PHP framework expert
- [**symfony-specialist**](categories/02-language-specialists/symfony-specialist.toml) - Symfony application and Doctrine specialist
- [**nextjs-developer**](categories/02-language-specialists/nextjs-developer.toml) - Next.js 14+ full-stack specialist
- [**node-specialist**](categories/02-language-specialists/node-specialist.toml) - Node.js backend specialist
- [**php-pro**](categories/02-language-specialists/php-pro.toml) - PHP web development expert
- [**powershell-5.1-expert**](categories/02-language-specialists/powershell-5.1-expert.toml) - Windows PowerShell 5.1 and full .NET Framework automation specialist
- [**powershell-7-expert**](categories/02-language-specialists/powershell-7-expert.toml) - Cross-platform PowerShell 7+ automation and modern .NET specialist
- [**python-pro**](categories/02-language-specialists/python-pro.toml) - Python ecosystem master
- [**rails-expert**](categories/02-language-specialists/rails-expert.toml) - Rails 8.1 rapid development expert
- [**react-specialist**](categories/02-language-specialists/react-specialist.toml) - React 18+ modern patterns expert
- [**rust-engineer**](categories/02-language-specialists/rust-engineer.toml) - Systems programming expert
- [**spring-boot-engineer**](categories/02-language-specialists/spring-boot-engineer.toml) - Spring Boot 3+ microservices expert
- [**sql-pro**](categories/02-language-specialists/sql-pro.toml) - Database query expert
- [**swift-expert**](categories/02-language-specialists/swift-expert.toml) - iOS and macOS specialist
- [**typescript-pro**](categories/02-language-specialists/typescript-pro.toml) - TypeScript specialist
- [**vue-expert**](categories/02-language-specialists/vue-expert.toml) - Vue 3 Composition API expert


### [03. Infrastructure](categories/03-infrastructure/)

DevOps, cloud, and deployment specialists.

- [**azure-infra-engineer**](categories/03-infrastructure/azure-infra-engineer.toml) - Azure infrastructure and Az PowerShell automation expert
- [**cloud-architect**](categories/03-infrastructure/cloud-architect.toml) - AWS/GCP/Azure specialist
- [**database-administrator**](categories/03-infrastructure/database-administrator.toml) - Database management expert
- [**deployment-engineer**](categories/03-infrastructure/deployment-engineer.toml) - Deployment automation specialist
- [**devops-engineer**](categories/03-infrastructure/devops-engineer.toml) - CI/CD and automation expert
- [**devops-incident-responder**](categories/03-infrastructure/devops-incident-responder.toml) - DevOps incident management
- [**docker-expert**](categories/03-infrastructure/docker-expert.toml) - Docker containerization and optimization expert
- [**incident-responder**](categories/03-infrastructure/incident-responder.toml) - System incident response expert
- [**kubernetes-specialist**](categories/03-infrastructure/kubernetes-specialist.toml) - Container orchestration master
- [**network-engineer**](categories/03-infrastructure/network-engineer.toml) - Network infrastructure specialist
- [**platform-engineer**](categories/03-infrastructure/platform-engineer.toml) - Platform architecture expert
- [**security-engineer**](categories/03-infrastructure/security-engineer.toml) - Infrastructure security specialist
- [**sre-engineer**](categories/03-infrastructure/sre-engineer.toml) - Site reliability engineering expert
- [**terraform-engineer**](categories/03-infrastructure/terraform-engineer.toml) - Infrastructure as Code expert
- [**terragrunt-expert**](categories/03-infrastructure/terragrunt-expert.toml) - Terragrunt orchestration and DRY IaC specialist
- [**windows-infra-admin**](categories/03-infrastructure/windows-infra-admin.toml) - Active Directory, DNS, DHCP, and GPO automation specialist

<details>
<summary><b>04. Quality & Security</b> — Testing, security, and code quality experts (19 agents)</summary>

### [04. Quality & Security](categories/04-quality-security/)

- [**accessibility-tester**](categories/04-quality-security/accessibility-tester.toml) - A11y compliance expert
- [**ad-security-reviewer**](categories/04-quality-security/ad-security-reviewer.toml) - Active Directory security and GPO audit specialist
- [**ai-writing-auditor**](categories/04-quality-security/ai-writing-auditor.toml) - AI writing pattern auditor and rewriter
- [**architect-reviewer**](categories/04-quality-security/architect-reviewer.toml) - Architecture review specialist
- [**browser-debugger**](categories/04-quality-security/browser-debugger.toml) - Browser-based reproduction and client-side debugging
- [**chaos-engineer**](categories/04-quality-security/chaos-engineer.toml) - System resilience testing expert
- [**code-reviewer**](categories/04-quality-security/code-reviewer.toml) - Code quality guardian
- [**compliance-auditor**](categories/04-quality-security/compliance-auditor.toml) - Regulatory compliance expert
- [**debugger**](categories/04-quality-security/debugger.toml) - Advanced debugging specialist
- [**error-detective**](categories/04-quality-security/error-detective.toml) - Error analysis and resolution expert
- [**gdpr-ccpa-compliance**](categories/04-quality-security/gdpr-ccpa-compliance.toml) - GDPR and CCPA privacy compliance specialist
- [**penetration-tester**](categories/04-quality-security/penetration-tester.toml) - Ethical hacking specialist
- [**performance-eng

> _README 过长已截断, 完整内容请查看 GitHub 仓库。_
