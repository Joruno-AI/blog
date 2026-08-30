"use client";

import {
  PublicArticleActionsHydrator as ArticleActionsHydrator,
  PublicArticleTocHydrator as ArticleTocHydrator,
  PublicMarkdownHydrator as MarkdownHydrator,
  PublicResourceContentProvider as ResourceContentProvider,
  type PublicArticleActionsHydratorProps,
  type PublicArticleTocHydratorProps,
  type PublicMarkdownHydratorProps,
  type PublicResourceContentProviderProps,
} from "@/components/site/public-resource-content-impl";

export type {
  PublicArticleActionsHydratorProps,
  PublicArticleTocHydratorProps,
  PublicMarkdownHydratorProps,
  PublicResourceContentProviderProps,
} from "@/components/site/public-resource-content-impl";

// These ordinary client components keep their server-rendered output enabled.
// Next renders the build snapshot body into HTML/RSC, then the client refreshes
// it from the visibility-checked public API after hydration.
export function PublicResourceContentProvider(props: PublicResourceContentProviderProps) {
  return <ResourceContentProvider {...props} />;
}

export function PublicMarkdownHydrator(props: PublicMarkdownHydratorProps) {
  return <MarkdownHydrator {...props} />;
}

export function PublicArticleActionsHydrator(props: PublicArticleActionsHydratorProps) {
  return <ArticleActionsHydrator {...props} />;
}

export function PublicArticleTocHydrator(props: PublicArticleTocHydratorProps) {
  return <ArticleTocHydrator {...props} />;
}
