<h1 align="center">⚔️ 三省六部 · Edict</h1>

<p align="center">
  <strong>我用 1300 年前的帝国制度，重新设计了 AI 多 Agent 协作架构。<br>结果发现，古人比现代 AI 框架更懂分权制衡。</strong>
</p>

<p align="center">
  <sub>12 个 AI Agent（11 个业务角色 + 1 个兼容角色）组成三省六部：太子分拣、中书省规划、门下省审核封驳、尚书省派发、六部+吏部并行执行。<br>比 CrewAI 多一层<b>制度性审核</b>，比 AutoGen 多一个<b>实时看板</b>。</sub>
</p>

<p align="center">
  <a href="#-demo">🎬 看 Demo</a> ·
  <a href="#-30-秒快速体验">🚀 30 秒体验</a> ·
  <a href="#-架构">🏛️ 架构</a> ·
  <a href="#-功能全景">📋 看板功能</a> ·
  <a href="docs/task-dispatch-architecture.md">📚 架构文档</a> ·
  <a href="README_EN.md">English</a> ·
  <a href="README_JA.md">日本語</a> ·
  <a href="CONTRIBUTING.md">参与贡献</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/OpenClaw-Required-blue?style=flat-square" alt="OpenClaw">
  <img src="https://img.shields.io/badge/Python-3.9+-3776AB?style=flat-square&logo=python&logoColor=white" alt="Python">
  <img src="https://img.shields.io/badge/Agents-12_Specialized-8B5CF6?style=flat-square" alt="Agents">
  <img src="https://img.shields.io/badge/Dashboard-Real--time-F59E0B?style=flat-square" alt="Dashboard">
  <img src="https://img.shields.io/badge/License-MIT-22C55E?style=flat-square" alt="License">
  <img src="https://img.shields.io/badge/Frontend-React_18-61DAFB?style=flat-square&logo=react&logoColor=white" alt="React">
  <img src="https://img.shields.io/badge/Backend-stdlib_only-EC4899?style=flat-square" alt="Zero Backend Dependencies">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/公众号-cft0808-07C160?style=for-the-badge&logo=wechat&logoColor=white" alt="WeChat">
</p>

---

## 🎬 Demo

<p align="center">
  <video src="docs/Agent_video_Pippit_20260225121727.mp4" width="100%" autoplay muted loop playsinline controls>
    您的浏览器不支持视频播放，请查看下方 GIF 或 <a href="docs/Agent_video_Pippit_20260225121727.mp4">下载视频</a>。
  </video>
  <br>
  <sub>🎥 三省六部 AI 多 Agent 协作全流程演示</sub>
</p>

<details>
<summary>📸 GIF 预览（加载更快）</summary>
<p align="center">
  <img src="docs/demo.gif" alt="三省六部 Demo" width="100%">
  <br>
  <sub>飞书下旨 → 太子分拣 → 中书省规划 → 门下省审议 → 六部并行执行 → 奏折回报（30 秒）</sub>
</p>
</details>

> 🐳 **没有 OpenClaw？** 跑一行 `docker run -p 7891:7891 cft0808/edict` 即可体验完整看板 Demo（预置模拟数据）。

---

## 🤔 为什么是三省六部？

大多数 Multi-Agent 框架的套路是：

> *"来，你们几个 AI 自己聊，聊完把结果给我。"*

然后你拿到一坨不知道经过了什么处理的结果，无法复现，无法审计，无法干预。

**三省六部的思路完全不同** —— 我们用了一个在中国存在 1400 年的制度架构：

```
你 (皇上) → 太子 (分拣) → 中书省 (规划) → 门下省 (审议) → 尚书省 (派发) → 六部 (执行) → 回奏
```

这不是花哨的 metaphor，这是**真正的分权制衡**：

| | CrewAI | MetaGPT | AutoGen | **三省六部** |
|---|:---:|:---:|:---:|:---:|
| **审核机制** | ❌ 无 | ⚠️ 可选 | ⚠️ Human-in-loop | **✅ 门下省专职审核 · 可封驳** |
| **实时看板** | ❌ | ❌ | ❌ | **✅ 军机处 Kanban + 时间线** |
| **任务干预** | ❌ | ❌ | ❌ | **✅ 叫停 / 取消 / 恢复** |
| **流转审计** | ⚠️ | ⚠️ | ❌ | **✅ 完整奏折存档** |
| **Agent 健康监控** | ❌ | ❌ | ❌ | **✅ 心跳 + 活跃度检测** |
| **热切换模型** | ❌ | ❌ | ❌ | **✅ 看板内一键切换 LLM** |
| **技能管理** | ❌ | ❌ | ❌ | **✅ 查看 / 添加 Skills** |
| **新闻聚合推送** | ❌ | ❌ | ❌ | **✅ 天下要闻 + 飞书推送** |
| **部署难度** | 中 | 高 | 中 | **低 · 一键安装 / Docker** |

> **核心差异：制度性审核 + 完全可观测 + 实时可干预**

<details>
<summary><b>🔍 为什么「门下省审核」是杀手锏？（点击展开）</b></summary>

<br>

CrewAI 和 AutoGen 的 Agent 协作模式是 **"做完就交"**——没有人检查产出质量。就像一个公司没有 QA 部门，工程师写完代码直接上线。

三省六部的 **门下省** 专门干这件事：

- 📋 **审查方案质量** —— 中书省的规划是否完备？子任务拆解是否合理？
- 🚫 **封驳不合格的产出** —— 不是 warning，是直接打回重做
- 🔄 **强制返工循环** —— 直到方案达标才放行

这不是可选的插件——**它是架构的一部分**。每一个旨意都必须经过门下省，没有例外。

这就是为什么三省六部能处理复杂任务而结果可靠：因为在送到执行层之前，有一个强制的质量关卡。1300 年前唐太宗就想明白了——**不受制约的权力必然会出错**。

</details>

---

## ✨ 功能全景

### 🏛️ 十二部制 Agent 架构
- **太子** 消息分拣 —— 闲聊自动回复，旨意才建任务
- **三省**（中书·门下·尚书）负责规划、审议、派发
- **七部**（户·礼·兵·刑·工·吏 + 早朝官）负责专项执行
- 严格的权限矩阵 —— 谁能给谁发消息，白纸黑字
- **状态流转校验** —— kanban_update.py 强制合法转换路径，非法状态跳转被拒绝
- 每个 Agent 独立 Workspace · 独立 Skills · 独立模型
- **旨意数据清洗** —— 标题/备注自动剥离文件路径、元数据、无效前缀

### 📋 军机处看板（10 个功能面板）

<table>
<tr><td width="50%">

**📋 旨意看板 · Kanban**
- 按状态列展示全部任务
- 省部过滤 + 全文搜索
- 心跳徽章（🟢活跃 🟡停滞 🔴告警）
- 任务详情 + 完整流转链
- 叫停 / 取消 / 恢复操作

</td><td width="50%">

**🔭 省部调度 · Monitor**
- 可视化各状态任务数量
- 部门分布横向条形图
- Agent 健康状态实时卡片

</td></tr>
<tr><td>

**📜 奏折阁 · Memorials**
- 已完成旨意自动归档为奏折
- 五阶段时间线：圣旨→中书→门下→六部→回奏
- 一键复制为 Markdown
- 按状态筛选

</td><td>

**📜 旨库 · Template Library**
- 9 个预设圣旨模板
- 分类筛选 · 参数表单 · 预估时间和费用
- 预览旨意 → 一键下旨

</td></tr>
<tr><td>

**👥 官员总览 · Officials**
- Token 消耗排行榜
- 活跃度 · 完成数 · 会话统计

</td><td>

**📰 天下要闻 · News**
- 每日自动采集科技/财经资讯
- 分类订阅管理 + 飞书推送

</td></tr>
<tr><td>

**⚙️ 模型配置 · Models**
- 每个 Agent 独立切换 LLM
- 应用后自动重启 Gateway（~5秒生效）

</td><td>

**🛠️ 技能配置 · Skills**
- 各省部已安装 Skills 一览
- 查看详情 + 添加新技能

</td></tr>
<tr><td>

**💬 小任务 · Sessions**
- OC-* 会话实时监控
- 来源渠道 · 心跳 · 消息预览

</td><td>

**🎬 上朝仪式 · Ceremony**
- 每日首次打开播放开场动画
- 今日统计 · 3.5秒自动消失

</td></tr>
<tr><td>

**🏛️ 朝堂议政 · Court Discussion**
- 多官员围绕议题展开部门视角讨论
- LLM 驱动的多角色辩论（各部依职责发表专业意见）
- 支持多轮推进 · 总结结论 · 保留讨论记录

</td><td>

</td></tr>
</table>

---

## 🖼️ 截图

### 旨意看板
![旨意看板](docs/screenshots/01-kanban-main.png)

<details>
<summary>📸 展开查看更多截图</summary>

### 省部调度
![省部调度](docs/screenshots/02-monitor.png)

### 任务流转详情
![任务流转详情](docs/screenshots/03-task-detail.png)

### 模型配置
![模型配置](docs/screenshots/04-model-config.png)

### 技能配置
![技能配置](docs/screenshots/05-skills-config.png)

### 官员总览
![官员总览](docs/screenshots/06-official-overview.png)

### 会话记录
![会话记录](docs/screenshots/07-sessions.png)

### 奏折归档
![奏折归档](docs/screenshots/08-memorials.png)

### 圣旨模板
![圣旨模板](docs/screenshots/09-templates.png)

### 天下要闻
![天下要闻](docs/screenshots/10-morning-briefing.png)

### 上朝仪式
![上朝仪式](docs/screenshots/11-ceremony.png)

</details>

---

## 🚀 30 秒快速体验

### Docker 一键启动

```bash
docker run -p 7891:7891 cft0808/sansheng-demo
```
打开 http://localhost:7891 即可体验军机处看板。

<details>
<summary><b>⚠️ 遇到 <code>exec format error</code>？（点击展开）</b></summary>

如果你在 **x86/amd64** 机器（如 Ubuntu、WSL2）上看到：
```
exec /usr/local/bin/python3: exec format error
```

这是因为镜像架构不匹配。请使用 `--platform` 参数：
```bash
docker run --platform linux/amd64 -p 7891:7891 cft0808/sansheng-demo
```

或使用 docker-compose（已内置 `platform: linux/amd64`）：
```bash
docker compose up
```

</details>

### 完整安装

#### 前置条件
- [OpenClaw](https://openclaw.ai) 已安装
- Python 3.10+
- macOS / Linux

#### 安装

```bash
git clone https://github.com/cft0808/edict.git
cd edict
chmod +x install.sh && ./install.sh
```

安装脚本自动完成：
- ✅ 创建全量 Agent Workspace（含太子/吏部/早朝，兼容历史 main）
- ✅ 写入各省部 SOUL.md（角色人格 + 工作流规则 + 数据清洗规范）
- ✅ 注册 Agent 及权限矩阵到 `openclaw.json`
- ✅ **符号链接统一数据**（各 Workspace 的 data/scripts → 项目目录，确保数据一致）
- ✅ **设置 Agent 间通信可见性**（`sessions.visibility all`，解决消息不可达问题）
- ✅ **同步 API Key 到所有 Agent**（自动从已配置的 Agent 复制）
- ✅ 构建 React 前端（需 Node.js 18+，如未安装则跳过）
- ✅ 初始化数据目录 + 首次数据同步（含官员统计）
- ✅ 重启 Gateway 使配置生效

> ⚠️ **首次安装**：需先配置 API Key：`openclaw agents add taizi`，然后重新运行 `./install.sh` 同步到所有 Agent。

#### 启动

```bash
# 方式 1：一键启动（推荐）
chmod +x start.sh && ./start.sh

# 方式 2：分别启动
bash scripts/run_loop.sh &      # 数据刷新循环
python3 dashboard/server.py     # 看板服务器

# 打开浏览器
open http://127.0.0.1:7891
```

<details>
<summary><b>🖥️ 生产环境部署（systemd）</b></summary>

```bash
# 安装 systemd 服务
sudo cp edict.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable edict
sudo systemctl start edict

# 或使用管理脚本
bash edict.sh start    # 启动
bash edict.sh status   # 查看状态
bash edict.sh restart  # 重启
bash edict.sh stop     # 停止
```

</details>

> 💡 **看板即开即用**：`server.py` 内嵌 `dashboard/dashboard.html`，Docker 镜像包含预构建的 React 前端

> 💡 详细教程请看 [Getting Started 指南](docs/getting-started.md)

---

## 🏛️ 架构

```
                           ┌───────────────────────────────────┐
                           │          👑 皇上（你）              │
                           │     Feishu · Telegram · Signal     │
                           └─────────────────┬─────────────────┘
                                             │ 下旨
                           ┌─────────────────▼─────────────────┐
                           │          � 太子 (taizi)            │
                           │    分拣：闲聊直接回 / 旨意建任务      │
                           └─────────────────┬─────────────────┘
                                             │ 传旨
                           ┌─────────────────▼─────────────────┐
                           │          📜 中书省 (zhongshu)       │
                           │       接旨 → 规划 → 拆解子任务       │
                           └─────────────────┬─────────────────┘
                                             │ 提交审核
                           ┌─────────────────▼─────────────────┐
                           │          🔍 门下省 (menxia)         │
                           │       审议方案 → 准奏 / 封驳 🚫      │
                           └─────────────────┬─────────────────┘
                                             │ 准奏 ✅
                           ┌─────────────────▼─────────────────┐
                           │          📮 尚书省 (shangshu)       │
                           │     派发任务 → 协调六部 → 汇总回奏    │
                           └───┬──────┬──────┬──────┬──────┬───┘
                               │      │      │      │      │
                         ┌─────▼┐ ┌───▼───┐ ┌▼─────┐ ┌───▼─┐ ┌▼─────┐
                         │💰 户部│ │📝 礼部│ │⚔️ 兵部│ │⚖️ 刑部│ │🔧 工部│
                         │ 数据  │ │ 文档  │ │ 工程  │ │ 合规  │ │ 基建  │
                         └──────┘ └──────┘ └──────┘ └─────┘ └──────┘
                                                               ┌──────┐
                                                               │📋 吏部│
                                                               │ 人事  │
                                                               └──────┘
```

### 各省部职责

| 部门 | Agent ID | 职责 | 擅长领域 |
|------|----------|------|---------|
| � **太子** | `taizi` | 消息分拣、需求整理 | 闲聊识别、旨意提炼、标题概括 |
| 📜 **中书省** | `zhongshu` | 接旨、规划、拆解 | 需求理解、任务分解、方案设计 |
| 🔍 **门下省** | `menxia` | 审议、把关、封驳 | 质量评审、风险识别、标准把控 |
| 📮 **尚书省** | `shangshu` | 派发、协调、汇总 | 任务调度、进度跟踪、结果整合 |
| 💰 **户部** | `hubu` | 数据、资源、核算 | 数据处理、报表生成、成本分析 |
| 📝 **礼部** | `libu` | 文档、规范、报告 | 技术文档、API 文档、规范制定 |
| ⚔️ **兵部** | `bingbu` | 代码、算法、巡检 | 功能开发、Bug 修复、代码审查 |
| ⚖️ **刑部** | `xingbu` | 安全、合规、审计 | 安全扫描、合规检查、红线管控 |
| 🔧 **工部** | `gongbu` | CI/CD、部署、工具 | Docker 配置、流水线、自动化 |
| 📋 **吏部** | `libu_hr` | 人事、Agent 管理 | Agent 注册、权限维护、培训 |
| 🌅 **早朝官** | `zaochao` | 每日早朝、新闻聚合 | 定时播报、数据汇总 |

### 权限矩阵

> 不是想发就能发 —— 真正的分权制衡

| From ↓ \ To → | 太子 | 中书 | 门下 | 尚书 | 户 | 礼 | 兵 | 刑 | 工 | 吏 |
|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **太子** | — | ✅ | | | | | | | | |
| **中书省** | ✅ | — | ✅ | ✅ | | | | | | |
| **门下省** | | ✅ | — | ✅ | | | | | | |
| **尚书省** | | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **六部+吏部** | | | | ✅ | | | | | | |

### 任务状态流转

```
皇上 → 太子分拣 → 中书规划 → 门下审议 → 已派发 → 执行中 → 待审查 → ✅ 已完成
                      ↑          │                              │
                      └──── 封驳 ─┘                    阻塞 Blocked
```

> ⚡ **状态转换受保护**：`kanban_update.py` 内置 `_VALID_TRANSITIONS` 状态机校验，
> 非法跳转（如 Doing→Taizi）会被拒绝并记录日志，确保流程不可绕过。
>
> 🔄 **异步事件驱动**：服务间通过 Redis Streams EventBus 解耦通信，Outbox Relay 保障事件可靠投递。
> 所有状态变更自动写入审计日志（`audit.py`），支持完整追溯。

---

## 📁 项目结构

```
edict/
├── agents/                     # 12 个 Agent 的人格模板
│   ├── taizi/SOUL.md           # 太子 · 消息分拣（含旨意标题规范）
│   ├── zhongshu/SOUL.md        # 中书省 · 规划中枢
│   ├── menxia/SOUL.md          # 门下省 · 审议把关
│   ├── shangshu/SOUL.md        # 尚书省 · 调度大脑
│   ├── hubu/SOUL.md            # 户部 · 数据资源
│   ├── libu/SOUL.md            # 礼部 · 文档规范
│   ├── bingbu/SOUL.md          # 兵部 · 工程实现
│   ├── xingbu/SOUL.md          # 刑部 · 合规审计
│   ├── gongbu/SOUL.md          # 工部 · 基础设施
│   ├── libu_hr/                # 吏部 · 人事管理
│   └── zaochao/SOUL.md         # 早朝官 · 情报枢纽
├── dashboard/
│   ├── dashboard.html          # 军机处看板（单文件 · 零依赖 · ~2500 行）
│   ├── dist/                   # React 前端构建产物（Docker 镜像内包含，本地可选）
│   ├── auth.py                 # Dashboard 登录鉴权
│   ├── court_discuss.py        # 朝堂议政（多官员 LLM 讨论引擎）
│   └── server.py               # API 服务器（Python 标准库 · 零依赖 · ~2300 行）
├── edict/backend/              # 异步后端服务（SQLAlchemy + Redis）
│   ├── app/models/
│   │   ├── task.py             # 任务模型 + 状态机
│   │   ├── audit.py            # 审计日志模型
│   │   └── outbox.py           # Outbox 消息模型
│   ├── app/services/
│   │   ├── event_bus.py        # Redis Streams EventBus
│   │   └── task_service.py     # 任务服务层
│   └── app/workers/
│       ├── dispatch_worker.py  # 并行调度 + 重试 + 资源锁
│       ├── orchestrator_worker.py  # DAG 编排器
│       └── outbox_relay.py     # 事务性 Outbox Relay
├── agents/
│   ├── <agent_id>/SOUL.md      # 各省部 Agent 人格模板
│   ├── GLOBAL.md               # 全局 Agent 配置
│   └── groups/                 # Agent 分组（sansheng / liubu）
├── scripts/
│   ├── run_loop.sh             # 数据刷新循环（每 15 秒）
│   ├── kanban_update.py        # 看板 CLI（含旨意数据清洗 + 标题校验 + 状态机）
│   ├── skill_manager.py        # Skill 管理工具（远程/本地 Skills 添加、更新、移除）
│   ├── agentrec_advisor.py     # Agent 模型推荐（功过簿 + 成本优化）
│   ├── linucb_router.py        # LinUCB 智能路由
│   ├── refresh_watcher.py      # 数据变更监听
│   ├── sync_from_openclaw_runtime.py
│   ├── sync_agent_config.py
│   ├── sync_officials_stats.py
│   ├── fetch_morning_news.py
│   ├── refresh_live_data.py
│   ├── apply_model_changes.py
│   └── file_lock.py            # 文件锁（防多 Agent 并发写入）
├── tests/
│   ├── test_e2e_kanban.py      # 端到端测试（17 个断言）
│   └── test_state_machine_consistency.py  # 状态机一致性测试
├── data/                       # 运行时数据（gitignored）
├── docs/
│   ├── task-dispatch-architecture.md  # 📚 详细架构文档：任务分发、流转、调度的完整设计（业务+技术）
│   ├── getting-started.md             # 快速上手指南
│   ├── wechat-article.md              # 微信文章
│   └── screenshots/                   # 功能截图（11 张）
├── install.sh                  # 一键安装脚本
├── start.sh                    # 一键启动（Dashboard + 数据刷新）
├── edict.service               # systemd 服务配置（生产部署）
├── edict.sh                    # 服务管理脚本（start/stop/restart/status）
├── CONTRIBUTING.md             # 贡献指南
└── LICENSE                     # MIT License
```

---

## 🎯 使用方法

### 向 AI 下旨

通过 Feishu / Telegram / Signal 给中书省发消息：

```
给我设计一个用户注册系统，要求：
1. RESTful API（FastAPI）
2. PostgreSQL 数据库
3. JWT 鉴权
4. 完整测试用例
5. 部署文档
```

**然后坐好，看戏：**

1. 📜 中书省接旨，规划子任务分配方案
2. 🔍 门下省审议，通过 / 封驳打回重规划
3. 📮 尚书省准奏，派发给兵部 + 工部 + 礼部
4. ⚔️ 各部并行执行，进度实时可见
5. 📮 尚书省汇总结果，回奏给你

全程可在**军机处看板**实时监控，随时可以**叫停、取消、恢复**。

### 使用圣旨模板

> 看板 → 📜 旨库 → 选模板 → 填参数 → 下旨

9 个预设模板：周报生成 · 代码审查 · API 设计 · 竞品分析 · 数据报告 · 博客文章 · 部署方案 · 邮件文案 · 站会摘要

### 自定义 Agent

编辑 `agents/<id>/SOUL.md` 即可修改 Agent 的人格、职责和输出规范。

### 增补 Skills（从网上连接）

**三种方式添加 Skills：**

#### 1️⃣ 看板 UI（最简单）

```
看板 → 🔧 技能配置 → ➕ 添加远程 Skill
→ 输入 Agent + Skill 名称 + GitHub URL
→ 确认 → ✅ 完成
```

#### 2️⃣ CLI 命令（最灵活）

```bash
# 从 GitHub 添加 mmx_cli skill 到门下省
python3 scripts/skill_manager.py add-remote \
  --agent menxia \
  --name mmx_cli \
  --source https://raw.githubusercontent.com/MiniMax-AI/cli/main/skill/SKILL.md \
  --description "MiniMax 多模态 CLI 技能"

# 一键导入默认 skills 到指定 agents
python3 scripts/skill_manager.py import-official-hub \
  --agents menxia,shangshu

# 列出所有已添加的远程 skills
python3 scripts/skill_manager.py list-remote

# 更新某个 skill 到最新版本
python3 scripts/skill_manager.py update-remote \
  --agent menxia \
  --name mmx_cli
```

#### 3️⃣ API 请求（自动化集成）

`

> _README 过长已截断, 完整内容请查看 GitHub 仓库。_
