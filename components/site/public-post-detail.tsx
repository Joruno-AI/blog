import { LegacyPageFooter } from "@/components/site/legacy-page-footer";
import { PageStructuredData } from "@/components/site/page-structured-data";
import {
  PublicArticleTocHydrator,
  PublicMarkdownHydrator,
  PublicResourceContentProvider,
} from "@/components/site/public-resource-content";
import { SiteIcon } from "@/components/site/site-icon";
import { legacyCanonicalPath } from "@/lib/parity/legacy-metadata";
import { legacyStringList, parseLegacyPostMetadata } from "@/lib/parity/legacy-post";
import type { ResourceType } from "@/modules/resources/domain/types";

export type PublicPostShellResource = {
  id: string;
  type: ResourceType;
  title: string;
  path: string;
  description: string | null;
  publishedAt: Date | null;
  metadataJson: string;
  minutesRead: number;
  tags?: string[];
  toc?: boolean;
  share?: boolean;
};

const dateFormatter = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

export function PublicPostDetail({
  resource,
  canonicalPath,
  resourcePath = resource.path,
  initialContent,
  initialRevisionId,
}: {
  resource: PublicPostShellResource;
  canonicalPath: string;
  resourcePath?: string;
  initialContent: string;
  initialRevisionId: string;
}) {
  const metadata = parseLegacyPostMetadata(resource.metadataJson);
  const tags = resource.tags ?? legacyStringList(metadata.tags);
  const tocEnabled = resource.toc ?? metadata.toc !== false;
  const shareEnabled = resource.share ?? metadata.share !== false;
  const publicPath = legacyCanonicalPath(canonicalPath);
  const canonicalUrl = `https://wangshengliang.cn${publicPath}`;
  const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(`Reading ${canonicalUrl}\n\nI think...`)}`;
  const sourcePath = metadata.sourcePath;
  const disablesOgImage = metadata.ogImage === false
    || (typeof sourcePath === "string" && /^src\/content\/(?:changelog|shorts)\//.test(sourcePath));

  return (
    <>
      <PageStructuredData path={publicPath} title={resource.title} description={resource.description} publishedAt={resource.publishedAt} tags={tags} image={disablesOgImage ? null : "/og-images/og-image.png"} />
      <PublicResourceContentProvider
        resourcePath={resourcePath}
        expectedType={resource.type}
        initialContent={initialContent}
        initialRevisionId={initialRevisionId}
      >
        <div className="post-reader-layout blog-parity-page astro-post-reader">
          <div className="astro-post-column">
            <header className="prose astro-post-header">
              <h1>{resource.title}</h1>
              <div className="post-meta-wrapper">
                <div className="post-meta-primary">
                  {resource.publishedAt ? (
                    <time dateTime={resource.publishedAt.toISOString()}>{dateFormatter.format(resource.publishedAt)}</time>
                  ) : null}
                  <span> · {resource.minutesRead} min</span>
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
              <PublicMarkdownHydrator className="astro-markdown" />
            </article>
          </div>
          <PublicArticleTocHydrator tocEnabled={tocEnabled} />
        </div>
      </PublicResourceContentProvider>
      <LegacyPageFooter>
        {shareEnabled ? (
          <span className="astro-post-share">
            <span className="share-prompt">&gt; </span>
            <span>share on</span>{" "}
            <a href={shareUrl} title="Tweet this post" target="_blank" rel="noopener noreferrer">twitter</a>
          </span>
        ) : null}
      </LegacyPageFooter>
    </>
  );
}
