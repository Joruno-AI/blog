export type BlogReaderPost = {
  id: string;
  title: string;
  slug: string;
  categoryPath: string;
  categoryNamePath: string;
};

export type ArticleHeading = { depth: 2 | 3; text: string; id: string };

const collator = new Intl.Collator("zh-CN");

function leadingNumber(value: string) {
  const match = value.split("/").at(-1)?.match(/^(\d+)/);
  return match ? Number.parseInt(match[1], 10) : Number.POSITIVE_INFINITY;
}

export function compareAstroPaths(a: string, b: string) {
  const numberA = leadingNumber(a);
  const numberB = leadingNumber(b);
  if (numberA !== numberB) return numberA - numberB;
  if (a === "杂谈") return 1;
  if (b === "杂谈") return -1;
  return collator.compare(a, b);
}

export function sortBlogReaderPosts(posts: BlogReaderPost[]) {
  return [...posts].sort((a, b) => {
    const category = compareAstroPaths(a.categoryPath, b.categoryPath);
    return category || compareAstroPaths(a.slug, b.slug);
  });
}

export function headingId(value: string) {
  return value
    .trim()
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s/g, "-");
}

export function extractArticleHeadings(markdown: string): ArticleHeading[] {
  const headings: ArticleHeading[] = [];
  let inFence = false;
  for (const line of markdown.split(/\r?\n/)) {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const match = line.match(/^(#{2,3})\s+(.+?)\s*#*\s*$/);
    if (!match) continue;
    const text = match[2]
      .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
      .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
      .replace(/[*_`~]/g, "")
      .trim();
    if (text) headings.push({ depth: match[1].length as 2 | 3, text, id: headingId(text) });
  }
  return headings;
}
