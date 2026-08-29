import type { Metadata } from "next";
import { ResourceDetailPage, getResourceMetadata } from "@/components/site/resource-detail-page";
type Props = { params: Promise<{ slug: string }> };
const pathOf = async (params: Props["params"]) => `/changelog/${decodeURIComponent((await params).slug)}`;
export async function generateMetadata({ params }: Props): Promise<Metadata> { return getResourceMetadata(await pathOf(params)); }
export default async function Page({ params }: Props) { return <ResourceDetailPage path={await pathOf(params)} backHref="/changelog" backLabel="返回 Changelog" kicker="Changelog" />; }
