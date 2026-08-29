"use client";

import { Github } from "lucide-react";
import { useState } from "react";

type RepoMeta = { fullName: string; description: string; stars: number; forks: number; language: string | null; defaultBranch: string; updatedAt: string; license: string | null; archived: boolean };
type TreeItem = { path: string; type: "blob" | "tree"; size?: number };
type Check = { title: string; detail: string; count: number; attention: boolean };

function parseRepo(value: string) {
  const normalized = value.trim().replace(/\.git$/, "").replace(/\/$/, "");
  const match = normalized.match(/^(?:https?:\/\/github\.com\/)?([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/);
  return match ? `${match[1]}/${match[2]}` : "";
}

function inspect(items: TreeItem[]): Check[] {
  const paths = items.filter((item) => item.type === "blob").map((item) => item.path.toLowerCase());
  const count = (pattern: RegExp) => paths.filter((path) => pattern.test(path)).length;
  const check = (title: string, detail: string, pattern: RegExp, strict = false) => { const matches = count(pattern); return { title, detail, count: matches, attention: matches > (strict ? 0 : 2) }; };
  const checks = [
    check("安装与生命周期脚本", "检查 install、postinstall、setup 与 bootstrap 等入口。", /(^|\/)(postinstall|preinstall|install|setup|bootstrap)[._-]/, true),
    check("可执行文件", "定位 shell、PowerShell、batch 和其他直接执行文件。", /\.(sh|bash|zsh|fish|ps1|bat|cmd)$/),
    check("凭据与密钥面", "检查 credential、token、secret、private key 相关路径。", /(credential|secret|token|private[_-]?key|\.pem$|\.p12$|\.key$)/, true),
    check("网络与远程连接", "识别 proxy、socket、webhook、tunnel 和远程传输组件。", /(proxy|socket|webhook|tunnel|remote|network)/),
    check("二进制与打包产物", "统计可执行二进制、归档包和 vendor 产物。", /\.(exe|dll|dylib|so|bin|jar|zip|tar|gz|7z)$/, true),
    check("混淆或压缩代码", "定位 minified、bundle、vendor 等难以审查的源码。", /(\.min\.[a-z]+$|bundle\.|\/vendor\/|\/dist\/)/),
    check("权限与容器边界", "检查 sudo、privileged、Docker、Kubernetes 与权限声明。", /(sudo|privileged|dockerfile|docker-compose|kubernetes|\/k8s\/)/),
    check("供应链自动化", "识别 GitHub Actions、发布脚本和依赖更新配置。", /(^|\/)(\.github\/workflows|release|publish|renovate|dependabot)/),
    check("文件系统写入", "根据路径和命名信号识别文件操作模块。", /(filesystem|file-system|writer|write-file|file_ops)/),
    check("动态执行与插件", "定位 eval、exec、plugin、loader 等动态入口命名。", /(^|\/)(eval|exec|plugin|loader|runtime)[._/-]/),
  ];
  const docs = count(/(^|\/)(readme|license|security|contributing)(\.|$)/);
  checks.push({ title: "文档与维护基线", detail: "确认 README、LICENSE、SECURITY 和贡献指南是否存在。", count: docs, attention: docs === 0 });
  return checks;
}

export function AgentAnalyzerTool() {
  const [input, setInput] = useState("");
  const [meta, setMeta] = useState<RepoMeta | null>(null);
  const [checks, setChecks] = useState<Check[]>([]);
  const [status, setStatus] = useState("");
  const [error, setError] = useState(false);
  const run = async () => {
    const repo = parseRepo(input);
    if (!repo) { setError(true); setStatus("请输入 owner/repository 或完整 GitHub 地址。"); return; }
    setError(false); setStatus("正在读取仓库元数据与文件树…"); setMeta(null); setChecks([]);
    try {
      const repoResponse = await fetch(`https://api.github.com/repos/${repo}`, { headers: { Accept: "application/vnd.github+json" } });
      if (!repoResponse.ok) throw new Error(`GitHub 读取失败 (${repoResponse.status})`);
      const value = await repoResponse.json() as Record<string, unknown>;
      const nextMeta = { fullName: String(value.full_name), description: String(value.description ?? "暂无简介"), stars: Number(value.stargazers_count), forks: Number(value.forks_count), language: typeof value.language === "string" ? value.language : null, defaultBranch: String(value.default_branch), updatedAt: String(value.pushed_at), license: value.license && typeof value.license === "object" ? String((value.license as Record<string, unknown>).spdx_id ?? "未声明") : null, archived: value.archived === true };
      const treeResponse = await fetch(`https://api.github.com/repos/${repo}/git/trees/${encodeURIComponent(nextMeta.defaultBranch)}?recursive=1`, { headers: { Accept: "application/vnd.github+json" } });
      if (!treeResponse.ok) throw new Error(`文件树读取失败 (${treeResponse.status})`);
      const tree = await treeResponse.json() as { tree?: TreeItem[] };
      setMeta(nextMeta); setChecks(inspect(tree.tree ?? [])); setStatus("");
    } catch (reason) { setError(true); setStatus(reason instanceof Error ? reason.message : "分析失败"); }
  };
  const attention = checks.filter((item) => item.attention).length;
  const score = Math.max(0, 100 - attention * 9);
  return <div className="agent-tool-page"><section className="agent-tool-hero"><div><span className="agent-tool-kicker">REPOSITORY ANALYZER</span><h1>安装前，先看清仓库</h1></div><p>基于 GitHub 实时元数据与文件树检查 11 类结构信号。这是安装前的筛查工具，结果会明确区分“通过”与“需要人工确认”。</p></section><form className="agent-tool-form" onSubmit={(event) => { event.preventDefault(); void run(); }}><label className="agent-tool-field"><Github /><input value={input} onChange={(event) => setInput(event.target.value)} placeholder="https://github.com/owner/repository" aria-label="GitHub 仓库地址" /></label><button className="agent-tool-primary" type="submit">开始分析</button></form><div className="agent-tool-examples"><span>示例</span>{["openclaw/openclaw", "modelcontextprotocol/servers", "vuejs/core"].map((repo) => <button type="button" onClick={() => setInput(repo)} key={repo}>{repo}</button>)}</div>{status ? <div className={`agent-tool-status ${error ? "is-error" : ""}`}><span className={error ? "" : "agent-tool-pulse"} />{status}</div> : null}{meta ? <section className="agent-tool-result"><div className="agent-result-summary"><div className="agent-result-score"><strong>{score}</strong></div><div className="agent-result-title"><h2>{meta.fullName}</h2><p>{meta.description}</p></div><div className="agent-result-metric"><span>Stars</span><strong>{meta.stars.toLocaleString("zh-CN")}</strong></div><div className="agent-result-metric"><span>需人工确认</span><strong>{attention}</strong></div><div className="agent-result-metric"><span>主要语言</span><strong>{meta.language || "未知"}</strong></div></div><div className="agent-check-grid">{checks.map((check) => <article className={`agent-check-card ${check.attention ? "is-attention" : ""}`} key={check.title}><span>{check.attention ? "需确认" : "通过"}</span><h3>{check.title}</h3><p>{check.detail}</p><strong>{check.count} 个命中</strong></article>)}</div></section> : null}<section className="agent-method-section"><div className="agent-method-head"><div><span className="agent-tool-kicker">WHAT WE CHECK</span><h2>11 类安装前信号</h2></div><p>检查仓库结构中的可执行脚本、凭据面、二进制文件、网络能力、权限与供应链自动化等信号。</p></div></section></div>;
}
