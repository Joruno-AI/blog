
<a href="https://github.com/VoltAgent/voltagent">
     <img width="1500" alt="claude-skills" src="https://github.com/user-attachments/assets/a890e563-e999-4b1f-8ce1-20399b0574f8" />
</a>


<br/>
<br/>

<div align="center">
    <strong>A collection of official Agent Skills from leading development teams and the community.
    <br />
    Hand-picked, not AI-slop generated.
    </strong>
    <br />
    <br />

</div>

<div align="center">

[![Awesome](https://awesome.re/badge.svg)](https://awesome.re)
![Skills Count](https://img.shields.io/badge/Skills-1497+-blue?style=flat-square)
![Last Update](https://img.shields.io/github/last-commit/VoltAgent/awesome-agent-skills?label=Last%20update&style=flat-square)
<a href="https://github.com/VoltAgent/voltagent">
  <img alt="VoltAgent" src="https://cdn.voltagent.dev/website/logo/logo-2-svg.svg" height="20" />
</a>
[![Discord](https://img.shields.io/discord/1361559153780195478.svg?label=&logo=discord&logoColor=ffffff&color=7389D8&labelColor=6A7EC2)](https://s.voltagent.dev/discord)


</div>

</div>

# Awesome Agent Skills

Unlike many bulk-generated skill repositories, this collection focuses on real-world Agent Skills created and used by actual engineering teams, not mass AI‑generated stuff.

This collection features official skills published by leading development teams, including Anthropic, Google Labs, Vercel, Stripe, Cloudflare, Netlify, Trail of Bits, Sentry, Expo, Hugging Face, Figma, and more, alongside community-built skills.

Compatible with Claude Code, Codex, Antigravity, Gemini CLI, Cursor, GitHub Copilot, OpenCode, Windsurf, and more. See the table below for paths and documentation.

The most contributed Agent Skills repository, built and maintained together with the community.


## 💛 Sponsors

|  |  |
| :-: | :-- |
| <a href="https://www.testmuai.com"><picture><source media="(prefers-color-scheme: dark)" srcset="https://cdn.voltagent.dev/awesome-repo/testmui/testmuai-white.png"><img alt="TestMu AI" src="https://cdn.voltagent.dev/awesome-repo/testmui/testmuai-black.png" width="425"></picture></a> | [TestMu AI (formerly LambdaTest)](https://www.testmuai.com) is an AI-native testing cloud platform built for modern engineering teams. Covering everything from autonomous test creation and fast execution to testing AI agents, chatbots and voice assistants. |
| <a href="https://modem.dev/go/awesome-agent-skills"><picture><source media="(prefers-color-scheme: dark)" srcset="https://cdn.voltagent.dev/awesome-repo/modemlabs/modemlabs-dark.svg"><img alt="Modem" src="https://cdn.voltagent.dev/awesome-repo/modemlabs/modemlab-light.svg" width="425"></picture></a> | [Modem](https://modem.dev/go/awesome-agent-skills) is an AI product teammate that takes scattered discussions and turns them into a company-specific context that surfaces insights, automates actions, and closes the loop with teammates and customers. |

<br />

<a href="https://sponsors.voltagent.dev/#awesome-agent-skills"><img src="https://img.shields.io/badge/📩_Become_a_Sponsor-Contact_Us-blue?style=for-the-badge&logoColor=white" alt="Become a Sponsor" /></a>


## Table of Contents

### Official Skills by

| | | | | 
|---|---|---|---|
| [Claude](#official-claude-skills) | [VoltAgent](#skills-by-voltagent) | [TestMu AI](#skills-by-testmu-ai) | [Modem Dev](#skills-by-modem-dev) |
| [Angular](#skills-by-angular) | [Composio](#skills-by-composio-team) | [Supabase](#skills-by-supabase-team) | [Google Gemini](#skills-by-google-gemini) |
| [Stripe](#skills-by-stripe-team) | [Courier](#skills-by-courier) | [CallStack](#skills-by-callstack) | [Expo](#skills-by-expo-team) |
| [Better Auth](#skills-by-better-auth-team) | [Tinybird](#skills-by-tinybird-team) | [HashiCorp](#skills-by-hashicorp-team-for-terraform) | [Sanity](#skills-by-sanity-team) |
| [Firecrawl](#skills-by-firecrawl-team) | [Neon](#skills-by-neon-team) | [ClickHouse](#skill-by-clickhouse) | [Remotion](#skills-by-remotion) |
| [Replicate](#skills-by-replicate) | [Typefully](#skills-by-typefully) | [Vercel](#skills-by-vercel-engineering-team) | [Cloudflare](#skills-by-cloudflare-team) |
| [Netlify](#skills-by-netlify-team) | [Google Labs (Stitch)](#skills-by-google-labs-stitch) | [Google Workspace CLI](#skills-by-google-workspace-cli) | [Hugging Face](#skills-by-hugging-face-team) |
| [Trail of Bits](#security-skills-by-trail-of-bits-team) | [Sentry](#skills-by-sentry-team-for-their-dev-team) | [Microsoft](#skills-by-microsoft) | [fal.ai](#skills-by-falai-team) |
| [WordPress](#skills-by-wordpress-development-team) | [OpenAI](#skills-by-openai) | [Figma](#skills-by-figma) | [Corey Haines](#marketing-skills-by-corey-haines) |
| [Binance](#skills-by-binance) | [Dean Peters](#product-manager-skills-by-dean-peters) | [Paweł Huryn](#product-management-skills-by-pawel-huryn) | [MiniMax](#skills-by-minimax-team) |
| [DuckDB](#skills-by-duckdb) | [GSAP](#skills-by-gsap-greensock) | [Garry Tan (gstack)](#skills-by-garry-tan-gstack) | [Notion](#skills-by-notion) |
| [Resend](#skills-by-resend) | [Addy Osmani (Web Quality)](#skills-by-addy-osmani-web-quality) | [MongoDB](#skills-by-mongodb) | [Kim Barrett (Advertising)](#advertising-skills-by-kim-barrett) |
| [Apollo GraphQL](#skills-by-apollo-graphql) | [Auth0](#skills-by-auth0) | [Brave](#skills-by-brave) | [Browserbase](#skills-by-browserbase) |
| [CodeRabbit](#skills-by-coderabbit) | [Coinbase](#skills-by-coinbase) | [Datadog Labs](#skills-by-datadog-labs) | [Firebase](#skills-by-firebase) |
| [Flutter](#skills-by-flutter) | [Venice.ai](#skills-by-veniceai) | [Red Hat](#skills-by-redhat) | [Community](#community-skills) |
| [Redis](#skills-by-redis) | [NVIDIA](#skills-by-nvidia) | [Google Cloud](#skills-by-google-cloud) | [Quality Standards](#skill-quality-standards) |



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
<summary><h3 style="display:inline">Official Claude Skills</h3></summary>

- **[anthropics/docx](https://officialskills.sh/anthropics/skills/docx)** - Create, edit, and analyze Word documents
- **[anthropics/doc-coauthoring](https://officialskills.sh/anthropics/skills/doc-coauthoring)** - Collaborative document editing and co-authoring
- **[anthropics/pptx](https://officialskills.sh/anthropics/skills/pptx)** - Create, edit, and analyze PowerPoint presentations
- **[anthropics/xlsx](https://officialskills.sh/anthropics/skills/xlsx)** - Create, edit, and analyze Excel spreadsheets
- **[anthropics/pdf](https://officialskills.sh/anthropics/skills/pdf)** - Extract text, create PDFs, and handle forms
- **[anthropics/algorithmic-art](https://officialskills.sh/anthropics/skills/algorithmic-art)** - Create generative art using p5.js with seeded randomness
- **[anthropics/canvas-design](https://officialskills.sh/anthropics/skills/canvas-design)** - Design visual art in PNG and PDF formats
- **[anthropics/frontend-design](https://officialskills.sh/anthropics/skills/frontend-design)** - Frontend design and UI/UX development tools
- **[anthropics/slack-gif-creator](https://officialskills.sh/anthropics/skills/slack-gif-creator)** - Create animated GIFs optimized for Slack size constraints
- **[anthropics/theme-factory](https://officialskills.sh/anthropics/skills/theme-factory)** - Style artifacts with professional themes or generate custom themes
- **[anthropics/web-artifacts-builder](https://officialskills.sh/anthropics/skills/web-artifacts-builder)** - Build complex claude.ai HTML artifacts with React and Tailwind
- **[anthropics/mcp-builder](https://officialskills.sh/anthropics/skills/mcp-builder)** - Create MCP servers to integrate external APIs and services
- **[anthropics/webapp-testing](https://officialskills.sh/anthropics/skills/webapp-testing)** - Test local web applications using Playwright
- **[anthropics/brand-guidelines](https://officialskills.sh/anthropics/skills/brand-guidelines)** - Apply Anthropic's brand colors and typography to artifacts
- **[anthropics/internal-comms](https://officialskills.sh/anthropics/skills/internal-comms)** - Write status reports, newsletters, and FAQs
- **[anthropics/skill-creator](https://officialskills.sh/anthropics/skills/skill-creator)** - Guide for creating skills that extend Claude's capabilities
- **[anthropics/template](https://officialskills.sh/anthropics/skills/template)** - Basic template for creating new skills

</details>

<details>
<summary><h3 style="display:inline">Skills by VoltAgent</h3></summary>

Official skills by VoltAgent for building AI agents with the VoltAgent TypeScript framework.
- **[voltagent/create-voltagent](https://officialskills.sh/voltagent/skills/create-voltagent)** - Project setup guide with CLI and manual steps
- **[voltagent/voltagent-best-practices](https://officialskills.sh/voltagent/skills/voltagent-best-practices)** - Architecture and usage patterns for agents, workflows, memory, and servers
- **[voltagent/voltagent-core-reference](https://officialskills.sh/voltagent/skills/voltagent-core-reference)** - Reference for the VoltAgent class options and lifecycle methods
- **[voltagent/voltagent-docs-bundle](https://officialskills.sh/voltagent/skills/voltagent-docs-bundle)** - Lookup embedded docs from @voltagent/core for version-matched documentation

</details>

<details>
<summary><h3 style="display:inline">Skills by TestMu AI</h3></summary>

Production-grade Agent Skills for every major test automation framework, maintained by the TestMu AI (formerly LambdaTest) team. They help AI coding assistants generate expert-level test automation code across web, mobile, API, BDD, and unit testing stacks.

- **[testmu-ai/api-skill](https://github.com/LambdaTest/agent-skills/tree/main/api-skill)** - Suite of API skills for designing, mocking, documenting, securing, and generating tests for REST/GraphQL/gRPC APIs
- **[testmu-ai/appium-skill](https://github.com/LambdaTest/agent-skills/tree/main/appium-skill)** - Generate Appium mobile automation for Android and iOS in Java, Python, or JS
- **[testmu-ai/behat-skill](https://github.com/LambdaTest/agent-skills/tree/main/behat-skill)** - Generate Behat BDD tests for PHP with Gherkin and Mink
- **[testmu-ai/behave-skill](https://github.com/LambdaTest/agent-skills/tree/main/behave-skill)** - Generate Behave BDD tests for Python with Gherkin and step implementations
- **[testmu-ai/capybara-skill](https://github.com/LambdaTest/agent-skills/tree/main/capybara-skill)** - Generate Capybara E2E tests in Ruby with RSpec integration
- **[testmu-ai/cicd-pipeline-skill](https://github.com/LambdaTest/agent-skills/tree/main/cicd-pipeline-skill)** - Generate CI/CD pipelines for tests on GitHub Actions, Jenkins, GitLab CI, and Azure DevOps
- **[testmu-ai/codeception-skill](https://github.com/LambdaTest/agent-skills/tree/main/codeception-skill)** - Generate Codeception acceptance, functional, and unit tests in PHP
- **[testmu-ai/cucumber-skill](https://github.com/LambdaTest/agent-skills/tree/main/cucumber-skill)** - Generate Cucumber BDD tests with Gherkin and step definitions in Java, JS, or Ruby
- **[testmu-ai/cypress-skill](https://github.com/LambdaTest/agent-skills/tree/main/cypress-skill)** - Generate Cypress E2E and component tests in JavaScript or TypeScript
- **[testmu-ai/detox-skill](https://github.com/LambdaTest/agent-skills/tree/main/detox-skill)** - Generate Detox gray-box E2E tests for React Native apps in JavaScript
- **[testmu-ai/espresso-skill](https://github.com/LambdaTest/agent-skills/tree/main/espresso-skill)** - Generate Espresso UI tests for Android apps in Kotlin or Java
- **[testmu-ai/flutter-testing-skill](https://github.com/LambdaTest/agent-skills/tree/main/flutter-testing-skill)** - Generate Flutter widget, integration, and golden tests in Dart
- **[testmu-ai/gauge-skill](https://github.com/LambdaTest/agent-skills/tree/main/gauge-skill)** - Generate Gauge specs in Markdown with steps in Java, Python, JS, or Ruby
- **[testmu-ai/geb-skill](https://github.com/LambdaTest/agent-skills/tree/main/geb-skill)** - Generate Geb browser automation in Groovy with Spock and page objects
- **[testmu-ai/hyperexecute-skill](https://github.com/LambdaTest/agent-skills/tree/main/hyperexecute-skill)** - Operate TestMu AI HyperExecute end-to-end: YAML, CLI runs, debugging, and CI wiring
- **[testmu-ai/jasmine-skill](https://github.com/LambdaTest/agent-skills/tree/main/jasmine-skill)** - Generate Jasmine BDD tests in JavaScript with spies and async support
- **[testmu-ai/jest-skill](https://github.com/LambdaTest/agent-skills/tree/main/jest-skill)** - Generate Jest unit and integration tests in JS/TS with mocking and snapshots
- **[testmu-ai/junit-5-skill](https://github.com/LambdaTest/agent-skills/tree/main/junit-5-skill)** - Generate JUnit 5 unit and integration tests in Java with Mockito
- **[testmu-ai/karma-skill](https://github.com/LambdaTest/agent-skills/tree/main/karma-skill)** - Generate Karma test-runner configs for browser-based JS testing
- **[testmu-ai/laravel-dusk-skill](https://github.com/LambdaTest/agent-skills/tree/main/laravel-dusk-skill)** - Generate Laravel Dusk Chrome-based browser tests in PHP
- **[testmu-ai/lettuce-skill](https://github.com/LambdaTest/agent-skills/tree/main/lettuce-skill)** - Generate Lettuce BDD tests for Python (legacy; prefer Behave)
- **[testmu-ai/mocha-skill](https://github.com/LambdaTest/agent-skills/tree/main/mocha-skill)** - Generate Mocha tests in JavaScript with Chai and Sinon
- **[testmu-ai/mstest-skill](https://github.com/LambdaTest/agent-skills/tree/main/mstest-skill)** - Generate MSTest tests in C# for .NET
- **[testmu-ai/nemojs-skill](https://github.com/LambdaTest/agent-skills/tree/main/nemojs-skill)** - Generate Nemo.js Selenium-based tests for Node.js
- **[testmu-ai/nightwatchjs-skill](https://github.com/LambdaTest/agent-skills/tree/main/nightwatchjs-skill)** - Generate NightwatchJS E2E tests in JavaScript with Selenium WebDriver
- **[testmu-ai/nunit-skill](https://github.com/LambdaTest/agent-skills/tree/main/nunit-skill)** - Generate NUnit 3 tests in C# with the constraint model and Moq
- **[testmu-ai/phpunit-skill](https://github.com/LambdaTest/agent-skills/tree/main/phpunit-skill)** - Generate PHPUnit tests in PHP with data providers and mocking
- **[testmu-ai/playwright-skill](https://github.com/LambdaTest/age

> _README 过长已截断, 完整内容请查看 GitHub 仓库。_
