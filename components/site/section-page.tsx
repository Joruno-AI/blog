import { ResourceList } from "@/components/site/resource-list";
import { getPublishedResourcesByTypes } from "@/modules/resources/application/queries";
import type { ResourceType } from "@/modules/resources/domain/types";

type SectionPageProps = {
  kicker: string;
  title: string;
  description: string;
  types: ResourceType[];
  empty: string;
};

export async function SectionPage({
  kicker,
  title,
  description,
  types,
  empty,
}: SectionPageProps) {
  const resources = await getPublishedResourcesByTypes({ types, limit: 60 });

  return (
    <div className="site-shell listing-page">
      <header className="listing-hero">
        <p className="site-kicker">{kicker}</p>
        <h1>{title}</h1>
        <p>{description}</p>
        <strong>{resources.length} 项已发布</strong>
      </header>
      <ResourceList resources={resources} emptyMessage={empty} />
    </div>
  );
}
