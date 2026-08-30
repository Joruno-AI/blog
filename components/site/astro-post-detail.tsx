import { notFound } from "next/navigation";

import { BlogArticleToc } from "@/components/site/blog-article-toc";
import { LegacyPageFooter } from "@/components/site/legacy-page-footer";
import { MarkdownContent } from "@/components/site/markdown-content";
import { SiteIcon } from "@/components/site/site-icon";
import { PageStructuredData } from "@/components/site/page-structured-data";
import { extractArticleHeadings } from "@/lib/parity/blog-reader";
import { legacyCanonicalPath } from "@/lib/parity/legacy-metadata";
import { legacyPostDisablesOgImage, legacyReadingMinutes, legacyStringList, parseLegacyPostMetadata } from "@/lib/parity/legacy-post";
import { getPublicResource } from "@/modules/resources/application/queries";
import type { PublishedResource } from "@/modules/resources/infrastructure/resource-repository";

const dateFormatter = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

export async function AstroPostDetail({
  path,
  resource: providedResource,
  canonicalPath,
}: {
  path?: string;
  resource?: PublishedResource;
  canonicalPath?: string;
}) {
  const resource = providedResource ?? (path ? await getPublicResource(path) : null);
  if (!resource) notFound();

  const metadata = parseLegacyPostMetadata(resource.metadataJson);
  const tags = legacyStringList(metadata.tags);
  const tocEnabled = metadata.toc !== false;
  const shareEnabled = metadata.share !== false;
  const headings = tocEnabled ? extractArticleHeadings(resource.content) : [];
  const minutes = legacyReadingMinutes(resource.content, metadata.sourcePath);
  const publicPath = legacyCanonicalPath(canonicalPath ?? resource.path);
  const canonicalUrl = `https://wangshengliang.cn${publicPath}`;
  const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(`Reading ${canonicalUrl}\n\nI think...`)}`;

  return (
    <>
      <PageStructuredData path={publicPath} title={resource.title} description={resource.description} publishedAt={resource.publishedAt} tags={tags} image={legacyPostDisablesOgImage(resource, metadata) ? null : "/og-images/og-image.png"} />
      <div className="post-reader-layout blog-parity-page astro-post-reader">
      <div className="astro-post-column">
        <header className="prose astro-post-header">
          <h1>{resource.title}</h1>
          <div className="post-meta-wrapper">
            <div className="post-meta-primary">
              {resource.publishedAt ? (
                <time dateTime={resource.publishedAt.toISOString()}>{dateFormatter.format(resource.publishedAt)}</time>
              ) : null}
              <span> · {minutes} min</span>
            </div>
            {tags.length ? (
              <div className="post-meta-tags">
                <SiteIcon name="price-tag-3-line" className="post-meta-tag-icon" />
                {tags.map((tag) => <span className="tag-item" key={tag}>{tag}</span>)}
              </div>
            ) : null}
          </div>
        </header>
        <article className="slide-enter-content prose astro-post-body">
          <MarkdownContent content={resource.content} className="astro-markdown" />
        </article>
      </div>
      {headings.length ? <BlogArticleToc headings={headings} /> : null}
      </div>
      <LegacyPageFooter>
        {shareEnabled ? <span className="astro-post-share">
          <span className="share-prompt">&gt; </span>
          <span>share on</span>{" "}
          <a href={shareUrl} title="Tweet this post" target="_blank" rel="noopener noreferrer">twitter</a>
        </span> : null}
      </LegacyPageFooter>
    </>
  );
}
