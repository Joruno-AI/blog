"use client";

import { Github } from "lucide-react";
import { useState } from "react";

export function AgentRepositoryGateway() {
  const [repo, setRepo] = useState("");
  const open = () => {
    const normalized = repo.trim().replace(/^https?:\/\/github\.com\//, "").replace(/\.git$/, "").replace(/\/$/, "");
    if (/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(normalized)) window.location.assign(`/agent/${normalized}`);
  };
  return <div className="agent-tool-page"><section className="agent-tool-hero"><div><span className="agent-tool-kicker">REPOSITORY READER</span><h1>在博客内阅读仓库</h1></div><p>输入 GitHub 仓库，优先打开已同步的 README 知识页；其他项目则显示全量索引信息与源码入口。</p></section><form className="agent-tool-form" onSubmit={(event) => { event.preventDefault(); open(); }}><label className="agent-tool-field"><Github /><input value={repo} onChange={(event) => setRepo(event.target.value)} placeholder="owner/repository" aria-label="GitHub 仓库" /></label><button className="agent-tool-primary" type="submit">打开知识库</button></form></div>;
}
