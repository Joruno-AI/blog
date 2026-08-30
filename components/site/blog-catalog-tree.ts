export type BlogCatalogPost = {
  id: string;
  title: string;
  slug: string;
  categoryPath: string | null;
  categoryNamePath: string | null;
};

export type BlogCatalogNode<T extends BlogCatalogPost = BlogCatalogPost> = {
  name: string;
  path: string;
  children: BlogCatalogNode<T>[];
  posts: T[];
};

export type FlattenedBlogCatalogNode<T extends BlogCatalogPost = BlogCatalogPost> = {
  node: BlogCatalogNode<T>;
  depth: number;
  hasChildren: boolean;
  totalPosts: number;
};

// The source Astro catalog applies two different ordering rules:
// - category names use Chinese collation (Chinese groups first, by pinyin);
// - entries inside a category retain ASCII-first path ordering for ties.
// Keeping these collators separate is important: using the entry collator for
// categories moves every Latin category ahead of the six Chinese categories.
const categoryCollator = new Intl.Collator("zh-CN");
const entryCollator = new Intl.Collator("en-US");
const DEFAULT_CATEGORY = "杂谈";

function leadingNumber(value: string) {
  const match = value.split("/").at(-1)?.match(/^(\d+)/);
  return match ? Number.parseInt(match[1], 10) : Number.POSITIVE_INFINITY;
}

export function formatBlogCategoryName(value: string) {
  return value.replace(/^\d+-/, "");
}

export function blogIndexGroupLabel(path: string) {
  return formatBlogCategoryName(path.split("/").at(-1) || path);
}

export function compareBlogCatalogCategoryPaths(a: string, b: string) {
  const segmentA = a.split("/").at(-1) || a;
  const segmentB = b.split("/").at(-1) || b;
  const numberA = leadingNumber(segmentA);
  const numberB = leadingNumber(segmentB);
  if (numberA !== numberB) return numberA - numberB;

  const nameA = formatBlogCategoryName(segmentA);
  const nameB = formatBlogCategoryName(segmentB);
  if (nameA === DEFAULT_CATEGORY && nameB !== DEFAULT_CATEGORY) return 1;
  if (nameB === DEFAULT_CATEGORY && nameA !== DEFAULT_CATEGORY) return -1;
  return categoryCollator.compare(nameA, nameB);
}

export function compareBlogCatalogEntryPaths(a: string, b: string) {
  const numberA = leadingNumber(a);
  const numberB = leadingNumber(b);
  if (numberA !== numberB) return numberA - numberB;
  return entryCollator.compare(a, b);
}

/**
 * Reconstructs the category hierarchy emitted by the Astro content tree.
 * `categoryPath` is the stable slug path while `categoryNamePath` supplies the
 * display casing for each matching segment in the catalog navigation.
 */
export function buildBlogCatalogTree<T extends BlogCatalogPost>(posts: readonly T[]): BlogCatalogNode<T>[] {
  const roots: BlogCatalogNode<T>[] = [];
  const nodes = new Map<string, BlogCatalogNode<T>>();

  for (const post of posts) {
    const categoryPath = post.categoryPath || DEFAULT_CATEGORY;
    const categoryNamePath = post.categoryNamePath || categoryPath;
    const pathParts = categoryPath.split("/").filter(Boolean);
    const nameParts = categoryNamePath.split("/").filter(Boolean);
    const effectiveParts = pathParts.length ? pathParts : [DEFAULT_CATEGORY];
    let parent: BlogCatalogNode<T> | null = null;
    let currentPath = "";

    for (let index = 0; index < effectiveParts.length; index += 1) {
      const part = effectiveParts[index];
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      let node = nodes.get(currentPath);
      if (!node) {
        node = {
          name: formatBlogCategoryName(nameParts[index] || part),
          path: currentPath,
          children: [],
          posts: [],
        };
        nodes.set(currentPath, node);
        if (parent) parent.children.push(node);
        else roots.push(node);
      }
      parent = node;
    }

    parent?.posts.push(post);
  }

  const sortNode = (node: BlogCatalogNode<T>) => {
    node.children.sort((a, b) => compareBlogCatalogCategoryPaths(a.path, b.path));
    node.posts.sort((a, b) => compareBlogCatalogEntryPaths(a.slug, b.slug));
    node.children.forEach(sortNode);
  };

  roots.sort((a, b) => compareBlogCatalogCategoryPaths(a.path, b.path));
  roots.forEach(sortNode);
  return roots;
}

export function countBlogCatalogPosts<T extends BlogCatalogPost>(node: BlogCatalogNode<T>): number {
  return node.posts.length + node.children.reduce((total, child) => total + countBlogCatalogPosts(child), 0);
}

export function flattenBlogCatalogTree<T extends BlogCatalogPost>(
  nodes: readonly BlogCatalogNode<T>[],
  depth = 0,
): FlattenedBlogCatalogNode<T>[] {
  const flattened: FlattenedBlogCatalogNode<T>[] = [];
  for (const node of nodes) {
    flattened.push({
      node,
      depth,
      hasChildren: node.children.length > 0,
      totalPosts: countBlogCatalogPosts(node),
    });
    flattened.push(...flattenBlogCatalogTree(node.children, depth + 1));
  }
  return flattened;
}

export function isBlogCategoryMatch(postCategory: string | null, selectedCategory: string) {
  if (selectedCategory === "all") return true;
  const category = postCategory || DEFAULT_CATEGORY;
  return category === selectedCategory || category.startsWith(`${selectedCategory}/`);
}
