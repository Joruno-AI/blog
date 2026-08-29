import { LegacyPage } from "@/components/site/legacy-page";
import { ResourceDetailPage } from "@/components/site/resource-detail-page";
export const dynamic = "force-dynamic";
export default async function Page({ searchParams }: { searchParams: Promise<{ path?: string }> }) { const path = (await searchParams).path; return path?.startsWith("/docs/") ? <ResourceDetailPage path={path} backHref="/docs" backLabel="返回 Docs" kicker="课程文档" /> : <LegacyPage title="课程文档" subtitle="请从 Docs 课程目录选择章节" />; }
