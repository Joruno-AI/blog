import type { Metadata } from "next";

import { DocsLibrary } from "@/components/site/docs-library";
import { docsCatalogSummary } from "@/lib/docs/catalog";
import { legacyMetadata } from "@/lib/parity/legacy-metadata";

export const metadata: Metadata = legacyMetadata({
  title: "Docs",
  description: "按课程整理的技术学习文档库",
  path: "/docs/",
  image: "/og-images/docs.png",
});

export default function DocsPage() {
  return <DocsLibrary catalog={docsCatalogSummary} />;
}
