import { PostForm } from "@/components/posts/post-form";
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

interface CreatePostPageProps {
  searchParams: Promise<{ categoryId?: string }>;
}

export default async function CreatePostPage({ searchParams }: CreatePostPageProps) {
  const { categoryId } = await searchParams;
  const [categoriesData, tagsData] = await Promise.all([
    getCategoriesTree(),
    getTags(),
  ]);

  const categories = buildCategoryTree(categoriesData);

  const tags = tagsData.map((t) => ({
    id: t.id,
    name: t.name,
    slug: t.slug,
  }));

  return (
    <PostForm
      categories={categories}
      tags={tags}
      submitLabel="发布文章"
      defaultCategoryId={categoryId}
    />
  );
}
