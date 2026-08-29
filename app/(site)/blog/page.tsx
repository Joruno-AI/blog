import type { Metadata } from "next";

import { BlogFilterView, type BlogIndexPost } from "@/components/site/blog-filter-view";
import { getPostsWithCategoryPath } from "@/lib/db/queries/posts";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Blog", description: "力求一字稳，耐得半宵寒", alternates: { canonical: "/blog" } };

export default async function BlogPage() {
  const posts = await getPostsWithCategoryPath({ limit: 1000, draft: false });
  const serializable: BlogIndexPost[] = posts.map((post) => ({
    id: post.id,
    title: post.title,
    slug: post.slug,
    categoryPath: post.categoryPath,
    categoryNamePath: post.categoryNamePath,
    pubDate: post.pubDate?.toISOString() ?? null,
    minutesRead: post.minutesRead,
  }));
  return <div className="astro-blog-index"><header className="prose standard-header"><h1>Blog</h1><p className="subtitle">力求一字稳，耐得半宵寒</p></header><BlogFilterView posts={serializable} /></div>;
}
