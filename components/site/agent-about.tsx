"use client";

import { useEffect, useState } from "react";

import scenesData from "@/lib/parity/data/agent-scenes.json";
import type { AgentIndexItem } from "@/lib/agent/skills";
import { LEGACY_AGENT_SSR_DISPLAY_AT } from "@/lib/agent/ssr-projections";

const dimensions = [["完整度", "15"], ["清晰度", "15"], ["具体性", "15"], ["示例", "12"], ["文档结构", "23"], ["Agent 就绪度", "20"]];
const pipeline = [
  ["01", "聚合", "同步公开目录索引，排除明确不安全或已拒绝的条目。"],
  ["02", "规范化", "统一仓库 ID、分类、Stars、质量分、安全等级与作者信息。"],
  ["03", "增强", "为精选项目补充 GitHub 活跃度、主要语言与 skills.sh 安装量。"],
  ["04", "组织", `按 ${scenesData.scenes.length} 个任务场景重新编排，同时提供分类、趋势、作者与对比视图。`],
  ["05", "站内阅读", "详情页调用 DeepWiki 公开 MCP 生成架构文档，GitHub 仅负责源码与仓库元数据。"],
  ["06", "回退", "当 DeepWiki 未收录仓库时，用仓库文件树生成结构导览，不把 README 冒充为 AI 文档。"],
];

type Snapshot = { generatedAt: string; count: number; categories: number; safe: number };
const INITIAL: Snapshot = { generatedAt: LEGACY_AGENT_SSR_DISPLAY_AT, count: 28_868, categories: 7, safe: 20_481 };

export function AgentAbout() {
  const [snapshot, setSnapshot] = useState(INITIAL);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/agent/full-index.json", { signal: controller.signal })
      .then((response) => response.ok ? response.json() as Promise<{ generatedAt?: string; items?: AgentIndexItem[] }> : Promise.reject(new Error("index failed")))
      .then((payload) => {
        if (!payload.items?.length) return;
        setSnapshot({
          generatedAt: INITIAL.generatedAt,
          count: payload.items.length,
          categories: new Set(payload.items.map((item) => item.c)).size,
          safe: payload.items.filter((item) => item.g === "safe").length,
        });
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);
  const generatedAt = new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Shanghai" }).format(new Date(snapshot.generatedAt));
  return <div className="agent-tool-page"><section className="agent-tool-hero"><div><span className="agent-tool-kicker">OPEN METHODOLOGY</span><h1>分数是线索，不是判决</h1></div><p>目录的任务是缩小搜索范围，而不是代替技术决策。所有质量分、安全等级和趋势信号都会保留数据边界，详情页则继续带你阅读架构与源码。</p></section>
    <section className="agent-method-section"><div className="agent-method-head"><div><span className="agent-tool-kicker">CURRENT SNAPSHOT</span><h2>当前索引</h2></div><p>{`最后同步：${generatedAt}`}</p></div><div className="agent-formula">{[["全量项目", snapshot.count.toLocaleString("zh-CN")], ["数据分类", String(snapshot.categories)], ["任务场景", String(scenesData.scenes.length)], ["安全通过", snapshot.safe.toLocaleString("zh-CN")], ["详情文档", "DeepWiki"], ["源码浏览", "GitHub API"]].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div></section>
    <section className="agent-method-section"><div className="agent-method-head"><div><span className="agent-tool-kicker">QUALITY SCORE</span><h2>质量分的 6 个维度</h2></div><p>质量分优先衡量项目能否被 Agent 正确理解和使用，不与 Stars 、更新速度或安全等级混成一个不透明总分。</p></div><div className="agent-formula">{dimensions.map(([label, weight]) => <div key={label}><span>{label}</span><strong>{`${weight}%`}</strong></div>)}</div></section>
    <section className="agent-method-section"><div className="agent-method-head"><div><span className="agent-tool-kicker">DATA PIPELINE</span><h2>从公开索引到站内文档</h2></div><p>自动同步负责数据新鲜度，站内信息架构负责让选择和阅读更完整。</p></div><div className="agent-method-grid">{pipeline.map(([index, title, description]) => <article className="agent-method-card" key={index}><span>{index}</span><h3>{title}</h3><p>{description}</p></article>)}</div></section>
    <section className="agent-method-section"><div className="agent-method-head"><div><span className="agent-tool-kicker">LIMITATIONS</span><h2>安全与数据局限</h2></div></div><div className="agent-method-grid">{[["01", "安全通过 ≠ 绝对安全", "结构扫描与公开等级只能帮助排序。涉及凭据、网络、文件系统与自动执行时，仍应阅读源码。"], ["02", "Stars 会偏向早期项目", "新项目可能更适合当前任务。趋势页和对比页会同时展示更新时间、增速与文档质量。"], ["03", "DeepWiki 覆盖度有边界", "未收录的仓库会回退到文件树导览，页面会明确标注来源，不会把本地摘要标成 DeepWiki 内容。"]].map(([index, title, description]) => <article className="agent-method-card" key={index}><span>{index}</span><h3>{title}</h3><p>{description}</p></article>)}</div></section>
  </div>;
}
