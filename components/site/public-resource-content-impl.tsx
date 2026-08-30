"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { ArticleActions } from "@/components/site/article-actions";
import { BlogArticleToc } from "@/components/site/blog-article-toc";
import { MarkdownContent } from "@/components/site/markdown-content";
import { extractArticleHeadings } from "@/lib/parity/blog-reader";
import {
  isPublicResourceRevokedError,
  requestPublicResource,
} from "@/lib/parity/public-resource-client";
import type { ResourceType } from "@/modules/resources/domain/types";

type InitialPublicContent = {
  initialContent: string;
  initialRevisionId: string;
};

export type PublicResourceContentProviderProps = InitialPublicContent & {
  resourcePath: string;
  expectedType: ResourceType;
  children: ReactNode;
};

export type PublicMarkdownHydratorProps = {
  className: string;
  initialRevisionId?: string;
  children?: ReactNode;
};

export type PublicArticleActionsHydratorProps = {
  title: string;
  url: string;
};

export type PublicArticleTocHydratorProps = {
  tocEnabled?: boolean;
  desktopPosition?: "left" | "right";
  context?: string | null;
};

type ContentState = {
  content: string | null;
  revisionId: string | null;
  unavailable: boolean;
};

const PublicResourceContentContext = createContext<ContentState | null>(null);

function initialState(initialContent: string, initialRevisionId: string): ContentState {
  return {
    content: initialContent,
    revisionId: initialRevisionId,
    unavailable: false,
  };
}

function usePublicResource({
  path,
  expectedType,
  initialContent,
  initialRevisionId,
}: {
  path: string;
  expectedType: ResourceType;
  initialContent: string;
  initialRevisionId: string;
}) {
  const [state, setState] = useState<ContentState>(() => (
    initialState(initialContent, initialRevisionId)
  ));

  useEffect(() => {
    let active = true;
    setState(initialState(initialContent, initialRevisionId));
    void requestPublicResource(path)
      .then((resource) => {
        if (!active) return;
        if (resource.type !== expectedType) {
          setState({ content: null, revisionId: null, unavailable: true });
          return;
        }
        // The static body is immutable for its revision. Avoid replacing it
        // (and re-rendering Markdown/TOC/actions) unless publication changed.
        if (resource.revisionId === initialRevisionId) return;
        setState({
          content: resource.content,
          revisionId: resource.revisionId,
          unavailable: false,
        });
      })
      .catch((error: unknown) => {
        if (!active) return;
        if (isPublicResourceRevokedError(error)) {
          setState({ content: null, revisionId: null, unavailable: true });
          return;
        }
        // Network/5xx failures keep the SSR body. Middleware already checked
        // current visibility before serving the static document.
        setState((current) => current.content === null
          ? { content: null, revisionId: null, unavailable: true }
          : current);
      });
    return () => { active = false; };
  }, [expectedType, initialContent, initialRevisionId, path]);

  return state;
}

function usePublicResourceContent() {
  const state = useContext(PublicResourceContentContext);
  if (!state) {
    throw new Error("Public resource content consumers require PublicResourceContentProvider");
  }
  return state;
}

export function PublicResourceContentProvider({
  resourcePath,
  expectedType,
  initialContent,
  initialRevisionId,
  children,
}: PublicResourceContentProviderProps) {
  const state = usePublicResource({
    path: resourcePath,
    expectedType,
    initialContent,
    initialRevisionId,
  });
  const value = useMemo(() => state, [state]);
  return (
    <PublicResourceContentContext.Provider value={value}>
      {children}
    </PublicResourceContentContext.Provider>
  );
}

export function PublicMarkdownHydrator({
  children,
  className,
  initialRevisionId,
}: PublicMarkdownHydratorProps) {
  const state = usePublicResourceContent();
  if (state.unavailable || state.content === null) {
    return <div className="public-content-error" role="status">Content unavailable.</div>;
  }
  if (children && initialRevisionId && state.revisionId === initialRevisionId) {
    return children;
  }
  return <MarkdownContent content={state.content} className={className} />;
}

export function PublicArticleActionsHydrator({
  title,
  url,
}: PublicArticleActionsHydratorProps) {
  const state = usePublicResourceContent();
  return state.content !== null && !state.unavailable
    ? <ArticleActions markdown={state.content} url={url} title={title} />
    : null;
}

export function PublicArticleTocHydrator({
  tocEnabled = true,
  desktopPosition,
  context,
}: PublicArticleTocHydratorProps) {
  const state = usePublicResourceContent();
  if (!tocEnabled || state.content === null || state.unavailable) return null;
  const headings = extractArticleHeadings(state.content);
  return headings.length
    ? <BlogArticleToc headings={headings} desktopPosition={desktopPosition} context={context} />
    : null;
}
