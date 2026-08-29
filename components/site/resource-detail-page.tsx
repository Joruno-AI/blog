import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";

import { MarkdownContent } from "@/components/site/markdown-content";
import { getPublicResource } from "@/modules/resources/application/queries";
import { getRequestViewer } from "@/lib/auth/request-viewer";

export async function getResourceMetadata(path: string): Promise<Metadata> {
  const resource = await getPublicResource(path, await getRequestViewer());
  if (!resource) notFound();
  return {
    title: resource.title,
    description: resource.description ?? undefined,
    alternates: { canonical: resource.path },
  };
}

export async function ResourceDetailPage({
  path,
  backHref,
  backLabel,
  kicker,
}: {
  path: string;
  backHref: string;
  backLabel: string;
  kicker: string;
}) {
  const resource = await getPublicResource(path, await getRequestViewer());
  if (!resource) notFound();

  return (
    <article className="site-shell article-page">
      <Link className="article-back" href={backHref}>
        <ArrowLeft aria-hidden="true" />
        {backLabel}
      </Link>
      <header className="article-header">
        <p className="site-kicker">{kicker}</p>
        <h1>{resource.title}</h1>
        {resource.description ? <p>{resource.description}</p> : null}
        <div className="article-meta">
          <span>{resource.type}</span>
          <span>第 {resource.version} 版</span>
        </div>
      </header>
      <MarkdownContent content={resource.content} />
    </article>
  );
}
