import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("preserves both Astro course sources and every indexed chapter", () => {
  const catalog = JSON.parse(readFileSync("public/docs/catalog.static.json", "utf8")) as {
    sources: Array<{ id: string }>;
    stats: { categories: number; courses: number; articles: number };
    categories: Array<{ courses: Array<{ articles: unknown[] }> }>;
  };
  assert.deepEqual(catalog.sources.map((source) => source.id), ["geektime", "nuggets"]);
  assert.deepEqual(catalog.stats, { categories: 8, courses: 349, articles: 13_034 });
  assert.equal(
    catalog.categories.flatMap((category) => category.courses).reduce((count, course) => count + course.articles.length, 0),
    catalog.stats.articles,
  );
});

test("replaces generic Docs placeholders with the Astro course library and reader", () => {
  assert.doesNotMatch(readFileSync("app/(site)/docs/page.tsx", "utf8"), /SectionPage/);
  assert.doesNotMatch(readFileSync("app/(site)/docs/read/page.tsx", "utf8"), /LegacyPage|ResourceDetailPage/);
  assert.match(readFileSync("components/site/docs-reader.tsx", "utf8"), /fetchMarkdown|reader-course-panel|reader-mindmap-dialog/);
});
