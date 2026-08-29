import type { Metadata } from "next";

import { DocsLibrary } from "@/components/site/docs-library";
import { docsCatalogSummary } from "@/lib/docs/catalog";

export const metadata: Metadata = {
  title: "Docs",
  description: "按课程整理的技术学习文档库",
};

export default function DocsPage() {
  return <DocsLibrary catalog={docsCatalogSummary} />;
}
