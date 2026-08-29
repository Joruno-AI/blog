import { notFound } from "next/navigation";

import { PostForm } from "@/components/posts/post-form";
import { getPostById } from "@/lib/db/queries/posts";
import { getCategoriesTree } from "@/lib/db/queries/categories";
import { getTags } from "@/lib/db/queries/tags";


interface CategoryTreeNode {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  children?: CategoryTreeNode[];
  [key: string]: unknown;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildCategoryTree(categories: any[]): CategoryTreeNode[] {
  return categories.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    parentId: c.parentId,
    children: c.children && c.children.length > 0 ? buildCategoryTree(c.children) : undefined,
  }));
}

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [postData, categoriesData, tagsData] = await Promise.all([
    getPostById(id),
    getCategoriesTree(),
    getTags(),
  ]);

  if (!postData) {
    notFound();
  }

  // Transform data for PostForm
  const post = {
    id: postData.id,
    title: postData.title,
    slug: postData.slug,
    subtitle: postData.subtitle,
    content: postData.content,
    excerpt: postData.excerpt,
    categoryId: postData.categoryId,
    pubDate: postData.pubDate,
    postTags: postData.postTags?.map((pt) => ({
      tag: {
        id: pt.tag.id,
        name: pt.tag.name,
        slug: pt.tag.slug,
      },
    })),
  };

  const categories = buildCategoryTree(categoriesData);

  const tags = tagsData.map((t) => ({
    id: t.id,
    name: t.name,
    slug: t.slug,
  }));

  return (
    <PostForm
      post={post}
      categories={categories}
      tags={tags}
      submitLabel="保存修改"
    />
  );
}
