"use client";

import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { formatRepositoryDate, githubRepositoryFromPayload, normalizeAgentRepository, type AgentRepositoryMeta } from "@/lib/agent/repository";
import { formatAgentCount } from "@/lib/agent/skills";

function activityLabel(value: string) {
  const days = Math.max(0, (Date.now() - new Date(value).getTime()) / 86_400_000);
  return days < 30 ? "活跃" : days < 120 ? "稳定" : days < 365 ? "放缓" : "低活跃";
}

export function AgentCompareTool({ requested = [] }: { requested?: string[] }) {
  const [inputs, setInputs] = useState([requested[0] || "openclaw/openclaw", requested[1] || "obra/superpowers", requested[2] || ""]);
  const [repos, setRepos] = useState<AgentRepositoryMeta[]>([]);
  const [status, setStatus] = useState("");
  const [error, setError] = useState(false);
  const run = useCallback(async (values: string[]) => {
    const ids = [...new Set(values.map(normalizeAgentRepository).filter(Boolean))];
    if (ids.length < 2) { setError(true); setStatus("请至少输入 2 个有效的 GitHub 仓库。"); return; }
    setError(false);
    setStatus(`正在同时读取 ${ids.length} 个仓库的实时数据…`);
    setRepos([]);
    try {
      const next = await Promise.all(ids.map(async (id) => {
        const response = await fetch(`/api/agent/github/${id}/overview`, { headers: { Accept: "application/json" } });
        const payload = await response.json() as { repo?: Record<string, unknown>; error?: string };
        if (!response.ok || !payload.repo) throw new Error(`${id}：${payload.error || "仓库不可访问"}`);
        return githubRepositoryFromPayload(payload.repo);
      }));
      setRepos(next);
      setStatus("");
    } catch (reason) {
      setError(true);
      setStatus(reason instanceof Error ? reason.message : "GitHub 数据服务暂时不可用，请稍后重试。");
    }
  }, []);
  useEffect(() => { if (requested.length >= 2) void run([requested[0], requested[1], requested[2] || ""]); }, [requested, run]);
  const update = (index: number, value: string) => setInputs((current) => current.map((item, itemIndex) => itemIndex === index ? value : item));
  const rows: Array<[string, (repo: AgentRepositoryMeta) => React.ReactNode]> = [
    ["定位", (repo) => repo.description || "暂无简介"],
    ["Stars", (repo) => formatAgentCount(repo.stars)],
    ["Forks", (repo) => formatAgentCount(repo.forks)],
    ["活跃度", (repo) => `${activityLabel(repo.updatedAt)} · ${formatRepositoryDate(repo.updatedAt)}`],
    ["主要语言", (repo) => repo.language || "未知"],
    ["许可证", (repo) => repo.license || "未声明"],
    ["默认分支", (repo) => repo.defaultBranch],
    ["项目状态", (repo) => repo.archived ? "已归档" : "持续维护"],
    ["站内操作", (repo) => <Link href={`/agent/${repo.fullName}`}>阅读文档 →</Link>],
  ];
  return <div className="agent-tool-page"><section className="agent-tool-hero"><div><span className="agent-tool-kicker">HEAD-TO-HEAD</span><h1>不凭印象选工具</h1></div><p>最多同时对比 3 个 GitHub 仓库。数据现场读取，不把 Stars 当成唯一答案，同时展示 Forks、更新时间、许可证与站内文档入口。</p></section>
    <form className="agent-tool-form" onSubmit={(event) => { event.preventDefault(); void run(inputs); }}><div className="agent-compare-fields">{inputs.map((input, index) => <label className="agent-tool-field" key={index}><span>{String(index + 1).padStart(2, "0")}</span><input value={input} onChange={(event) => update(index, event.target.value)} placeholder={index === 2 ? "可选：owner/repository" : undefined} aria-label={index === 0 ? "第一个仓库" : index === 1 ? "第二个仓库" : "第三个仓库"} /></label>)}</div><button className="agent-tool-primary" type="submit">生成对比</button></form>
    {status ? <div className={`agent-tool-status ${error ? "is-error" : ""}`} role="status" aria-live="polite">{error ? <AlertTriangle /> : <span className="agent-tool-pulse" />}{status}</div> : null}
    {repos.length ? <section className="agent-tool-result"><table className="agent-compare-table"><thead><tr><th>指标</th>{repos.map((repo) => <th key={repo.fullName}>{repo.fullName}</th>)}</tr></thead><tbody>{rows.map(([label, render]) => <tr key={label}><td>{label}</td>{repos.map((repo) => <td key={repo.fullName}>{render(repo)}</td>)}</tr>)}</tbody></table></section> : null}
    <section className="agent-method-section"><div className="agent-method-head"><div><span className="agent-tool-kicker">DECISION RULE</span><h2>把选择拆成可检查的信号</h2></div><p>先看是否适配任务，再看活跃性与维护成本，最后才用 Stars 判断社区规模。</p></div></section>
  </div>;
}
