/* eslint-disable @next/next/no-img-element -- production Agent reader uses a direct GitHub avatar image. */

import Link from "next/link";

import { AgentSourceIcon } from "@/components/site/agent-source-icon";
import {
  INSTALLABLE_AGENT_CATEGORIES,
  agentInstallCommand,
  formatAgentCount,
  type AgentSkill,
} from "@/lib/agent/skills";

type AgentKnowledgeLoadingProps = {
  repo?: string;
  skill?: AgentSkill;
};

export function AgentKnowledgeLoading({ repo = "", skill }: AgentKnowledgeLoadingProps) {
  const repository = skill?.f || repo;
  const [owner = "GitHub", repositoryName = "正在读取仓库…"] = repository.split("/").filter(Boolean);
  const name = skill?.n || repositoryName;
  const description = skill?.descZh || skill?.d || "正在读取仓库信息";
  const installable = Boolean(skill && INSTALLABLE_AGENT_CATEGORIES.has(skill.c));
  const avatarOwner = skill?.a || owner;

  return (
    <div className="agent-knowledge" data-agent-knowledge data-agent-ssr-preview data-atlas-open="false" aria-busy="true">
      <header className="agent-knowledge-head">
        <div className="agent-knowledge-head-inner">
          <div className="agent-knowledge-brand">
            <Link className="site-link no-underline agent-back" href="/agent/" aria-label="返回 Agent 目录"><AgentSourceIcon name="i-ri-arrow-left-line" /></Link>
            <img src={repository ? `https://github.com/${avatarOwner}.png?size=96` : undefined} alt="" data-repo-avatar hidden={!repository} />
            <div><p><span>{owner}</span><i>/</i></p><h1>{name}</h1></div>
            <span className="agent-source-state" role="status" aria-live="polite"><i aria-hidden="true" /><span>连接中</span></span>
          </div>
          <div className="agent-knowledge-actions">
            <button type="button" className="agent-mobile-nav" aria-label="打开文档目录" aria-controls="agent-wiki-nav" aria-expanded="false"><AgentSourceIcon name="i-ri-menu-2-line" />目录</button>
            <button type="button" title={installable ? agentInstallCommand(repository) : `git clone https://github.com/${repository}.git`} hidden={!repository}><AgentSourceIcon name="i-ri-terminal-box-line" /><span>{installable ? "安装" : "克隆"}</span></button>
            <button type="button" className="agent-atlas-launch" aria-controls="agent-atlas" aria-expanded="false" aria-haspopup="dialog"><AgentSourceIcon name="i-ri-node-tree" />仓库地图</button>
            <a href={`https://github.com/${repository}`} target="_blank" rel="noopener" aria-label="在 GitHub 查看"><AgentSourceIcon name="i-uil-github-alt" /></a>
          </div>
        </div>
      </header>
      <div className="agent-reader-shell">
        <aside id="agent-wiki-nav" className="agent-wiki-nav" aria-label="知识库目录">
          <div className="agent-wiki-nav-head"><button type="button" aria-label="关闭文档目录"><AgentSourceIcon name="i-ri-close-line" /></button></div>
          <div className="agent-nav-search"><AgentSourceIcon name="i-ri-search-line" /><input type="search" placeholder="搜索章节" autoComplete="off" aria-label="搜索仓库文档章节" /><button type="button" aria-label="清空章节搜索" hidden><AgentSourceIcon name="i-ri-close-line" /></button><kbd>/</kbd></div>
          <nav className="agent-wiki-pages" aria-label="文档章节"><div className="agent-list-skeleton"><span /><span /><span /><span /></div><p className="agent-nav-search-empty" hidden>没有匹配的章节</p></nav>
          <div className="agent-nav-repo-card"><span>仓库</span><strong>{repository || "读取中…"}</strong><small>{description}</small><div><span><AgentSourceIcon name="i-ri-star-line" /><b>{skill ? formatAgentCount(skill.s) : "—"}</b></span><span>{skill?.language || "—"}</span></div></div>
        </aside>
        <section className="agent-wiki-main" aria-label="知识库正文">
          <div className="agent-reader-status" role="status"><span className="agent-pulse" />正在生成源码知识库…</div>
          <article className="agent-wiki-article prose"><div className="agent-article-skeleton" aria-label="正在读取文档"><span /><span /><span /><span /><span /><span /></div></article>
        </section>
        <aside className="agent-page-toc" aria-label="本页目录">
          <div className="agent-page-toc-inner"><nav data-page-toc aria-label="本页章节"><p>正文加载后显示标题</p></nav></div>
        </aside>
      </div>
      <>
        <button className="agent-atlas-scrim" type="button" tabIndex={-1} aria-hidden="true" aria-label="关闭仓库地图" />
        <div id="agent-atlas" className="agent-atlas" role="dialog" aria-modal="true" aria-label="仓库地图" tabIndex={-1} aria-hidden="true" inert>
          <div className="agent-atlas-resize" role="slider" aria-label="调整仓库地图宽度" aria-orientation="horizontal" aria-valuemin={680} aria-valuemax={1600} aria-valuenow={1120} tabIndex={0}><span aria-hidden="true" /></div>
          <header className="agent-atlas-head"><div className="agent-atlas-title"><AgentSourceIcon name="i-ri-git-repository-line" /><div><strong>{repository || "仓库"}</strong><small><span>HEAD</span><i>·</i><span>读取中</span></small></div></div><div><a href={repository ? `https://github.com/${repository}` : "https://github.com"} target="_blank" rel="noopener">GitHub<AgentSourceIcon name="i-ri-arrow-right-up-line" /></a><button type="button" aria-label="关闭仓库地图"><AgentSourceIcon name="i-ri-close-line" /></button></div></header>
          <div className="agent-atlas-tabs" role="tablist" aria-label="仓库地图视图"><button type="button" role="tab" className="is-active" aria-selected="true">概览</button><button type="button" role="tab" aria-selected="false">文档</button><button type="button" role="tab" aria-selected="false">文件</button></div>
          <div className="agent-atlas-body">
            <section role="tabpanel" data-atlas-panel="overview"><div className="agent-atlas-intro"><div><h2>先建立边界，再沿入口阅读关键流程</h2><p>正在核对仓库结构与模块边界…</p></div><button type="button">开始阅读</button></div>
              <div className="agent-overview-facts">{["星标", "派生", "关注", "主要语言", "许可证", "默认分支", "最近更新", "仓库状态"].map((label) => <div key={label}><span>{label}</span><strong>—</strong></div>)}</div>
              <section className="agent-map-section"><header><div><span className="agent-diagram-eyebrow">依赖关系</span><h3>项目依赖总览</h3><p>从 workspace 与 package.json 重建模块之间的真实依赖关系</p></div><small>读取中</small></header><div className="agent-repo-map diagram-design"><div className="agent-graph-hint">拖动画布 · 滚轮缩放</div><div className="agent-list-skeleton" aria-hidden="true"><span /><span /><span /></div></div></section>
              <section className="agent-map-section"><header><div><span>阅读路径</span><h3>建议从这里开始读</h3></div><small>按结构重要度排序</small></header><div className="agent-list-skeleton" aria-hidden="true"><span /><span /><span /></div></section>
            </section>
            <section role="tabpanel" data-atlas-panel="docs" hidden><div className="agent-atlas-section-head"><h2>代码库文档</h2><p>这里展示仓库中的 README、贡献指南与架构文档。选择后会切换到文件视图并直接回显内容。</p><small>正在整理文档…</small></div></section>
            <section role="tabpanel" data-atlas-panel="files" hidden><div className="agent-files-shell"><aside className="agent-file-browser"><div className="agent-file-browser-head"><div><strong>文件浏览器</strong><small>读取中</small></div></div><label className="agent-file-search"><AgentSourceIcon name="i-ri-search-line" /><input type="search" placeholder="搜索文件路径" /><kbd>/</kbd></label></aside><article className="agent-file-viewer"><header><div><strong>选择一个文件</strong></div><a href={`https://github.com/${repository}`} target="_blank" rel="noopener">查看源文件</a></header><div className="agent-file-content"><div className="agent-file-empty"><h3>选择文件开始阅读</h3><p>源码、Markdown 和图片都会留在博客内打开。</p></div></div></article></div></section>
          </div>
        </div>
      </>
    </div>
  );
}
