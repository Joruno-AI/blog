import { eq, asc, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories, posts, type NewCategory } from "@/lib/db/schema";

export async function getCategories() {
  const result = await db.query.categories.findMany({
    orderBy: [asc(categories.order), asc(categories.name)],
    with: {
      parent: true,
      children: true,
    },
  });

  return result;
}

export async function getCategoriesWithPostCount() {
  const result = await db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      description: categories.description,
      parentId: categories.parentId,
      order: categories.order,
      postCount: sql<number>`count(${posts.id})`,
    })
    .from(categories)
    .leftJoin(posts, eq(posts.categoryId, categories.id))
    .groupBy(categories.id)
    .orderBy(asc(categories.order), asc(categories.name));

  return result;
}

export async function getCategoryById(id: string) {
  const result = await db.query.categories.findFirst({
    where: eq(categories.id, id),
    with: {
      parent: true,
      children: true,
    },
  });

  return result;
}

export async function getCategoryBySlug(slug: string) {
  const result = await db.query.categories.findFirst({
    where: eq(categories.slug, slug),
    with: {
      parent: true,
      children: true,
    },
  });

  return result;
}

export async function createCategory(data: NewCategory) {
  const result = await db.insert(categories).values(data).returning();
  return (result as unknown as NewCategory[])[0];
}

export async function updateCategory(id: string, data: Partial<NewCategory>) {
  const result = await db
    .update(categories)
    .set(data)
    .where(eq(categories.id, id))
    .returning();
  return (result as unknown as NewCategory[])[0];
}

export async function deleteCategory(id: string) {
  await db.delete(categories).where(eq(categories.id, id));
}

export async function getCategoriesTree() {
  const allCategories = await getCategories();

  // Build tree structure
  const categoryMap = new Map(allCategories?.map((c) => [c.id, { ...c, children: [] as typeof allCategories }]));

  const rootCategories: typeof allCategories = [];

  for (const category of allCategories) {
    if (category.parentId) {
      const parent = categoryMap.get(category.parentId);
      if (parent) {
        parent.children.push(categoryMap.get(category.id)!);
      }
    } else {
      rootCategories.push(categoryMap.get(category.id)!);
    }
  }

  return rootCategories;
}

// Enhanced category type with path info
export interface EnhancedCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
  order: number;
  level: number;
  path: string;
  postCount: number;
  totalPostCount: number;
  children: EnhancedCategory[];
}

/**
 * Build category path by traversing up the parent chain
 */
function buildCategoryPath(
  categoryId: string,
  categoryMap: Map<string, { slug: string; parentId: string | null }>
): string {
  const parts: string[] = [];
  let currentId: string | null = categoryId;

  while (currentId) {
    const category = categoryMap.get(currentId);
    if (!category) break;
    parts.unshift(category.slug);
    currentId = category.parentId;
  }

  return parts.join("/");
}

/**
 * Count total posts including all descendants
 */
function countTotalPosts(node: EnhancedCategory): number {
  let count = node.postCount;
  for (const child of node.children) {
    count += countTotalPosts(child);
  }
  return count;
}

/**
 * Get categories tree with full path info, level, and post counts
 */
export async function getCategoriesTreeWithPaths(): Promise<EnhancedCategory[]> {
  // Get all categories with post counts
  const categoriesWithCount = await getCategoriesWithPostCount();

  // Build a map for path calculation
  const categoryMap = new Map(
    categoriesWithCount.map((c) => [
      c.id,
      { slug: c.slug, parentId: c.parentId },
    ])
  );

  // Create enhanced categories with path and level
  const enhancedMap = new Map<string, EnhancedCategory>();

  for (const cat of categoriesWithCount) {
    const path = buildCategoryPath(cat.id, categoryMap);
    const level = path.split("/").length - 1;

    enhancedMap.set(cat.id, {
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      parentId: cat.parentId,
      order: cat.order,
      level,
      path,
      postCount: cat.postCount,
      totalPostCount: 0, // Will be calculated after tree is built
      children: [],
    });
  }

  // Build tree structure
  const rootCategories: EnhancedCategory[] = [];

  for (const cat of categoriesWithCount) {
    const enhanced = enhancedMap.get(cat.id)!;
    if (cat.parentId) {
      const parent = enhancedMap.get(cat.parentId);
      if (parent) {
        parent.children.push(enhanced);
      }
    } else {
      rootCategories.push(enhanced);
    }
  }

  // Sort children by order and name
  const sortChildren = (nodes: EnhancedCategory[]) => {
    nodes.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, "zh-CN"));
    nodes.forEach((node) => sortChildren(node.children));
  };
  sortChildren(rootCategories);

  // Calculate total post counts (including descendants)
  const updateTotalCounts = (node: EnhancedCategory) => {
    node.totalPostCount = countTotalPosts(node);
    node.children.forEach(updateTotalCounts);
  };
  rootCategories.forEach(updateTotalCounts);

  return rootCategories;
}

/**
 * Get a single category's full path
 */
export async function getCategoryPath(categoryId: string): Promise<string> {
  const allCategories = await db.query.categories.findMany({
    columns: { id: true, slug: true, parentId: true },
  });

  const categoryMap = new Map(
    allCategories.map((c) => [c.id, { slug: c.slug, parentId: c.parentId }])
  );

  return buildCategoryPath(categoryId, categoryMap);
}

/**
 * Get category and all its descendant IDs (for inherited post queries)
 */
export async function getCategoryWithDescendantIds(
  categoryId: string
): Promise<string[]> {
  const allCategories = await db.query.categories.findMany({
    columns: { id: true, parentId: true },
  });

  const ids: string[] = [categoryId];
  const childMap = new Map<string, string[]>();

  // Build parent -> children map
  for (const cat of allCategories) {
    if (cat.parentId) {
      const children = childMap.get(cat.parentId) || [];
      children.push(cat.id);
      childMap.set(cat.parentId, children);
    }
  }

  // Recursively collect descendant IDs
  const collectDescendants = (id: string) => {
    const children = childMap.get(id) || [];
    for (const childId of children) {
      ids.push(childId);
      collectDescendants(childId);
    }
  };

  collectDescendants(categoryId);
  return ids;
}

/**
 * Batch update category orders and parent relationships (for drag & drop)
 */
export async function updateCategoriesOrder(
  updates: Array<{ id: string; parentId: string | null; order: number }>
): Promise<void> {
  // Use transaction to ensure atomicity
  await db.transaction(async (tx) => {
    for (const update of updates) {
      await tx
        .update(categories)
        .set({ parentId: update.parentId, order: update.order })
        .where(eq(categories.id, update.id));
    }
  });
}

/**
 * Get all categories as a flat list with path info
 */
export async function getCategoriesFlatWithPaths() {
  const tree = await getCategoriesTreeWithPaths();

  const flatten = (
    nodes: EnhancedCategory[],
    result: EnhancedCategory[] = []
  ): EnhancedCategory[] => {
    for (const node of nodes) {
      result.push(node);
      flatten(node.children, result);
    }
    return result;
  };

  return flatten(tree);
}

