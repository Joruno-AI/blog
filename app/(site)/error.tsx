"use client";

import { useEffect } from "react";

export default function SiteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Public site render failed", error);
  }, [error]);

  return (
    <section className="site-shell site-state">
      <p className="site-kicker">加载异常</p>
      <h1>内容暂时没有准备好</h1>
      <p>数据服务出现了短暂波动，请稍后重试。</p>
      <button className="site-button site-button--primary" onClick={reset} type="button">
        重新加载
      </button>
    </section>
  );
}
