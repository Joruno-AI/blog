import type { Metadata } from "next";
import Link from "next/link";

import { BlogFilterView, type BlogIndexPost } from "@/components/site/blog-filter-view";
import { legacyMetadata } from "@/lib/parity/legacy-metadata";
import { getPublicContentSnapshot } from "@/lib/parity/public-content-snapshot";
import "@/app/blog-parity.css";

export const dynamic = "force-static";
const blogMetadata = legacyMetadata({
  title: "Blog",
  description: "Joruno 的个人博客，记录 Web 开发、Agent 工具与编程实践。",
  path: "/blog/",
  image: "/og-images/blog.png",
});
export const metadata: Metadata = {
  ...blogMetadata,
  other: { "twitter:url": "https://wangshengliang.cn/blog/" },
};

export default async function BlogPage() {
  const serializable: BlogIndexPost[] = getPublicContentSnapshot().articles.map((article) => ({
    id: article.id,
    title: article.title,
    slug: article.slug,
    categoryPath: article.categoryPath,
    categoryNamePath: article.categoryNamePath,
    pubDate: article.publishedAt,
    minutesRead: article.minutesRead,
  }));
  return (
    <>
      <div className="astro-blog-index blog-parity-page">
        <header className="prose">
          <h1>Blog</h1>
          <p className="subtitle">力求一字稳，耐得半宵寒</p>
        </header>
        <div className="slide-enter-content prose blog-index-shell">
          <BlogFilterView posts={serializable} />
        </div>
      </div>
      <footer className="slide-enter prose blog-index-base-footer">
        <br />
        <Link className="blog-index-back-link" href="/" />
      </footer>
    </>
  );
}
