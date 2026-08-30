import type { Metadata } from "next";
import { Suspense } from "react";

import { DocsReaderFromQuery } from "@/components/site/docs-reader";
import { DocsReaderLoadingShell } from "@/components/site/docs-reader-loading-shell";
import { legacyMetadata } from "@/lib/parity/legacy-metadata";

export const metadata: Metadata = legacyMetadata({ title: "课程文档", description: "技术课程文档阅读页", path: "/docs/read/", image: "/og-images/docs/read.png" });

export default function Page() {
  return (
    <Suspense fallback={<DocsReaderLoadingShell />}>
      <DocsReaderFromQuery />
    </Suspense>
  );
}
