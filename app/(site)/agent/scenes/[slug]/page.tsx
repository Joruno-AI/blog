import type { Metadata } from "next";
import { ResourceDetailPage, getResourceMetadata } from "@/components/site/resource-detail-page";
type Props = { params: Promise<{ slug: string }> };
const pathOf = async (params: Props["params"]) => `/agent/scenes/${decodeURIComponent((await params).slug)}`;
export async function generateMetadata({ params }: Props): Promise<Metadata> { return getResourceMetadata(await pathOf(params)); }
export default async function Page({ params }: Props) { return <ResourceDetailPage path={await pathOf(params)} backHref="/agent/scenes" backLabel="返回场景" kicker="Agent Scene" />; }
