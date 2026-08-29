import { NextRequest, NextResponse } from "next/server";
import { getPostById } from "@/lib/db/queries/posts";


/**
 * Export a post as MDX format
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const post = await getPostById(id);

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Build frontmatter
    const frontmatter: Record<string, unknown> = {
      title: post.title,
      pubDate: post.pubDate
        ? new Date(post.pubDate).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0],
    };

    if (post.subtitle) frontmatter.subtitle = post.subtitle;
    if (post.excerpt) frontmatter.description = post.excerpt;

    // Get category name
    if (post.category && typeof post.category === "object" && "name" in post.category) {
      frontmatter.category = post.category.name;
    }

    // Get tag names
    if (post.postTags && post.postTags.length > 0) {
      frontmatter.tags = post.postTags.map((pt) => {
        const tag = pt.tag as { name: string };
        return tag.name;
      });
    }

    if (post.draft) frontmatter.draft = true;
    if (post.ogImage) frontmatter.ogImage = post.ogImage;
    if (!post.toc) frontmatter.toc = false;

    // Build MDX content
    const frontmatterYaml = Object.entries(frontmatter)
      .map(([key, value]) => {
        if (Array.isArray(value)) {
          return `${key}:\n${value.map((v) => `  - ${v}`).join("\n")}`;
        }
        if (typeof value === "string") {
          // Escape strings with special characters
          if (value.includes(":") || value.includes('"') || value.includes("'")) {
            return `${key}: "${value.replace(/"/g, '\\"')}"`;
          }
          return `${key}: ${value}`;
        }
        return `${key}: ${value}`;
      })
      .join("\n");

    const mdxContent = `---
${frontmatterYaml}
---

${post.content}
`;

    // Generate filename from slug
    const filename = `${post.slug}.mdx`;

    return new NextResponse(mdxContent, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Error exporting post:", error);
    return NextResponse.json(
      { error: "Failed to export post" },
      { status: 500 }
    );
  }
}
