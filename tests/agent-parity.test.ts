import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const readJson = (path: string) => JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;

test("preserves the complete Astro Agent indexes and scene taxonomy", () => {
  const full = readJson("public/agent/full-index.json") as { items: unknown[] };
  const suggest = readJson("public/agent/suggest-index.static.json") as { items: unknown[] };
  const scenes = readJson("public/agent/scenes.json") as { groups: unknown[]; scenes: unknown[] };
  assert.equal(full.items.length, 28_868);
  assert.equal(suggest.items.length, full.items.length);
  assert.equal(scenes.groups.length, 8);
  assert.equal(scenes.scenes.length, 56);
});

test("replaces Agent placeholder pages with the migrated catalog experiences", () => {
  for (const path of [
    "app/(site)/agent/page.tsx",
    "app/(site)/agent/all/page.tsx",
    "app/(site)/agent/trending/page.tsx",
    "app/(site)/agent/masters/page.tsx",
    "app/(site)/agent/scenes/page.tsx",
  ]) {
    assert.doesNotMatch(readFileSync(path, "utf8"), /AgentRoutePage|SectionPage/);
  }
});
