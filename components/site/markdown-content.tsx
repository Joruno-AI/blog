"use client";

import { isValidElement, type ComponentPropsWithoutRef, type ReactNode } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import { headingId } from "@/lib/parity/blog-reader";

function nodeText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(nodeText).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) return nodeText(node.props.children);
  return "";
}

function Heading({ level, children }: { level: 2 | 3; children?: ReactNode }) {
  const Tag = `h${level}` as "h2" | "h3";
  const id = headingId(nodeText(children));
  return <Tag id={id}>{children}<a className="header-anchor" href={`#${id}`} aria-label={`链接到 ${nodeText(children)}`}>#</a></Tag>;
}

function MarkdownLink({ href = "", children, ...props }: ComponentPropsWithoutRef<"a">) {
  const internal = href.startsWith("/") || href.startsWith("#");
  if (internal) {
    return <Link href={href}>{children}</Link>;
  }

  return (
    <a href={href} target="_blank" rel="noreferrer" {...props}>
      {children}
    </a>
  );
}

export function MarkdownContent({ content, className = "platform-prose" }: { content: string; className?: string }) {
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{ a: MarkdownLink, h2: ({ children }) => <Heading level={2}>{children}</Heading>, h3: ({ children }) => <Heading level={3}>{children}</Heading> }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
