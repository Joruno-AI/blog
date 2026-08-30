import Link from "next/link";

export function DocsReaderLoadingShell() {
  return (
    <div className="reader-shell docs-reader-loading" aria-label="正在加载文档阅读器">
      <div className="reader-layout">
        <aside id="reader-course-panel" className="reader-course-panel" hidden>
          <div className="reader-aside-heading"><Link href="/docs/">本课程</Link></div>
        </aside>
        <div className="reader-main">
          <nav className="reader-breadcrumb" aria-label="面包屑"><Link href="/docs/">Docs</Link><span aria-hidden="true">/</span><Link href="/docs/"><span className="sr-only">课程</span></Link></nav>
          <header className="reader-header">
            <div className="reader-header-content">
              <h1><span className="sr-only">正在加载文档</span></h1>
              <div className="reader-actions" hidden>
                <div className="post-actions">
                  <button type="button" className="post-action">复制</button>
                  <div className="post-action-menu">
                    <button type="button" className="post-action">用 AI 打开</button>
                    <div className="post-action-dropdown" hidden><a href="https://chatgpt.com/">ChatGPT</a><a href="https://claude.ai/new">Claude</a></div>
                  </div>
                  <button type="button" className="post-action post-action-immersive">沉浸阅读</button>
                </div>
                <button type="button" className="reader-mindmap-trigger">思维导图</button>
              </div>
            </div>
          </header>
          <div className="reader-state" aria-live="polite"><span className="sr-only">正在从内容快照加载正文</span><div className="reader-skeleton" aria-hidden="true" /></div>
          <nav className="reader-neighbors" aria-label="章节导航" hidden><Link href="/docs/">上一篇</Link><Link href="/docs/">下一篇</Link></nav>
        </div>
        <aside id="reader-toc-panel" className="reader-toc-panel" hidden><div className="reader-aside-heading">本页目录</div></aside>
      </div>
      <dialog id="reader-mindmap-dialog" className="reader-mindmap-dialog diagram-design" aria-labelledby="reader-mindmap-title">
        <section className="reader-mindmap-shell">
          <header className="reader-mindmap-header"><div className="reader-mindmap-heading"><span className="reader-mindmap-kicker">文章导图</span><h2 id="reader-mindmap-title">思维导图</h2></div><button type="button" className="reader-mindmap-fit">适应</button></header>
          <p className="reader-mindmap-hint">点击节点即可跳转到对应章节，放大后可滚动查看。</p>
        </section>
      </dialog>
    </div>
  );
}
