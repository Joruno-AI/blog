import type { Metadata } from "next";

import { getResourceMetadata, ResourceDetailPage } from "@/components/site/resource-detail-page";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ slug: string[] }> };

async function resourcePath(params: PageProps["params"]) {
  const { slug } = await params;
  return "/projects/" + slug.map(decodeURIComponent).join("/");
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  return getResourceMetadata(await resourcePath(params));
}

export default async function Page({ params }: PageProps) {
  return <ResourceDetailPage path={await resourcePath(params)} backHref="/projects" backLabel="返回项目" kicker="Build Log" />;
}
