"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";

import { DocsReaderLoadingShell } from "@/components/site/docs-reader-loading-shell";

export type DocsReaderProps = {
  sourceId?: string;
  path?: string;
  courseId?: string;
};

const BrowserDocsReader = dynamic(
  () => import("@/components/site/docs-reader-impl").then((module) => module.DocsReader),
  {
    ssr: false,
    loading: () => <DocsReaderLoadingShell />,
  },
);

// The reader stays browser-rendered because its Shiki grammar bundle is a
// browser feature. Keeping the implementation behind an ssr:false boundary
// prevents those grammars from entering the Cloudflare Worker trace while the
// same full highlighter remains available after hydration.
export function DocsReader(props: DocsReaderProps) {
  return <BrowserDocsReader {...props} />;
}

/**
 * Keeps `/docs/read/` itself prerenderable. Query-string state belongs to the
 * browser reader and must not force the Cloudflare Worker to render the route.
 */
export function DocsReaderFromQuery() {
  const searchParams = useSearchParams();
  return (
    <DocsReader
      sourceId={searchParams.get("source") ?? undefined}
      path={searchParams.get("path") ?? undefined}
      courseId={searchParams.get("course") ?? undefined}
    />
  );
}
