import type { Metadata } from "next";
import Link from "next/link";
import { Menu } from "lucide-react";
import { notFound, permanentRedirect } from "next/navigation";

import { ArticleActions } from "@/components/site/article-actions";
import { BlogReaderSidebar } from "@/components/site/blog-reader-sidebar";
import { MarkdownContent } from "@/components/site/markdown-content";
import { getPublicRedirect, getPublicResource } from "@/modules/resources/application/queries";
import { getRequestViewer } from "@/lib/auth/request-viewer";
import { getPostsWithCategoryPath } from "@/lib/db/queries/posts";
import { extractArticleHeadings, sortBlogReaderPosts, type BlogReaderPost } from "@/lib/parity/blog-reader";

export const dynamic = "force-dynamic";

type ArticlePageProps = {
  params: Promise<{ slug: string[] }>;
};

function articlePath(slug: string[]) {
  return `/blog/${slug.map((segment) => decodeURIComponent(segment)).join("/")}`;
}

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const path = articlePath(slug);
  const resource = await getPublicResource(path, await getRequestViewer());
  if (!resource) {
    const redirect = await getPublicRedirect(path);
    if (redirect) permanentRedirect(redirect.toPath);
    notFound();
  }
  if (resource.type !== "article") notFound();

  return {
    title: resource.title,
    description: resource.description ?? undefined,
    alternates: { canonical: resource.path },
    openGraph: {
      type: "article",
      title: resource.title,
      description: resource.description ?? undefined,
      publishedTime: resource.publishedAt?.toISOString(),
      url: resource.path,
    },
  };
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;
  const path = articlePath(slug);
  const resource = await getPublicResource(path, await getRequestViewer());
  if (!resource) {
    const redirect = await getPublicRedirect(path);
    if (redirect) permanentRedirect(redirect.toPath);
    notFound();
  }
  if (resource.type !== "article") notFound();

  const allPosts = await getPostsWithCategoryPath({ limit: 1000, draft: false });
  const readerPosts = sortBlogReaderPosts(allPosts.map((post): BlogReaderPost => ({
    id: post.id,
    title: post.title,
    slug: post.slug,
    categoryPath: post.categoryPath || "杂谈",
    categoryNamePath: post.categoryNamePath || "杂谈",
  })));
  const currentIndex = readerPosts.findIndex((post) => post.id === resource.id);
  const current = currentIndex >= 0 ? readerPosts[currentIndex] : null;
  const previous = currentIndex > 0 ? readerPosts[currentIndex - 1] : null;
  const next = currentIndex >= 0 ? readerPosts[currentIndex + 1] : null;
  const headings = extractArticleHeadings(resource.content);
  const published = allPosts.find((post) => post.id === resource.id);
  const minutesRead = published?.minutesRead || Math.max(1, Math.ceil(resource.content.length / 900));
  const absoluteUrl = `https://wangshengliang.cn${resource.path}`;

  return (
    <div className="blog-reader-layout">
      <BlogReaderSidebar posts={readerPosts} currentId={resource.id} />
      <div className="blog-reader-main">
        <header className="prose blog-reader-header">
          <h1 className="blog-article-title">{resource.title}</h1>
          <div className="blog-post-meta">
          {resource.publishedAt ? (
            <time dateTime={resource.publishedAt.toISOString()}>
              {new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "long", day: "numeric" }).format(resource.publishedAt)}
            </time>
          ) : null}
            <span>·</span><span>{Math.ceil(minutesRead)} min</span>
          </div>
          <ArticleActions markdown={resource.content} url={absoluteUrl} title={resource.title} />
        </header>
        <article className="prose blog-article-body">
          <MarkdownContent content={resource.content} className="astro-markdown" />
          <nav className="post-neighbor-nav" aria-label="文章导航">
            <Link className="post-neighbor-back" href="/blog">← <span>返回 Blog</span>{current ? <small>/ {current.categoryNamePath.split("/").at(-1)}</small> : null}</Link>
            <div className="post-neighbor-links">
              {previous ? <Link className="post-neighbor-link" href={`/blog/${previous.slug}`}><small>上一篇</small><span>{previous.title}</span></Link> : <span className="post-neighbor-link disabled"><small>上一篇</small><span>已经是第一篇</span></span>}
              {next ? <Link className="post-neighbor-link next" href={`/blog/${next.slug}`}><small>下一篇</small><span>{next.title}</span></Link> : <span className="post-neighbor-link next disabled"><small>下一篇</small><span>已经是最后一篇</span></span>}
            </div>
          </nav>
        </article>
      </div>
      {headings.length ? <aside className="article-toc" aria-label="文章目录"><Menu aria-hidden="true" />
        <nav>{headings.map((heading, index) => <a className={heading.depth === 3 ? "depth-3" : ""} href={`#${heading.id}`} key={`${heading.id}-${index}`}>{heading.text}</a>)}</nav>
      </aside> : null}
    </div>
  );
}
