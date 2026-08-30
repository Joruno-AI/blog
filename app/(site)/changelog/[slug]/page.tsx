import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PublicPostDetail, type PublicPostShellResource } from "@/components/site/public-post-detail";
import { legacyMetadata } from "@/lib/parity/legacy-metadata";
import {
  changelogCanonicalPath,
  legacyReadingMinutes,
  legacyStringList,
  parseLegacyPostMetadata,
} from "@/lib/parity/legacy-post";
import { getBuildOnlyPublicContent } from "@/lib/parity/public-content-build";
import {
  getPublicContentSnapshot,
  getSnapshotChangelog,
  snapshotResourceDate,
  type PublicContentResourceSummary,
} from "@/lib/parity/public-content-snapshot";
import { getPublicChangelogResourceBySlug } from "@/modules/resources/application/queries";
import "@/app/blog-parity.css";
import "@/app/post-parity.css";

export const dynamicParams = true;

type Props = { params: Promise<{ slug: string }> };

type ChangelogShell = PublicPostShellResource & { slug: string };
type ChangelogPageData = {
  slug: string;
  resource: ChangelogShell | null;
  initialContent: string | null;
  initialRevisionId: string | null;
};

function fromSnapshot(resource: PublicContentResourceSummary): ChangelogShell {
  return {
    id: resource.id,
    type: resource.type,
    title: resource.title,
    slug: resource.slug,
    path: resource.path,
    description: resource.description,
    publishedAt: snapshotResourceDate(resource.publishedAt),
    metadataJson: resource.metadataJson,
    minutesRead: resource.minutesRead,
    tags: resource.tags,
    toc: resource.toc,
    share: resource.share,
  };
}

export function generateStaticParams() {
  return getPublicContentSnapshot().changelog.map((resource) => ({ slug: resource.slug }));
}

async function changelogResource(params: Props["params"]): Promise<ChangelogPageData> {
  const slug = decodeURIComponent((await params).slug);
  const publicPath = changelogCanonicalPath(slug);
  const prebuilt = getSnapshotChangelog(publicPath.replace(/\/$/, ""));
  if (prebuilt) {
    const content = getBuildOnlyPublicContent(prebuilt.path, prebuilt.revisionId);
    if (content?.type === "document") {
      return {
        slug,
        resource: fromSnapshot(prebuilt),
        initialContent: content.content,
        initialRevisionId: content.revisionId,
      };
    }
  }

  const resource = await getPublicChangelogResourceBySlug(slug);
  if (!resource) {
    return { slug, resource: null, initialContent: null, initialRevisionId: null };
  }
  const metadata = parseLegacyPostMetadata(resource.metadataJson);
  return {
    slug,
    resource: {
      id: resource.id,
      type: resource.type,
      title: resource.title,
      slug: resource.slug,
      path: resource.path,
      description: resource.description,
      publishedAt: resource.publishedAt,
      metadataJson: resource.metadataJson,
      minutesRead: legacyReadingMinutes(resource.content, metadata.sourcePath),
      tags: legacyStringList(metadata.tags),
      toc: metadata.toc !== false,
      share: metadata.share !== false,
    } satisfies ChangelogShell,
    initialContent: resource.content,
    initialRevisionId: resource.revisionId,
  };
}

function disablesOgImage(metadata: Record<string, unknown>) {
  if (metadata.ogImage === false) return true;
  return typeof metadata.sourcePath === "string"
    && /^src\/content\/(?:changelog|shorts)\//.test(metadata.sourcePath);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, resource } = await changelogResource(params);
  if (!resource) notFound();
  const path = changelogCanonicalPath(slug);
  const postMetadata = parseLegacyPostMetadata(resource.metadataJson);
  return legacyMetadata({
    title: resource.title,
    description: resource.description ?? "",
    path,
    image: disablesOgImage(postMetadata) ? false : `/og-images${path.replace(/\/$/, "")}.png`,
    article: {
      publishedAt: resource.publishedAt,
      tags: resource.tags ?? legacyStringList(postMetadata.tags),
    },
  });
}

export default async function Page({ params }: Props) {
  const { slug, resource, initialContent, initialRevisionId } = await changelogResource(params);
  if (!resource || initialContent === null || initialRevisionId === null) notFound();
  const canonicalPath = changelogCanonicalPath(slug);
  return (
    <PublicPostDetail
      resource={resource}
      canonicalPath={canonicalPath}
      resourcePath={canonicalPath.replace(/\/$/, "")}
      initialContent={initialContent}
      initialRevisionId={initialRevisionId}
    />
  );
}
