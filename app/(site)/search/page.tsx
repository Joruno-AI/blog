import type { Metadata } from "next";
import { Search } from "lucide-react";

import { ResourceList } from "@/components/site/resource-list";
import { searchPublicResources } from "@/modules/resources/application/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "搜索",
  description: "搜索公开的文章、知识、音乐与数字作品。",
  robots: { index: false, follow: true },
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const query = q.trim().slice(0, 120);
  const results = query ? await searchPublicResources(query, 50) : [];

  return (
    <section className="site-shell search-page">
      <header className="search-heading">
        <p className="site-kicker">全站检索</p>
        <h1>找到可以继续使用的内容</h1>
      </header>

      <form className="search-form" action="/search" method="get" role="search">
        <Search aria-hidden="true" />
        <input
          autoComplete="off"
          defaultValue={query}
          maxLength={120}
          name="q"
          placeholder="输入主题、技术或作品名称"
          type="search"
        />
        <button type="submit">搜索</button>
      </form>

      <div className="search-summary" aria-live="polite">
        {query ? `“${query}” 找到 ${results.length} 条结果` : "输入关键词，检索全部公开资源。"}
      </div>
      {query ? <ResourceList resources={results} emptyMessage="没有找到相关内容，试试更短的关键词。" /> : null}
    </section>
  );
}
