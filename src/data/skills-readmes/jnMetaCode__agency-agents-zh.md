# agency-agents 中文版（AI 智能体专家团队）

🌐 **简体中文** | [繁體中文](README.zh-TW.md) | [English (upstream)](https://github.com/msitarzewski/agency-agents)

> **276 个即插即用的 AI 专家角色** — 覆盖公司经营（CEO/CTO/CMO/COO/CPO/CFO）、工程、设计、营销、产品、游戏、安全、GIS、金融等 20 个部门。不是通用提示词模板，每个智能体都有独立的人设、专业流程和可交付成果。支持 Claude Code / Cursor / Copilot 等 18 种 AI 编程工具。

[agency-agents](https://github.com/msitarzewski/agency-agents) 的中文社区版。在完整翻译上游的基础上，新增了 63 个中国市场原创智能体（小红书、抖音、微信、B站、飞书、钉钉等平台运营，以及跨境电商、政务ToG、医疗合规、Qt 工业上位机、机械设计、畜禽养殖档案核对等垂直领域）。

想更好地用起来，或想给团队打造统一的智能体工作台？[下载桌面客户端](https://github.com/jnMetaCode/agency-orchestrator/releases/latest)（原生 App，免装 Node，macOS / Windows / Linux），或在线体验 [ao.aiolaola.com/experts](https://ao.aiolaola.com/experts)。

[![GitHub stars](https://img.shields.io/github/stars/jnMetaCode/agency-agents-zh?style=social)](https://github.com/jnMetaCode/agency-agents-zh)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://makeapullrequest.com)
[![npm](https://img.shields.io/npm/v/agency-agents-zh?color=cb3837&logo=npm)](https://www.npmjs.com/package/agency-agents-zh)
[![桌面客户端](https://img.shields.io/badge/桌面客户端-macOS%20%7C%20Windows%20%7C%20Linux-2563eb?logo=github)](https://github.com/jnMetaCode/agency-orchestrator/releases/latest)
[![在线体验](https://img.shields.io/badge/在线体验-ao.aiolaola.com-8b5cf6)](https://ao.aiolaola.com/experts)


### 📊 项目规模

| 🤖 AI 智能体 | 🌏 英文版翻译 | 🇨🇳 中国市场原创 | 🧠 支持工具 | 🏢 部门 |
|:---:|:---:|:---:|:---:|:---:|
| **276** | **213** | **63** | **18 种** | **20 个** |

> 📖 **官方配套课程** → [AI 专家团队实战](https://aiolaola.com/course/ai-agency?utm_source=github&utm_campaign=agents)（33 节，免费）：手把手把这仓 276 位专家用成一支团队——单兵点名、自动组队、一人公司全流程，桌面端零代码教学。另有 [从零学会 AI 编程](https://aiolaola.com/?utm_source=github&utm_campaign=agents)（180 节）＋ [从零构建 AI 智能体](https://aiolaola.com/course/ai-agent?utm_source=github&utm_campaign=agents)（40 节）
>
> 🌍 Also available in [English](https://aiolaola.com/en?utm_source=github&utm_campaign=agents) · [日本語](https://aiolaola.com/ja?utm_source=github&utm_campaign=agents) · [Español](https://aiolaola.com/es?utm_source=github&utm_campaign=agents) · [한국어](https://aiolaola.com/ko?utm_source=github&utm_campaign=agents) · [繁體中文](https://aiolaola.com/zh-Hant?utm_source=github&utm_campaign=agents)

---

## 🙏 赞助商 &nbsp;<sub>想出现在这里？联系 [jnMetaCode@qq.com](mailto:jnMetaCode@qq.com)</sub>

<p align="center">
  <a href="https://apinebula.ai/V6ekjG">
    <img src="assets/sponsor-apinebula.jpeg" alt="APINEBULA — 企业级 AI 聚合平台，聚合 Claude / GPT / Gemini 满血模型，一个接口接入全球顶尖大模型，价格低至 1 折起" width="100%">
  </a>
</p>

感谢 [APINEBULA](https://apinebula.ai/V6ekjG) 大屏赞助本项目！APINEBULA 是银河录像局旗下的企业级 AI 聚合平台，背靠大平台资源，面向开发者、团队与企业用户提供稳定、高性价比的大模型 API 接入服务。平台聚合 Claude、GPT、Gemini 等主流满血模型，一个接口接入全球顶尖 AI 大模型，各大模型价格低至 1 折起，支持企业级高并发、正式合同、对公打款与开票服务，适合 AI 编程、Agent 开发、业务系统集成等多种场景！

🎁 **通过[此链接](https://apinebula.ai/V6ekjG)注册并在充值时填写 "agent" 优惠码可享九折优惠！**

<hr>

<table>
<tr>
<td width="25%">
  <a href="https://www.aicodemirror.ai/register?invitecode=XO5L7R">
    <img src="assets/sponsor-aicodemirror.jpeg" alt="AICodeMirror — Claude / Codex / Gemini 官方高稳定中转服务，Codex 官方渠道低至 0.7 折" width="100%">
  </a>
</td>
<td width="75%" valign="middle">

感谢 [AICodeMirror](https://www.aicodemirror.ai/register?invitecode=XO5L7R) 赞助了本项目！AICodeMirror 提供 Claude / Codex / Gemini 官方高稳定中转服务，支持企业级高并发、极速开票、7×24 专属技术支持。Codex 官方渠道低至 0.7 折，充值更有折上折！🎁 **AICodeMirror 为 agency-agents-zh 项目的用户提供了特别福利，通过[此链接](https://www.aicodemirror.ai/register?invitecode=XO5L7R)注册的用户，可享受首充 8 折！**

</td>
</tr>
</table>

<table>
<tr>
<td width="25%">
  <a href="https://cubence.com/signup?code=SCW29JP9">
    <img src="assets/sponsor-cubence.jpeg" alt="Cubence — 专业 AI API 网关，稳定高效的 API 中转服务，支持 Claude Code、Codex、Gemini 等多种模型" width="100%">
  </a>
</td>
<td width="75%" valign="middle">

感谢 [Cubence](https://cubence.com/signup?code=SCW29JP9) 对本项目的支持。Cubence 是一家致力为客户提供稳定、高效的 API 中转服务商。从 25 年 9 月运营至今，提供了 Claude Code、Codex、Gemini 等多种模型支持。🎁 **通过[此链接](https://cubence.com/signup?code=SCW29JP9)注册的用户，首次购买时填写专属优惠码 `AGENCY` 即可享受 9 折优惠！**

</td>
</tr>
</table>

<table>
<tr>
<td width="25%">
  <a href="https://www.volcengine.com/activity/ai618?utm_campaign=hw&utm_content=hw&utm_medium=devrel_tool_web&utm_source=OWO&utm_term=agency-agents-zh">
    <img src="assets/sponsor-volcengine.jpeg" alt="火山引擎 — 火山方舟 Agent/Coding Plan 国模套餐首购 9.9 元起，支持 GLM-5.3、Kimi-K3、DeepSeek、MiniMax、豆包等主流模型" width="100%">
  </a>
</td>
<td width="75%" valign="middle">

感谢 [字节火山引擎](https://www.volcengine.com/activity/ai618?utm_campaign=hw&utm_content=hw&utm_medium=devrel_tool_web&utm_source=OWO&utm_term=agency-agents-zh) 赞助了本项目！火山方舟 Agent/Coding Plan 国模套餐首购 9.9 元起，支持 GLM-5.3、Kimi-K3、DeepSeek、MiniMax、豆包等主流模型，统一 API，适配编码与智能体开发。
🎁 **注册即免费领 2500 万 Token，[立即前往火山引擎活动页面](https://www.volcengine.com/activity/ai618?utm_campaign=hw&utm_content=hw&utm_medium=devrel_tool_web&utm_source=OWO&utm_term=agency-agents-zh)。**

</td>
</tr>
</table>

<table>
<tr>
<td width="25%">
  <a href="https://passport.compshare.cn/register?referral_code=ETD3L5JBM13CtKARkMORot&ytag=GPU_YY_YX_git_agency-agents">
    <img src="assets/sponsor-compshare.jpeg" alt="优云智算 — 热门国产模型按次调用套餐包，低至 49 元/月起" width="100%">
  </a>
</td>
<td width="75%" valign="middle">

感谢[优云智算](https://passport.compshare.cn/register?referral_code=ETD3L5JBM13CtKARkMORot&ytag=GPU_YY_YX_git_agency-agents)赞助了本项目！优云智算是UCloud旗下AI云平台，主打包月、按次的高性价比国模Agent Plan套餐，支持GLM5.2 低至49元/月起。同时提供官转稳定海外模型。支持接入 Claude Code、Codex 及 API 调用。支持企业高并发、7*24技术支持、自助开票。🎁 **通过[此链接](https://passport.compshare.cn/register?referral_code=ETD3L5JBM13CtKARkMORot&ytag=GPU_YY_YX_git_agency-agents)注册的用户，可得免费5元平台体验金！**

</td>
</tr>
</table>

<table>
<tr>
<td width="25%">
  <a href="https://lanox.ai/?c=X3RD38F7&inviteCode=A3HRUB6M">
    <img src="assets/sponsor-lanox.jpeg" alt="LanoX AI — 全球模型接入服务，聚合 GPT / Claude / Gemini / Qwen / Grok 及多模态模型，顶级模型低至官方价 1 折起" width="100%">
  </a>
</td>
<td width="75%" valign="middle">

感谢 [LanoX AI](https://lanox.ai/?c=X3RD38F7&inviteCode=A3HRUB6M) 赞助了本项目！LanoX AI 为开发者、团队与企业提供稳定、高性价比的全球模型接入服务，覆盖 GPT、Claude、Gemini、Qwen、Grok 等主流模型，以及 Seedance 2.0、GPT Image、Gemini Nano Banana 等多模态创作能力。高可用、原生能力输出、不降智、不混模、调用与计费透明，顶级模型低至官方价 1 折起，文档清晰、接入简单，支持开票与企业批量调用，适用于 AI 产品、Agent、内容平台与研发团队。🎁 **通过[此链接](https://lanox.ai/?c=X3RD38F7&inviteCode=A3HRUB6M)注册的用户，可获赠 5 美金体验额度与百万免费 Token，另有 500+ 免费模型可用！**

</td>
</tr>
</table>

<table>
<tr>
<td width="25%">
  <a href="https://www.shengsuanyun.com/?from=CH_QKH696UI">
    <img src="assets/sponsor-shengsuanyun.jpeg" alt="胜算云 — 面向 AI 原生团队的模型 API 聚合平台，汇集 Claude / ChatGPT / Gemini 等海内外大模型，提供企业级定制网关" width="100%">
  </a>
</td>
<td width="75%" valign="middle">

感谢[胜算云](https://www.shengsuanyun.com/?from=CH_QKH696UI)对本项目的赞助！胜算云是面向 AI 原生团队的模型 API 聚合平台，汇集 Claude、ChatGPT、Gemini 等海内外大语言模型及多媒体模型，支持统一接入与按量调用。平台坚持合规 API 服务，杜绝逆向工程和资源稀释。此外平台提供企业级定制网关，包括团队成本与权限管理、智能路由、安全防护及 BYOK 密钥托管，并提供发票服务。🎁 **新用户通过[此链接](https://www.shengsuanyun.com/?from=CH_QKH696UI)注册，即可领取 5 元 Token 体验额度！**

</td>
</tr>
</table>

<table>
<tr>
<td width="25%">
  <a href="https://go.apimart.ai/gh-agency-agents-zh">
    <img src="assets/sponsor-apimart.jpeg" alt="APIMart — 专注 AI 图片/视频生成的低价 API 平台，GPT-Image-2 低至 $0.006/张，图片与视频共用一套异步 API" width="100%">
  </a>
</td>
<td width="75%" valign="middle">

感谢 [APIMart](https://go.apimart.ai/gh-agency-agents-zh) 赞助了本项目！APIMart 是专注 AI 图片/视频生成的低价 API 平台，GPT-Image-2 低至 $0.006/张，1 美元可出图 160+ 张。图片、视频共用一套异步 API，提交任务拿 ID、轮询或回调取结果，跑批万张不超时、换模型不改代码。按量付费、无月费。🎁 **通过[此链接](https://go.apimart.ai/gh-agency-agents-zh)注册即可开用！**

</td>
</tr>
</table>

<table>
<tr>
<td width="25%">
  <a href="https://metaso.cn/minimax-h3/?s=gt533367">
    <img src="assets/sponsor-metaso.jpeg" alt="秘塔科技 — 高性价比 MiniMax H3 视频生成 API 服务，768P 0.09 元/秒、2K 0.15 元/秒，兼容 OpenAI 协议、支持 ComfyUI" width="100%">
  </a>
</td>
<td width="75%" valign="middle">

感谢[秘塔科技](https://metaso.cn/minimax-h3/?s=gt533367)赞助了本项目！秘塔科技提供高性价比的 MiniMax H3 视频生成 API 服务，适合漫剧、营销视频及批量视频生成：768P 低至 0.09 元/秒、2K 0.15 元/秒，原生 2K 画质，支持音画同步。API 兼容 OpenAI 协议，支持 ComfyUI，无需自行部署模型和 GPU，开箱即用。🎁 **通过[此链接](https://metaso.cn/minimax-h3/?s=gt533367)注册，即可享受赠送额度及专属优惠！**

</td>
</tr>
</table>

---

## 🚀 让角色库跑起来 · Agency Orchestrator

> 一句话，让多个 AI 专家自动组队协作，几分钟交付完整方案。

```bash
npm install -g agency-orchestrator
ao compose "帮我写一篇关于 AI Agent 的深度分析文章" --run
```

**不想用命令行？** [**下载桌面客户端**](https://github.com/jnMetaCode/agency-orchestrator/releases/latest)（原生 App，免装 Node，macOS / Windows / Linux），或在线体验 [ao.aiolaola.com/experts](https://ao.aiolaola.com/experts)。

零代码编排 · DAG 并行 · 断点续跑 · 10 种大模型（7 种免 key）· 现成模板开箱即用 —— [**了解 Agency Orchestrator →**](https://github.com/jnMetaCode/agency-orchestrator)

---

## 🖼️ 在线浏览全部专家（无需安装）

搜索 / 按部门筛选 / 查看与**复制每位专家的完整提示词** —— 全部 268 位，直接在浏览器里看：

<p align="center">
  <a href="https://ao.aiolaola.com/experts">
    <img src="assets/experts-gallery.png" alt="agency-agents 专家库在线浏览" width="640"><br/>
    <strong>🔗 在线专家库 ao.aiolaola.com/experts →</strong>
  </a>
</p>

---

## 这是什么？

一套**开箱即用的 AI 角色库**。每个智能体都有明确的身份定义、关键规则、工作流程和交付物，安装到你的 AI 编程工具后用自然语言激活。

**和普通提示词的区别**：普通提示词告诉 AI "你是一个专家"；这里的智能体定义了专家**怎么思考、怎么做事、交付什么**。例如[安全工程师](engineering/engineering-security-engineer.md)会按 OWASP Top 10 逐项审查代码，[小红书运营专家](marketing/marketing-xiaohongshu-operator.md)会输出完整的种草笔记策略和达人合作方案。

---

## 快速开始

### 方式一：一键安装到你的 AI 工具

支持 **18 种主流 AI 编程工具**，一条命令搞定：

```bash
# 自动检测已安装的工具，一键安装
./scripts/install.sh

# 或指定安装到特定工具
./scripts/install.sh --tool openclaw       # OpenClaw ⭐ 推荐
./scripts/install.sh --tool claude-code    # Claude Code
./scripts/install.sh --tool copilot        # GitHub Copilot
./scripts/install.sh --tool cursor         # Cursor
./scripts/install.sh --tool kiro           # Kiro (Amazon)
./scripts/install.sh --tool trae           # Trae
./scripts/install.sh --tool opencode       # OpenCode
./scripts/install.sh --tool aider          # Aider
./scripts/install.sh --tool windsurf       # Windsurf
./scripts/install.sh --tool antigravity    # Antigravity
./scripts/install.sh --tool gemini-cli     # Gemini CLI
./scripts/install.sh --tool qwen           # Qwen Code
./scripts/install.sh --tool codex          # Codex CLI
./scripts/install.sh --tool deerflow       # DeerFlow 2.0 (ByteDance)
./scripts/install.sh --tool workbuddy      # WorkBuddy (Tencent)
./scripts/install.sh --tool codewhale      # CodeWhale (原 DeepSeek-TUI)
./scripts/install.sh --tool hermes         # Hermes Agent (NousResearch)
./scripts/install.sh --tool qoder          # Qoder
```

> Claude Code 和 GitHub Copilot 可直接安装；其他工具需先运行 `./scripts/convert.sh` 转换格式。

### 🔥 OpenClaw 用户快速上手

OpenClaw 是目前社区用户最多的集成方式，每个智能体会拆分为三个文件：`SOUL.md`（身份人设）+ `AGENTS.md`（业务能力）+ `IDENTITY.md`（简介），天然支持多智能体协作编排。

```bash
./scripts/convert.sh --tool openclaw   # 第一步：转换为 SOUL.md 格式
./scripts/install.sh --tool openclaw   # 第二步：安装到 ~/.openclaw/
```

安装后重启 OpenClaw 网关即可使用。

### 方式二：手动复制

```bash
# Claude Code / GitHub Copilot（直接复制即可）
cp -r marketing/*.md ~/.claude/agents/

# 在 Claude Code 中激活：
# "激活前端开发者模式，帮我构建一个 React 组件"
```

### 方式三：作为提示词参考

浏览下方智能体列表，复制/改编你需要的内容！

---

## 智能体阵容

### 🏢 公司经营部

一个人的公司也有高管层——定方向、做取舍、对结果负责。

| 智能体 | 专长 | 适用场景 |
|--------|------|----------|
| [首席执行官 CEO](company/chief-executive-officer.md) ⭐ | 战略方向、资源配置、组织节奏、对外叙事 | 定方向、做重大取舍、把愿景翻成优先级 |
| [首席技术官 CTO](company/chief-technology-officer.md) ⭐ | 技术路线、架构决策、研发组织、技术债 | 选型评审、技术债取舍、研发效能 |
| [首席产品官 CPO](company/chief-product-officer.md) ⭐ | 产品战略、路线图取舍、产品组织 | 需求裁决、路线图排期、产品复盘 |
| [首席营销官 CMO](company/chief-marketing-officer.md) ⭐ | 定位、渠道组合、营销预算、品牌资产 | 增长打法、预算分配、品牌建设 |
| [首席运营官 COO](company/chief-operating-officer.md) ⭐ | 流程、指标、执行节奏 | 把战略落成 SOP、消灭组织摩擦 |
| [首席财务官 CFO](company/chief-financial-officer.md) | 资本配置、资金运营、财务规划、投资者关系 | 融资、预算、董事会汇报 |
| [幕僚长](company/chief-of-staff.md) | 战略运营、跨部门协调、OKR 追踪 | 高管例会、组织变革推进 |

> 想开一次"高管例会"？把这几位放进同一个工作流，让他们分别从战略/技术/产品/增长/运营/财务视角过同一个议题——这正是 [Agency Orchestrator](https://github.com/jnMetaCode/agency-orchestrator) 的用法。

### 🛠️ 工程部

构建未来，一个 commit 一个脚印。

| 智能体 | 专长 | 适用场景 |
|--------|------|----------|
| [前端开发者](engineering/engineering-frontend-developer.md) | React/Vue、UI 实现、性能优化 | 现代 Web 应用、像素级 UI |
| [后端架构师](engineering/engineering-backend-architect.md) | API 设计、数据库架构、可扩展性 | 服务端系统、微服务 |
| [AI 工程师](engineering/engineering-ai-engineer.md) | 机器学习、模型部署、AI 集成 | ML 功能、数据管线 |
| [DevOps 自动化师](engineering/engineering-devops-automator.md) | CI/CD、基础设施自动化 | 流水线开发、部署自动化 |
| [安全工程师](engineering/engineering-security-engineer.md) | 威胁建模、代码审计、安全架构 | 应用安全、漏洞评估 |
| [快速原型师](engineering/engineering-rapid-prototyper.md) | 快速 POC、MVP 开发 | 概念验证、黑客马拉松 |
| [高级开发者](engineering/engineering-senior-developer.md) | Laravel/Livewire/FluxUI、高端 CSS、Three.js | 高品质 Web 体验 |
| [移动应用开发者](engineering/engineering-mobile-app-builder.md) | iOS/Android 原生、跨平台框架 | 移动端开发、App 性能优化 |
| [数据工程师](engineering/engineering-data-engineer.md) | ETL/ELT、数据湖、Spark/dbt | 数据管线、数据仓库 |
| [技术文档工程师](engineering/engineering-technical-writer.md) | API 文档、开发者文档、docs-as-code | 技术文档、知识库 |
| [自主优化架构师](engineering/engineering-autonomous-optimization-architect.md) | 自适应系统、自动调优 | 智能运维、自愈系统 |
| [嵌入式固件工程师](engineering/engineering-embedded-firmware-engineer.md) | RTOS、外设驱动、低功耗设计 | IoT、嵌入式系统 |
| [上位机工程师](engineering/engineering-pc-host-engineer.md) ⭐ | Qt/QML、QSerialPort、Modbus/CAN、QChart 实时可视化 | 工业上位机、检测设备、HMI |
| [机械设计工程师](engineering/engineering-mechanical-design-engineer.md) ⭐ | 传动选型、强度刚度疲劳振动校核、DFMA、GB/ISO 标准件 | 工业装备、自动化产线、检测仪器 |
| [嵌入式 Linux 驱动工程师](engineering/engineering-embedded-linux-driver-engineer.md) ⭐ | 内核模块、设备树、Platform/I2C/SPI 驱动 | 嵌入式 Linux BSP 开发 |
| [FPGA/ASIC 数字设计工程师](engineering/engineering-fpga-digital-design-engineer.md) ⭐ | Verilog/SystemVerilog、时序收敛、AXI 总线 | FPGA 开发、数字逻辑设计 |
| [IoT 方案架构师](engineering/engineering-iot-solution-architect.md) ⭐ | MQTT/CoAP、边缘计算、设备管理、云平台 | 物联网端到端方案设计 |
| [国内网络工程师](engineering/engineering-network-engineer-china.md) ⭐ | 华为 VRP/华三 Comware/锐捷、VLAN/OSPF/BGP/VXLAN、信创国产化、等保组网 | 国产设备园区网/数据中心/广域网 |
| [故障响应指挥官](engineering/engineering-incident-response-commander.md) | 故障处置、SLO 管理、事后复盘 | 线上故障、应急响应 |
| [威胁检测工程师](engineering/engineering-threat-detection-engineer.md) | SIEM、威胁狩猎、检测规则 | 安全运营、威胁检测 |
| [Solidity 智能合约工程师](engineering/engineering-solidity-smart-contract-engineer.md) | Solidity、EVM、Gas 优化、DeFi | 智能合约开发、Web3 |
| [微信小程序开发者](engineering/engineering-wechat-mini-program-developer.md) ⭐ | WXML/WXSS、微信支付、云开发 | 微信小程序全栈开发 |
| [代码审查员](engineering/engineering-code-reviewer.md) | 代码审查、安全审计、质量把关 | PR 审查、代码质量 |
| [数据库优化师](engineering/engineering-database-optimizer.md) | Schema 设计、查询优化、索引策略 | 数据库性能调优 |
| [Git 工作流大师](engineering/engineering-git-workflow-master.md) | 分支策略、约定式提交、变基 | Git 工作流规范 |
| [软件架构师](engineering/engineering-software-architect.md) | 系统设计、DDD、架构决策 | 系统架构设计 |
| [SRE (站点可靠性工程师)](engineering/engineering-sre.md) | SLO、可观测性、混沌工程 | 站点可靠性工程 |
| [AI 数据修复工程师](engineering/engineering-ai-data-remediation-engineer.md) | 自愈管道、SLM 语义聚类、零数据丢失 | 大规模数据异常修复 |
| [飞书集成开发工程师](engineering/engineering-feishu-integration-developer.md) ⭐ | 飞书机器人、审批流、多维表格 | 飞书生态集成开发 |
| [钉钉集成开发工程师](engineering/engineering-dingtalk-integ

> _README 过长已截断, 完整内容请查看 GitHub 仓库。_
