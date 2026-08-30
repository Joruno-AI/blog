import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PublicPostDetail, type PublicPostShellResource } from "@/components/site/public-post-detail";
import { legacyMetadata } from "@/lib/parity/legacy-metadata";
import {
  legacyReadingMinutes,
  legacyStringList,
  parseLegacyPostMetadata,
} from "@/lib/parity/legacy-post";
import { getBuildOnlyPublicContent } from "@/lib/parity/public-content-build";
import {
  getPublicContentSnapshot,
  getSnapshotShort,
  snapshotResourceDate,
  type PublicContentResourceSummary,
} from "@/lib/parity/public-content-snapshot";
import { getPublicResource } from "@/modules/resources/application/queries";
import "@/app/blog-parity.css";
import "@/app/post-parity.css";

export const dynamicParams = true;

type PageProps = { params: Promise<{ slug: string[] }> };
type ShortShell = PublicPostShellResource & { slug: string };
type ShortPageData = {
  resource: ShortShell;
  initialContent: string;
  initialRevisionId: string;
};

function resourcePath(params: PageProps["params"]) {
  return params.then(({ slug }) => "/shorts/" + slug.map(decodeURIComponent).join("/"));
}

function fromSnapshot(resource: PublicContentResourceSummary): ShortShell {
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
  return getPublicContentSnapshot().shorts.map((resource) => ({
    slug: resource.slug.split("/"),
  }));
}

async function shortForPath(path: string): Promise<ShortPageData | null> {
  const prebuilt = getSnapshotShort(path);
  if (prebuilt) {
    const content = getBuildOnlyPublicContent(prebuilt.path, prebuilt.revisionId);
    if (content?.type === "short") {
      return {
        resource: fromSnapshot(prebuilt),
        initialContent: content.content,
        initialRevisionId: content.revisionId,
      };
    }
  }
  const resource = await getPublicResource(path);
  if (!resource || resource.type !== "short") return null;
  const metadata = parseLegacyPostMetadata(resource.metadataJson);
  return {
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
    },
    initialContent: resource.content,
    initialRevisionId: resource.revisionId,
  };
}

function disablesOgImage(metadata: Record<string, unknown>) {
  if (metadata.ogImage === false) return true;
  return typeof metadata.sourcePath === "string"
    && /^src\/content\/(?:changelog|shorts)\//.test(metadata.sourcePath);
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const path = await resourcePath(params);
  const result = await shortForPath(path);
  if (!result) notFound();
  const { resource } = result;
  const postMetadata = parseLegacyPostMetadata(resource.metadataJson);
  return legacyMetadata({
    title: resource.title,
    description: resource.description ?? "",
    path,
    image: disablesOgImage(postMetadata) ? false : `/og-images${path}.png`,
    article: {
      publishedAt: resource.publishedAt,
      tags: resource.tags ?? legacyStringList(postMetadata.tags),
    },
  });
}

export default async function Page({ params }: PageProps) {
  const path = await resourcePath(params);
  const result = await shortForPath(path);
  if (!result) notFound();
  return (
    <PublicPostDetail
      resource={result.resource}
      canonicalPath={`${path}/`}
      initialContent={result.initialContent}
      initialRevisionId={result.initialRevisionId}
    />
  );
}
