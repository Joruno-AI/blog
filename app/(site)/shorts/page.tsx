import { ShortsDirectory, type ShortCard } from "@/components/site/shorts-directory";
import { getPublishedResourcesByTypes } from "@/modules/resources/application/queries";

export const dynamic = "force-dynamic";

function tagsFromMetadata(metadataJson: string) {
  try {
    const value: unknown = JSON.parse(metadataJson);
    if (!value || typeof value !== "object" || Array.isArray(value)) return [];
    const tags = (value as { tags?: unknown }).tags;
    return Array.isArray(tags) ? tags.filter((tag): tag is string => typeof tag === "string") : [];
  } catch {
    return [];
  }
}

export default async function ShortsPage() {
  const resources = await getPublishedResourcesByTypes({ types: ["short"], limit: 100 });
  const items: ShortCard[] = resources
    .map((resource) => ({
      id: resource.id,
      title: resource.title,
      path: resource.path,
      publishedAt: resource.publishedAt?.toISOString() ?? null,
      tags: tagsFromMetadata(resource.metadataJson),
    }))
    .sort((a, b) => a.title.localeCompare(b.title, "zh-CN"));

  return (
    <div className="site-shell listing-page astro-section-index astro-section-shorts">
      <header className="prose standard-header text-center">
        <h1>Shorts</h1>
        <p className="subtitle">Share your short notes or quick thoughts</p>
      </header>
      <ShortsDirectory items={items} />
    </div>
  );
}
