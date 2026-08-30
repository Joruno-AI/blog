"use client";

import { AlertTriangle, ArrowRight, Check, Github } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { formatRepositoryDate, githubRepositoryFromPayload, githubTreeFromPayload, normalizeAgentRepository, type AgentRepositoryMeta, type AgentRepositoryTreeItem } from "@/lib/agent/repository";
import { formatAgentCount } from "@/lib/agent/skills";

type CheckResult = { title: string; detail: string; count: number; level: "pass" | "attention" };

function inspect(items: AgentRepositoryTreeItem[]): CheckResult[] {
  const paths = items.filter((item) => item.type === "blob").map((item) => item.path.toLowerCase());
  const count = (pattern: RegExp) => paths.filter((path) => pattern.test(path)).length;
  const build = (title: string, detail: string, matches: number, strict = false): CheckResult => ({ title, detail, count: matches, level: matches > (strict ? 0 : 2) ? "attention" : "pass" });
  return [
    build("安装与生命周期脚本", "检查 install、postinstall、setup 与 bootstrap 等入口。", count(/(^|\/)(postinstall|preinstall|install|setup|bootstrap)[._-]/), true),
    build("可执行文件", "定位 shell、PowerShell、batch 和其他直接执行文件。", count(/\.(sh|bash|zsh|fish|ps1|bat|cmd)$/)),
    build("凭据与密钥面", "检查 credential、token、secret、private key 相关路径。", count(/(credential|secret|token|private[_-]?key|\.pem$|\.p12$|\.key$)/), true),
    build("网络与远程连接", "识别 proxy、socket、webhook、tunnel 和远程传输组件。", count(/(proxy|socket|webhook|tunnel|remote|network)/)),
    build("二进制与打包产物", "统计可执行二进制、归档包和 vendor 产物。", count(/\.(exe|dll|dylib|so|bin|jar|zip|tar|gz|7z)$/), true),
    build("混淆或压缩代码", "定位 minified、bundle、vendor 等难以审查的源码。", count(/(\.min\.[a-z]+$|bundle\.|\/vendor\/|\/dist\/)/)),
    build("权限与容器边界", "检查 sudo、privileged、Docker、Kubernetes 与权限声明。", count(/(sudo|privileged|dockerfile|docker-compose|kubernetes|\/k8s\/)/)),
    build("文件系统修改能力", "定位 patch、migration、delete、cleanup 等批量修改入口。", count(/(patch|migration|migrate|cleanup|delete|remove)/)),
    build("CI / CD 与自动化", "检查 GitHub Actions、release、deploy 与机器人自动化。", count(/(^\.github\/workflows\/|deploy|release|bot|automation)/)),
    build("鉴权与安全边界", "识别 auth、oauth、permission、sandbox 与 security 组件。", count(/(auth|oauth|permission|sandbox|security|policy)/)),
    build("文档与治理", "检查 LICENSE、SECURITY、CONTRIBUTING 与架构文档是否完整。", Math.max(0, 4 - count(/(^|\/)(license|security|contributing|architecture)(\.|$)/)), true),
  ];
}

function trustScore(meta: AgentRepositoryMeta, checks: CheckResult[]) {
  const attention = checks.filter((check) => check.level === "attention").length;
  const ageDays = Math.max(0, (Date.now() - new Date(meta.updatedAt).getTime()) / 86_400_000);
  return Math.max(18, Math.min(98, Math.round(74 - attention * 5 + (meta.license ? 7 : -5) + Math.min(Math.log10(meta.stars + 1) * 4, 13) - (meta.archived ? 20 : 0) - Math.min(ageDays / 180, 8))));
}

export function AgentAnalyzerTool() {
  const [input, setInput] = useState("");
  const [repo, setRepo] = useState("");
  const [meta, setMeta] = useState<AgentRepositoryMeta | null>(null);
  const [checks, setChecks] = useState<CheckResult[]>([]);
  const [status, setStatus] = useState("");
  const [error, setError] = useState(false);
  const run = async (requested = input) => {
    const normalized = normalizeAgentRepository(requested);
    if (!normalized) { setError(true); setStatus("请输入 owner/repository 或完整的 GitHub 仓库地址。"); return; }
    setInput(normalized);
    setRepo(normalized);
    setError(false);
    setStatus("正在读取 GitHub 元数据与完整文件树…");
    setMeta(null);
    setChecks([]);
    try {
      const overviewResponse = await fetch(`/api/agent/github/${normalized}/overview`, { headers: { Accept: "application/json" } });
      const overview = await overviewResponse.json() as { repo?: Record<string, unknown>; error?: string };
      if (!overviewResponse.ok || !overview.repo) throw new Error(overview.error || "仓库不可访问");
      const nextMeta = githubRepositoryFromPayload(overview.repo);
      const treeResponse = await fetch(`/api/agent/github/${normalized}/tree?ref=${encodeURIComponent(nextMeta.defaultBranch)}`, { headers: { Accept: "application/json" } });
      const treePayload = await treeResponse.json() as Record<string, unknown> & { error?: string };
      if (!treeResponse.ok) throw new Error(treePayload.error || "文件树不可用");
      setMeta(nextMeta);
      setChecks(inspect(githubTreeFromPayload(treePayload)));
      setStatus("");
    } catch (reason) {
      setError(true);
      setStatus(reason instanceof Error ? reason.message : "GitHub 数据服务暂时不可用，请稍后重试。");
    }
  };
  const attention = checks.filter((item) => item.level === "attention").length;
  const score = meta ? trustScore(meta, checks) : 0;
  const trust = score >= 82 ? "高信任" : score >= 65 ? "可评估" : "需谨慎";
  return <div className="agent-tool-page"><section className="agent-tool-hero"><div><span className="agent-tool-kicker">REPOSITORY ANALYZER</span><h1>安装前，先看清仓库</h1></div><p>基于 GitHub 实时元数据与文件树检查 11 类结构信号。这是安装前的筛查工具，结果会明确区分“通过”与“需要人工确认”。</p></section>
    <form className="agent-tool-form" onSubmit={(event) => { event.preventDefault(); void run(); }}><label className="agent-tool-field"><Github /><input value={input} onChange={(event) => setInput(event.target.value)} inputMode="url" autoComplete="off" placeholder="https://github.com/owner/repository" aria-label="GitHub 仓库地址" /></label><button className="agent-tool-primary" type="submit">开始分析</button></form>
    <div className="agent-tool-examples"><span>示例</span>{["openclaw/openclaw", "modelcontextprotocol/servers", "vuejs/core"].map((example) => <button type="button" onClick={() => void run(example)} key={example}>{example}</button>)}</div>
    {status ? <div className={`agent-tool-status ${error ? "is-error" : ""}`} role="status" aria-live="polite">{error ? <AlertTriangle /> : <span className="agent-tool-pulse" />}{status}</div> : null}
    {meta ? <section className="agent-tool-result"><div className="agent-result-summary"><div className="agent-result-score"><strong>{score}</strong></div><div className="agent-result-title"><h2>{meta.fullName}</h2><p>{meta.description || "暂无仓库简介"}</p></div><div className="agent-result-metric"><span>信任层级</span><strong>{trust}</strong></div><div className="agent-result-metric"><span>需确认信号</span><strong>{attention} / {checks.length}</strong></div><div className="agent-result-metric"><span>社区热度</span><strong>{formatAgentCount(meta.stars)} Stars</strong></div></div><div className="agent-check-grid">{checks.map((check) => <article className={`agent-check-card ${check.level === "attention" ? "is-attention" : ""}`} key={check.title}><span>{check.level === "attention" ? <AlertTriangle /> : <Check />}</span><div><h3>{check.title}</h3><p>{check.detail}</p></div><small>{check.level === "attention" ? `${check.count} 个信号` : "通过"}</small></article>)}</div><div className="agent-tool-examples"><Link href={`/agent/${repo}`}>打开站内详情 <ArrowRight /></Link><span>最近更新 {formatRepositoryDate(meta.updatedAt)}</span></div></section> : null}
    <section className="agent-method-section"><div className="agent-method-head"><div><span className="agent-tool-kicker">WHAT WE CHECK</span><h2>11 类安装前信号</h2></div><p>检查仓库结构中的可执行脚本、凭据面、二进制文件、网络能力、权限与供应链自动化等信号。</p></div></section>
  </div>;
}
