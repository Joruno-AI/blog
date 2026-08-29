"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type RepoMeta = { fullName: string; description: string; stars: number; forks: number; watchers: number; language: string | null; defaultBranch: string; updatedAt: string; license: string | null; archived: boolean };

function parseRepo(value: string) {
  const normalized = value.trim().replace(/\.git$/, "").replace(/\/$/, "");
  const match = normalized.match(/^(?:https?:\/\/github\.com\/)?([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/);
  return match ? `${match[1]}/${match[2]}` : "";
}

async function githubRepo(repo: string): Promise<RepoMeta> {
  const response = await fetch(`https://api.github.com/repos/${repo}`, { headers: { Accept: "application/vnd.github+json" } });
  if (!response.ok) throw new Error(`${repo} 读取失败 (${response.status})`);
  const value = await response.json() as Record<string, unknown>;
  return { fullName: String(value.full_name), description: String(value.description ?? "暂无简介"), stars: Number(value.stargazers_count), forks: Number(value.forks_count), watchers: Number(value.subscribers_count), language: typeof value.language === "string" ? value.language : null, defaultBranch: String(value.default_branch), updatedAt: String(value.pushed_at), license: value.license && typeof value.license === "object" ? String((value.license as Record<string, unknown>).spdx_id ?? "未声明") : null, archived: value.archived === true };
}

const date = (value: string) => new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "short", day: "numeric" }).format(new Date(value));

export function AgentCompareTool({ requested = [] }: { requested?: string[] }) {
  const [inputs, setInputs] = useState([requested[0] || "openclaw/openclaw", requested[1] || "obra/superpowers", requested[2] || ""]);
  const [repos, setRepos] = useState<RepoMeta[]>([]);
  const [status, setStatus] = useState("");
  const [error, setError] = useState(false);
  const run = async () => {
    const ids = inputs.map(parseRepo).filter(Boolean);
    if (ids.length < 2) { setError(true); setStatus("请至少输入 2 个有效的 GitHub 仓库。"); return; }
    setError(false); setStatus("正在读取 GitHub 实时数据…"); setRepos([]);
    try { setRepos(await Promise.all(ids.map(githubRepo))); setStatus(""); }
    catch (reason) { setError(true); setStatus(reason instanceof Error ? reason.message : "仓库读取失败"); }
  };
  useEffect(() => { if (requested.length >= 2) void run(); /* only run once for URL-provided repositories */ // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const update = (index: number, value: string) => setInputs((current) => current.map((item, itemIndex) => itemIndex === index ? value : item));
  const rows: Array<[string, (repo: RepoMeta) => React.ReactNode]> = [["定位", (repo) => repo.description], ["Stars", (repo) => repo.stars.toLocaleString("zh-CN")], ["Forks", (repo) => repo.forks.toLocaleString("zh-CN")], ["关注", (repo) => repo.watchers.toLocaleString("zh-CN")], ["最近更新", (repo) => date(repo.updatedAt)], ["主要语言", (repo) => repo.language || "未知"], ["许可证", (repo) => repo.license || "未声明"], ["默认分支", (repo) => repo.defaultBranch], ["项目状态", (repo) => repo.archived ? "已归档" : "持续维护"], ["站内操作", (repo) => <Link href={`/agent/${repo.fullName}`}>阅读文档 →</Link>]];
  return <div className="agent-tool-page"><section className="agent-tool-hero"><div><span className="agent-tool-kicker">HEAD-TO-HEAD</span><h1>不凭印象选工具</h1></div><p>最多同时对比 3 个 GitHub 仓库。数据现场读取，不把 Stars 当成唯一答案，同时展示 Forks、更新时间、许可证与站内文档入口。</p></section><form className="agent-tool-form" onSubmit={(event) => { event.preventDefault(); void run(); }}><div className="agent-compare-fields">{inputs.map((input, index) => <label className="agent-tool-field" key={index}><span>{String(index + 1).padStart(2, "0")}</span><input value={input} onChange={(event) => update(index, event.target.value)} placeholder={index === 2 ? "可选：owner/repository" : "owner/repository"} aria-label={`第${index + 1}个仓库`} /></label>)}</div><button className="agent-tool-primary" type="submit">生成对比</button></form>{status ? <div className={`agent-tool-status ${error ? "is-error" : ""}`}><span className={error ? "" : "agent-tool-pulse"} />{status}</div> : null}{repos.length ? <section className="agent-tool-result"><table className="agent-compare-table"><thead><tr><th>指标</th>{repos.map((repo) => <th key={repo.fullName}>{repo.fullName}</th>)}</tr></thead><tbody>{rows.map(([label, render]) => <tr key={label}><td>{label}</td>{repos.map((repo) => <td key={repo.fullName}>{render(repo)}</td>)}</tr>)}</tbody></table></section> : null}<section className="agent-method-section"><div className="agent-method-head"><div><span className="agent-tool-kicker">DECISION RULE</span><h2>把选择拆成可检查的信号</h2></div><p>先看是否适配任务，再看活跃性与维护成本，最后才用 Stars 判断社区规模。</p></div></section></div>;
}
