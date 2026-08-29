"use client";

import { Bot, Check, Copy, Maximize2, Minimize2 } from "lucide-react";
import { useState } from "react";

export function ArticleActions({ markdown, url, title }: { markdown: string; url: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const [immersive, setImmersive] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(markdown);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  function toggleImmersive() {
    const next = !immersive;
    setImmersive(next);
    document.documentElement.toggleAttribute("data-immersive", next);
  }

  const prompt = encodeURIComponent(`请阅读并讨论这篇文章：${title}\n${url}`);
  return <div className="article-actions" aria-label="文章操作">
    <button type="button" onClick={copy}>{copied ? <Check /> : <Copy />}<span>{copied ? "已复制" : "复制"}</span></button>
    <a href={`https://chatgpt.com/?q=${prompt}`} target="_blank" rel="noreferrer"><Bot /><span>用 AI 打开</span></a>
    <button type="button" onClick={toggleImmersive}>{immersive ? <Minimize2 /> : <Maximize2 />}<span>{immersive ? "退出沉浸" : "沉浸阅读"}</span></button>
  </div>;
}
