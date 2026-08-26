# PPT Master — AI generates native PowerPoint from any document

[![Version](https://img.shields.io/github/v/release/hugohe3/ppt-master?label=version&color=blue)](https://github.com/hugohe3/ppt-master/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub stars](https://img.shields.io/github/stars/hugohe3/ppt-master.svg)](https://github.com/hugohe3/ppt-master/stargazers)
[![AtomGit stars](https://atomgit.com/hugohe3/ppt-master/star/badge.svg)](https://atomgit.com/hugohe3/ppt-master)
[![The Agentic Leaderboard](https://www.theagenticleaderboard.com/badges/ppt-master.svg)](https://www.theagenticleaderboard.com/agent/?q=ppt-master)

<p align="center">
  <a href="https://trendshift.io/repositories/25760?utm_source=repository-badge&amp;utm_medium=badge&amp;utm_campaign=badge-repository-25760" target="_blank" rel="noopener noreferrer"><img src="https://trendshift.io/api/badge/repositories/25760" alt="hugohe3%2Fppt-master | Trendshift" width="250" height="55"/></a>
</p>

English | [中文](./README_CN.md)

## ❤️ Sponsors

This project is kept free and open source with the support of <a href="https://www.kimi.com/code/?aff=ppt-master">Kimi</a>, <a href="https://www.packyapi.ai/register?aff=ppt-master">PackyCode</a>, <a href="https://apikey.fun/register?aff=PPT-MASTER">APIKEY.FUN</a>, <a href="https://runapi.host/register?aff=WMLJ">RunAPI</a>, <a href="https://www.compshare.cn/coding-plan?ytag=GPU_YY-git_pptmaster0624">YouYun ZhiSuan</a> and other sponsors.

> **[Want to appear here?](SPONSORING.md)**

<details open>
<summary>Click to collapse</summary>

<p align="center">
  <a href="https://www.kimi.com/code/?aff=ppt-master"><img src="https://gcdn.moonshot.cn/growth-cdn/sponsor/kimi-en.png" alt="Kimi" width="100%"></a>
</p>

Thanks to [Kimi](https://www.kimi.com/code/?aff=ppt-master) for sponsoring this project! [Kimi K3](https://platform.kimi.ai/docs/guide/kimi-k3-quickstart) is the world's first open 3T-class model, featuring native vision and a 1-million-token context window. With PPT Master, K3 can understand source materials such as PDFs, DOCX files, and web pages, identify key points, structure the narrative, and generate a natively editable PPTX that you can continue refining in PowerPoint.

**Try [Kimi Code](https://www.kimi.com/code/?aff=ppt-master), or access the API through the Kimi Open Platform ([中文站](https://platform.kimi.com?aff=ppt-master) | [Global](https://platform.kimi.ai?aff=ppt-master)).**

<hr>

<table>
  <tr>
    <td width="180"><a href="https://www.packyapi.ai/register?aff=ppt-master"><img src="docs/assets/sponsors/packycode.png" alt="PackyCode" width="150"></a></td>
    <td>Thanks to PackyCode for sponsoring this project! PackyCode is a reliable and efficient API relay service provider, offering relay services for Claude Code, Codex, Gemini, and more. PackyCode provides special discounts for our project users: register using <a href="https://www.packyapi.ai/register?aff=ppt-master">this link</a> and enter the promo code <strong>ppt-master</strong> during recharge to get 10% off.</td>
  </tr>
  <tr>
    <td width="180"><a href="https://apikey.fun/register?aff=PPT-MASTER"><img src="docs/assets/sponsors/apikey-fun.png" alt="APIKEY.FUN" width="150"></a></td>
    <td>Thanks to APIKEY.FUN for sponsoring this project! APIKEY.FUN is a professional enterprise-grade AI relay service committed to stable, efficient, and low-cost AI access for businesses and developers. The platform supports mainstream models including Claude, OpenAI, and Gemini, with prices as low as <strong>7% of official rates</strong>. Register through <a href="https://apikey.fun/register?aff=PPT-MASTER">our dedicated link</a> for an exclusive perk: <strong>up to 5% off on top-ups, permanently</strong>.</td>
  </tr>
  <tr>
    <td width="180"><a href="https://runapi.host/register?aff=WMLJ"><img src="docs/assets/sponsors/runapi.png" alt="RunAPI" width="150"></a></td>
    <td>Thanks to RunAPI for sponsoring this project! RunAPI is an efficient and stable API platform — a single API Key gives you access to 150+ leading models, including OpenAI, Claude, Gemini, DeepSeek, and Grok, at prices as low as <strong>10% of official rates</strong>, with exceptional stability and seamless compatibility with tools like Claude Code. RunAPI offers an exclusive perk for PPT Master users: register and contact an administrator via <a href="https://runapi.host/register?aff=WMLJ">our dedicated link</a> to claim <strong>¥7 in free credit</strong>.</td>
  </tr>
  <tr>
    <td width="180"><a href="https://www.compshare.cn/coding-plan?ytag=GPU_YY-git_pptmaster0624"><img src="docs/assets/sponsors/youyun.png" alt="YouYun ZhiSuan" width="150"></a></td>
    <td>Thanks to YouYun ZhiSuan for sponsoring this project! YouYun ZhiSuan is UCloud's AI cloud platform, providing one-stop API services for mainstream domestic and international models, all accessible with a single key. The platform features cost-effective CodingPlan packages for domestic models (including GLM5.2, Deepseek-v4, and more), along with official channels for stable access to overseas models, meeting diverse development needs. It's compatible with mainstream AI coding tools like Claude Code and Codex, as well as general API calls. The platform supports enterprise-level high concurrency, 24/7 technical support, and self-service invoicing. Register through <a href="https://www.compshare.cn/coding-plan?ytag=GPU_YY-git_pptmaster0624">this link</a> to receive up to <strong>¥10 in free credits</strong>. This project has been built into an Agent — <strong>PPT Master</strong> — ready to use without local deployment.</td>
  </tr>
</table>

</details>

> **Editable is already table stakes — what sets PPT Master apart is native depth.** It hands you a real PowerPoint: slide masters, native shapes, data-backed charts and tables — not flat text boxes, and not a filled-in template. It also does more than lay slides out nicely — it reasons the argument into shape first, then designs; and that native depth keeps **converging with PowerPoint itself**, adding more of its native capabilities release after release. In form, it's a workflow that runs inside any agent-capable AI tool: hand the AI your topic or material, and it generates on your machine — your data stays local, no platform or model lock-in. How it works and where the limits are → [Product Positioning](#product-positioning).

<p align="center">
  <a href="https://hugohe3.github.io/ppt-master-examples/"><strong>Live Demo</strong></a> ·
  <a href="https://github.com/hugohe3/ppt-master-examples"><strong>Examples</strong></a> ·
  <a href="./docs/faq.md"><strong>FAQ</strong></a> ·
  <a href="./docs/roadmap.md"><strong>Roadmap</strong></a>
</p>

<p align="center">
  <sub>The gallery below was generated in <strong>May 2026</strong> with Claude Opus 4.7 + <code>gpt-image-2</code> — one pass each, no manual polish.</sub>
</p>

<table>
  <tr>
    <td align="center" width="33%">
      <a href="https://hugohe3.github.io/ppt-master-examples/viewer.html?project=ppt169_pritzker_2026"><img src="docs/assets/screenshots/preview_pritzker_2026.png" alt="Editorial magazine — Pritzker 2026 architecture review" /></a><br/>
      <sub><b>Editorial Magazine</b> — architecture photography, calm typographic grid<br/>
      <a href="https://hugohe3.github.io/ppt-master-examples/viewer.html?project=ppt169_pritzker_2026">Flip online</a> · <a href="https://raw.githubusercontent.com/hugohe3/ppt-master-examples/main/examples/ppt169_pritzker_2026/exports/pritzker_2026.pptx">Download .pptx</a></sub>
    </td>
    <td align="center" width="33%">
      <a href="https://hugohe3.github.io/ppt-master-examples/viewer.html?project=ppt169_global_ai_capital_2026"><img src="docs/assets/screenshots/preview_global_ai_capital.png" alt="Data journalism — Global AI Capital 2026" /></a><br/>
      <sub><b>Data Journalism</b> — Bloomberg-style dark dashboard, chart-driven<br/>
      <a href="https://hugohe3.github.io/ppt-master-examples/viewer.html?project=ppt169_global_ai_capital_2026">Flip online</a> · <a href="https://raw.githubusercontent.com/hugohe3/ppt-master-examples/main/examples/ppt169_global_ai_capital_2026/exports/global_ai_capital_2026.pptx">Download .pptx</a></sub>
    </td>
    <td align="center" width="33%">
      <a href="https://hugohe3.github.io/ppt-master-examples/viewer.html?project=ppt169_swiss_grid_systems"><img src="docs/assets/screenshots/preview_swiss_grid.png" alt="Swiss typographic grid — Grid Systems primer" /></a><br/>
      <sub><b>Swiss Grid</b> — strict modular grid, restrained type, red-accent<br/>
      <a href="https://hugohe3.github.io/ppt-master-examples/viewer.html?project=ppt169_swiss_grid_systems">Flip online</a> · <a href="https://raw.githubusercontent.com/hugohe3/ppt-master-examples/main/examples/ppt169_swiss_grid_systems/exports/swiss_grid_systems.pptx">Download .pptx</a></sub>
    </td>
  </tr>
  <tr>
    <td align="center" width="33%">
      <a href="https://hugohe3.github.io/ppt-master-examples/viewer.html?project=ppt169_glassmorphism_demo"><img src="docs/assets/screenshots/preview_glassmorphism_demo.png" alt="Glassmorphism SaaS — AI Agent engineering demo" /></a><br/>
      <sub><b>Glassmorphism SaaS</b> — translucent layers, gradient depth, product UI<br/>
      <a href="https://hugohe3.github.io/ppt-master-examples/viewer.html?project=ppt169_glassmorphism_demo">Flip online</a> · <a href="https://raw.githubusercontent.com/hugohe3/ppt-master-examples/main/examples/ppt169_glassmorphism_demo/exports/glassmorphism_demo.pptx">Download .pptx</a></sub>
    </td>
    <td align="center" width="33%">
      <a href="https://hugohe3.github.io/ppt-master-examples/viewer.html?project=ppt169_sugar_rush_memphis"><img src="docs/assets/screenshots/preview_sugar_rush_memphis.png" alt="Memphis pop — Sugar Rush festival" /></a><br/>
      <sub><b>Memphis Pop</b> — bold primaries, geometric patterns, playful energy<br/>
      <a href="https://hugohe3.github.io/ppt-master-examples/viewer.html?project=ppt169_sugar_rush_memphis">Flip online</a> · <a href="https://raw.githubusercontent.com/hugohe3/ppt-master-examples/main/examples/ppt169_sugar_rush_memphis/exports/sugar_rush_memphis.pptx">Download .pptx</a></sub>
    </td>
    <td align="center" width="33%">
      <a href="https://hugohe3.github.io/ppt-master-examples/viewer.html?project=ppt169_indie_bookstore_zine_guide"><img src="docs/assets/screenshots/preview_indie_bookstore_zine.png" alt="Risograph zine — Indie bookstore guide" /></a><br/>
      <sub><b>Risograph Zine</b> — duotone print, hand-made bookstore-culture feel<br/>
      <a href="https://hugohe3.github.io/ppt-master-examples/viewer.html?project=ppt169_indie_bookstore_zine_guide">Flip online</a> · <a href="https://raw.githubusercontent.com/hugohe3/ppt-master-examples/main/examples/ppt169_indie_bookstore_zine_guide/exports/indie_bookstore_zine_guide.pptx">Download .pptx</a></sub>
    </td>
  </tr>
</table>

<p align="center">
  <sub>Downloading any .pptx and opening it in PowerPoint is the fastest way to see what it can really do.<br/><a href="https://hugohe3.github.io/ppt-master-examples/">Flip through all examples online →</a> · <a href="https://github.com/hugohe3/ppt-master-examples">Source repository</a> · <a href="./docs/why-ppt-master.md">Why PPT Master?</a></sub>
</p>

---

Drop in your source material, and what you get back isn't a static layout you can edit — it's **a complete deck with real PowerPoint behavior**: native slide transitions, opt-in entrance / emphasis / motion-path / exit animations (off by default), speaker notes that can become audio narration and even video, charts and tables that can ship as real data-backed PowerPoint objects, and it can follow your own PPT template — present it as-is, and keep refining. How to use each capability → [Getting Started](./docs/getting-started.md).

## Product Positioning

**Editable is now table stakes — the real question is how much of PowerPoint you actually get.** PPT Master delivers PowerPoint's native object model itself, and in depth: native shapes and connectors with working adjustment handles, data-backed charts and tables on demand, and the full text / picture / fill / effect model — click any element and keep editing it as a native PowerPoint object; and through the template / structured route, it can hand you a deck with real slide masters and layouts (`p:sldMaster` / `p:sldLayout` inheritance).

And that depth is a **direction of travel, not a fixed checklist.** PPT Master's north star is to keep converging with PowerPoint itself: an ongoing effort to build and integrate more of PowerPoint's native capabilities, release after release, closing the gap between what an AI can generate for you and what you could build by hand in PowerPoint. The [PowerPoint ↔ SVG Mapping Guide](./docs/powerpoint-svg-mapping.md) is the honest, feature-by-feature record of how far that reaches today — and SmartArt is a deliberate omission, not a gap.

In form, it's a workflow (a "skill") that runs inside any agent-capable AI tool: tell it in chat — "make a deck from this PDF" — and it runs the workflow on your machine and exports a natively editable `.pptx`. No coding on your side; you do exactly three things — install Python, install an AI tool, drop in your material.

Generating a new deck from source documents is the main pipeline, but not the only route. PPT Master can also distill reusable brand / style / layout / deck templates from your references, fill an existing `.pptx` with new content while preserving its design, and add native transitions, animations, and narration to a finished deck — each route with an explicit contract for what gets preserved.

On top of that native depth, this form comes with three promises:

- **Transparent, predictable cost** — free and open source; the only cost is your AI model usage, with no PPT subscription on top
- **Data stays local** — apart from AI model communication, the entire pipeline runs on your machine
- **No platform lock-in** — any agent-capable AI IDE can drive it; Claude, GPT, Gemini, Kimi, and other models all work

Why you'd choose it, and where it isn't the right fit → [Why PPT Master](./docs/why-ppt-master.md); the long-term capability boundaries behind these promises → [Project Positioning](./docs/project-positioning.md).

> [!IMPORTANT]
> ### This is a tool, not a wishing well
> `harness + model = agent` — PPT Master only owns the workflow; the model sets the ceiling. Recommended: **Kimi K3 (or Claude) with a large context window (~1M tokens) + AI image generation (`gpt-image-2` or Google `gemini-3.1-flash-image`)**; other models can run the pipeline, with a quality gap.
>
> And don't expect a finished, perfect deck in one shot. The tool's value is taking most of the tedious work off your plate; the polishing that's left is yours — a natively editable deck exists precisely so you can keep working on 

> _README 过长已截断, 完整内容请查看 GitHub 仓库。_
