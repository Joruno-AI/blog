import "server-only";

import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { toJsxRuntime } from "hast-util-to-jsx-runtime";

import { AstroMarkdownEnhancer } from "@/components/site/astro-markdown-enhancer";
import type {
  AstroMarkdownNode,
  AstroMarkdownTree,
} from "@/lib/parity/astro-markdown-tree";

type RuntimeHastNode =
  | { type: "text"; value: string }
  | {
      type: "element";
      tagName: string;
      properties: Record<string, unknown>;
      children: RuntimeHastNode[];
    };

function expandNode(node: AstroMarkdownNode): RuntimeHastNode {
  if (typeof node === "string") return { type: "text", value: node };
  const classNames = node[1]?.className;
  if (node[0] === "a" && Array.isArray(classNames) && classNames.includes("header-anchor")) {
    return { type: "text", value: "" };
  }
  return {
    type: "element",
    tagName: node[0],
    properties: node[1] ?? {},
    children: node[2].map(expandNode),
  };
}

function renderAstroMarkdownTree(tree: AstroMarkdownTree) {
  return toJsxRuntime({
    type: "root",
    children: tree.map(expandNode),
  } as Parameters<typeof toJsxRuntime>[0], {
    Fragment,
    jsx,
    jsxs,
    elementAttributeNameCase: "react",
    stylePropertyNameCase: "dom",
  });
}

/**
 * Runtime rendering stays deliberately small: the ignored build snapshot
 * already contains sanitized, syntax-highlighted HAST. The heavy compiler is
 * run only in the projection-generator command before `next build`, so its parser and
 * highlighter never enter the Cloudflare Worker.
 */
export function AstroMarkdownContent({
  tree,
  className = "astro-markdown",
  revisionKey,
}: {
  tree: AstroMarkdownTree;
  className?: string;
  revisionKey: string;
}) {
  return (
    <AstroMarkdownEnhancer className={className} revisionKey={revisionKey}>
      {renderAstroMarkdownTree(tree)}
    </AstroMarkdownEnhancer>
  );
}
