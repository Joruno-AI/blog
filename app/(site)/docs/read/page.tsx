import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { DocsReader } from "@/components/site/docs-reader";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "课程文档", description: "技术课程文档阅读页" };

export default async function Page({ searchParams }: { searchParams: Promise<{ source?: string; path?: string; course?: string }> }) {
  const { source = "geektime", path, course } = await searchParams;
  if (!path) redirect("/docs");
  return <DocsReader sourceId={source} path={path} courseId={course} />;
}
