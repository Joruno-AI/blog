import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";

import { BlogReaderSidebar } from "@/components/site/blog-reader-sidebar";
import { AstroMarkdownContent } from "@/components/site/astro-markdown-content";
import { PageStructuredData } from "@/components/site/page-structured-data";
import {
  PublicArticleActionsHydrator,
  PublicArticleTocHydrator,
  PublicMarkdownHydrator,
  PublicResourceContentProvider,
} from "@/components/site/public-resource-content";
import { SiteIcon } from "@/components/site/site-icon";
import {
  getPublicPostSummariesWithCategoryPath,
  getPublicPostSummaryBySlug,
} from "@/lib/db/queries/posts";
import { sortBlogReaderPosts, type BlogReaderPost } from "@/lib/parity/blog-reader";
import { legacyMetadata } from "@/lib/parity/legacy-metadata";
import { parseLegacyPostMetadata } from "@/lib/parity/legacy-post";
import type { AstroMarkdownTree } from "@/lib/parity/astro-markdown-tree";
import { getBuildOnlyPublicContent } from "@/lib/parity/public-content-build";
import { collectAllPages } from "@/lib/parity/public-endpoints";
import {
  getPublicContentSnapshot,
  getSnapshotArticle,
  snapshotResourceDate,
  type PublicContentArticleSummary,
} from "@/lib/parity/public-content-snapshot";
import {
  getPublicRedirect,
  getPublicResource,
} from "@/modules/resources/application/queries";
import "@/app/blog-parity.css";

export const dynamicParams = true;

type ArticlePageProps = {
  params: Promise<{ slug: string[] }>;
};

type ArticleListItem = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  categoryPath: string | null;
  categoryNamePath: string | null;
  publishedAt: Date | null;
  minutesRead: number;
  tags: string[];
};

type ArticleView = ArticleListItem & {
  path: string;
  subtitle: string | null;
  ogImage: string | false | null;
  categoryName: string | null;
  toc: boolean;
  share: boolean;
};

type ArticleDetailView = ArticleView & {
  initialContent: string;
  initialRevisionId: string;
  initialAstroMarkdownTree: AstroMarkdownTree | null;
};

function articlePath(slug: string[]) {
  return `/blog/${slug.map((segment) => decodeURIComponent(segment)).join("/")}`;
}

function articleFromSnapshot(article: PublicContentArticleSummary): ArticleView {
  return {
    id: article.id,
    title: article.title,
    slug: article.slug,
    path: article.path,
    description: article.description,
    subtitle: article.subtitle,
    ogImage: article.ogImage,
    categoryName: article.categoryName,
    categoryPath: article.categoryPath,
    categoryNamePath: article.categoryNamePath,
    publishedAt: snapshotResourceDate(article.publishedAt),
    minutesRead: article.minutesRead,
    tags: article.tags,
    toc: article.toc,
    share: article.share,
  };
}

function snapshotArticleList(): ArticleListItem[] {
  return getPublicContentSnapshot().articles.map(articleFromSnapshot);
}

const SITE_DESCRIPTION = "Joruno 的个人博客，记录 Web 开发、Agent 工具与编程实践。";

function resolveArticleOgImage(path: string, value: unknown): string | false {
  if (value === false) return false;
  if (value === "fallback") return "/og-images/og-image.png";
  if (typeof value === "string" && value.trim()) {
    const filename = value.trim().replace(/^og-images\//, "");
    return `/og-images/${filename}`;
  }
  return `/og-images${path}.png`;
}

export function generateStaticParams() {
  return getPublicContentSnapshot().articles.map((article) => ({
    slug: article.slug.split("/"),
  }));
}

async function dynamicArticle(path: string): Promise<ArticleDetailView> {
  const resource = await getPublicResource(path);
  if (!resource) {
    const redirect = await getPublicRedirect(path);
    if (redirect) permanentRedirect(redirect.toPath);
    notFound();
  }
  if (resource.type !== "article") notFound();

  const post = await getPublicPostSummaryBySlug(resource.slug, {
    allowUnlisted: resource.visibility === "unlisted",
  });
  if (!post) notFound();
  const metadata = parseLegacyPostMetadata(resource.metadataJson);
  return {
    id: resource.id,
    title: resource.title,
    slug: resource.slug,
    path: resource.path,
    description: resource.description,
    subtitle: post.subtitle,
    ogImage: metadata.ogImage === false
      ? false
      : typeof metadata.ogImage === "string"
        ? metadata.ogImage
        : null,
    categoryName: post.category?.name ?? null,
    categoryPath: null,
    categoryNamePath: post.category?.name ?? null,
    publishedAt: resource.publishedAt,
    minutesRead: post.minutesRead || 1,
    tags: post.postTags.map(({ tag }) => tag.name),
    toc: post.toc,
    share: post.share,
    initialContent: resource.content,
    initialRevisionId: resource.revisionId,
    initialAstroMarkdownTree: null,
  } satisfies ArticleDetailView;
}

async function articleForPath(path: string) {
  const prebuilt = getSnapshotArticle(path);
  return prebuilt ? articleFromSnapshot(prebuilt) : dynamicArticle(path);
}

async function articleDetailForPath(
  path: string,
  prebuilt: PublicContentArticleSummary | null,
): Promise<ArticleDetailView> {
  if (prebuilt) {
    const content = getBuildOnlyPublicContent(prebuilt.path, prebuilt.revisionId);
    if (content?.type === "article") {
      return {
        ...articleFromSnapshot(prebuilt),
        initialContent: content.content,
        initialRevisionId: content.revisionId,
        initialAstroMarkdownTree: content.astroMarkdownTree,
      };
    }
  }
  // The build corpus is intentionally absent in the Worker. Dynamic paths or
  // an unexpected static-cache miss therefore read the current D1 body.
  return dynamicArticle(path);
}

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = await articleForPath(articlePath(slug));
  const canonicalPath = article.path.endsWith("/") ? article.path : `${article.path}/`;
  const metadata = legacyMetadata({
    title: article.title,
    description: article.description ?? SITE_DESCRIPTION,
    path: canonicalPath,
    image: resolveArticleOgImage(article.path, article.ogImage),
    article: { publishedAt: article.publishedAt, tags: article.tags },
  });

  const articleOpenGraph = metadata.openGraph as { type?: string; section?: string } | null | undefined;
  if (articleOpenGraph?.type === "article" && article.categoryName) {
    articleOpenGraph.section = article.categoryName;
  }
  metadata.other = {
    "twitter:url": new URL(canonicalPath, "https://wangshengliang.cn").href,
  };
  return metadata;
}

async function dynamicArticleList(): Promise<ArticleListItem[]> {
  const posts = await collectAllPages(
    (offset, limit) => getPublicPostSummariesWithCategoryPath({ offset, limit }),
    500,
  );
  return posts.map((post) => ({
    id: post.id,
    title: post.title,
    slug: post.slug,
    description: post.excerpt,
    categoryPath: post.categoryPath,
    categoryNamePath: post.categoryNamePath,
    publishedAt: post.pubDate,
    minutesRead: post.minutesRead || 1,
    tags: post.postTags.map(({ tag }) => tag.name),
  }));
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;
  const path = articlePath(slug);
  const prebuilt = getSnapshotArticle(path);
  const [article, allPosts] = await Promise.all([
    articleDetailForPath(path, prebuilt),
    prebuilt ? Promise.resolve(snapshotArticleList()) : dynamicArticleList(),
  ]);

  const readerPosts = sortBlogReaderPosts(allPosts.map((post): BlogReaderPost => ({
    id: post.id,
    title: post.title,
    slug: post.slug,
    categoryPath: post.categoryPath || "杂谈",
    categoryNamePath: post.categoryNamePath || "杂谈",
  })));
  const currentIndex = readerPosts.findIndex((post) => post.id === article.id);
  const current = currentIndex >= 0 ? readerPosts[currentIndex] : null;
  const previous = currentIndex > 0 ? readerPosts[currentIndex - 1] : null;
  const next = currentIndex >= 0 ? readerPosts[currentIndex + 1] : null;
  const currentTagSet = new Set(article.tags);
  const relatedPosts = currentTagSet.size
    ? allPosts
        .filter((post) => post.id !== article.id)
        .map((post) => ({
          post,
          shared: post.tags.reduce((count, tag) => count + Number(currentTagSet.has(tag)), 0),
        }))
        .filter(({ shared }) => shared > 0)
        .sort((a, b) => b.shared - a.shared || (b.post.publishedAt?.valueOf() ?? 0) - (a.post.publishedAt?.valueOf() ?? 0))
        .slice(0, 3)
        .map(({ post }) => post)
    : [];
  const canonicalPath = article.path.endsWith("/") ? article.path : `${article.path}/`;
  // Astro builds share targets from its already percent-encoded pathname;
  // preserve that representation before the provider URL encodes it again.
  const absoluteUrl = `https://wangshengliang.cn${canonicalPath.split("/").map((segment) => encodeURIComponent(segment)).join("/")}`;
  const ogImagePath = `/og-images${article.path}.png`;
  const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(`Reading ${absoluteUrl}\n\nI think...`)}`;

  return (
    <>
      <PageStructuredData path={canonicalPath} title={article.title} description={article.description} publishedAt={article.publishedAt} tags={article.tags} category={current?.categoryNamePath ?? null} image={ogImagePath} />
      <PublicResourceContentProvider
        resourcePath={article.path}
        expectedType="article"
        initialContent={article.initialContent}
        initialRevisionId={article.initialRevisionId}
      >
        <div className="blog-reader-layout blog-parity-page">
          <BlogReaderSidebar posts={readerPosts} currentId={article.id} />
          <div className="blog-reader-main">
            <header className="prose blog-reader-header">
              <h1 className="blog-article-title">{article.title}</h1>
              {article.subtitle ? <p className="blog-article-subtitle">{article.subtitle}</p> : null}
              <div className="blog-post-meta-wrapper">
                <div className="blog-post-meta">
                  {article.publishedAt ? (
                    <time dateTime={article.publishedAt.toISOString()}>
                      {new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "long", day: "numeric" }).format(article.publishedAt)}
                    </time>
                  ) : null}
                  <span> · {Math.ceil(article.minutesRead)} min</span>
                </div>
                {article.tags.length ? (
                  <div className="blog-post-tags">
                    <SiteIcon name="price-tag-3-line" className="blog-post-tag-icon" />
                    {article.tags.map((tag) => <span className="tag-item" key={tag}>{tag}</span>)}
                  </div>
                ) : null}
              </div>
              <PublicArticleActionsHydrator url={absoluteUrl} title={article.title} />
            </header>
            <article className="prose blog-article-body">
              <PublicMarkdownHydrator
                className="astro-markdown reader-content"
                initialRevisionId={article.initialRevisionId}
              >
                {article.initialAstroMarkdownTree ? (
                  <AstroMarkdownContent
                    tree={article.initialAstroMarkdownTree}
                    className="astro-markdown reader-content"
                    revisionKey={article.initialRevisionId}
                  />
                ) : null}
              </PublicMarkdownHydrator>
              {relatedPosts.length ? (
                <section className="related-posts" aria-label="相关文章">
                  <h2 className="related-posts-title">相关文章</h2>
                  <ul className="related-posts-list">
                    {relatedPosts.map((post) => (
                      <li key={post.id}>
                        <Link className="related-post-link" href={`/blog/${post.slug}/`}>
                          <span className="related-post-name">{post.title}</span>
                          {post.description ? <span className="related-post-desc">{post.description}</span> : null}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
              <nav className="post-neighbor-nav" aria-label="文章导航">
                <Link className="post-neighbor-back" href="/blog/">
                  <SiteIcon name="arrow-left-line" />
                  <span>返回 Blog</span>
                  {current ? <span className="post-neighbor-category">{current.categoryNamePath.split("/").at(-1)}</span> : null}
                </Link>
                <div className="post-neighbor-links">
                  {previous ? (
                    <Link className="post-neighbor-link" href={`/blog/${previous.slug}/`} rel="prev">
                      <span className="post-neighbor-label">上一篇</span><span className="post-neighbor-title">{previous.title}</span>
                    </Link>
                  ) : (
                    <span className="post-neighbor-link is-disabled" aria-hidden="true">
                      <span className="post-neighbor-label">上一篇</span><span className="post-neighbor-title">已经是第一篇</span>
                    </span>
                  )}
                  {next ? (
                    <Link className="post-neighbor-link align-right" href={`/blog/${next.slug}/`} rel="next">
                      <span className="post-neighbor-label">下一篇</span><span className="post-neighbor-title">{next.title}</span>
                    </Link>
                  ) : (
                    <span className="post-neighbor-link align-right is-disabled" aria-hidden="true">
                      <span className="post-neighbor-label">下一篇</span><span className="post-neighbor-title">已经是最后一篇</span>
                    </span>
                  )}
                </div>
              </nav>
            </article>
          </div>
          <PublicArticleTocHydrator tocEnabled={article.toc} />
        </div>
      </PublicResourceContentProvider>
      <footer className="prose blog-post-share slide-enter">
        {article.share ? (
          <>
            <span className="share-prompt">&gt; </span>
            <span>share on</span>{" "}
            <a href={shareUrl} title="Tweet this post" target="_blank" rel="noopener noreferrer">twitter</a>
          </>
        ) : null}
        <br />
        <Link className="site-link no-underline font-mono" href="/blog/" />
      </footer>
    </>
  );
}
