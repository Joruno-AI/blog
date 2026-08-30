"use client";

import { useEffect } from "react";

import {
  canRetryStaleClientAsset,
  isStaleClientAssetError,
  STALE_ASSET_RELOAD_KEY,
} from "@/lib/platform/stale-client-assets";

export default function SiteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const staleClientAsset = isStaleClientAssetError(error);

  useEffect(() => {
    console.error("Public site render failed", error);

    if (!staleClientAsset) return;
    try {
      const lastAttempt = window.sessionStorage.getItem(STALE_ASSET_RELOAD_KEY);
      if (!canRetryStaleClientAsset(lastAttempt)) return;
      window.sessionStorage.setItem(STALE_ASSET_RELOAD_KEY, String(Date.now()));
    } catch {
      // Keep the visible hard-reload action when storage is unavailable rather
      // than risking an automatic reload loop.
      return;
    }
    window.location.reload();
  }, [error, staleClientAsset]);

  const reload = () => {
    if (staleClientAsset) {
      window.location.reload();
      return;
    }
    reset();
  };

  return (
    <section className="site-shell site-state">
      <p className="site-kicker">{staleClientAsset ? "版本已更新" : "加载异常"}</p>
      <h1>{staleClientAsset ? "正在载入最新页面" : "内容暂时没有准备好"}</h1>
      <p>{staleClientAsset ? "页面资源已更新，正在自动重新加载。" : "数据服务出现了短暂波动，请稍后重试。"}</p>
      <button className="site-button site-button--primary" onClick={reload} type="button">
        {staleClientAsset ? "立即刷新" : "重新加载"}
      </button>
    </section>
  );
}
