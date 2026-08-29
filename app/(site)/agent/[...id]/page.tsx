import type { Metadata } from "next";
import { ResourceDetailPage, getResourceMetadata } from "@/components/site/resource-detail-page";
type Props = { params: Promise<{ id: string[] }> };
const pathOf = async (params: Props["params"]) => `/agent/${(await params).id.map(decodeURIComponent).join("/")}`;
export async function generateMetadata({ params }: Props): Promise<Metadata> { return getResourceMetadata(await pathOf(params)); }
export default async function Page({ params }: Props) { return <ResourceDetailPage path={await pathOf(params)} backHref="/agent" backLabel="返回 Agent" kicker="Agent" />; }
