import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  assertGenericResourceType,
} from "@/modules/resources/application/resource-service";

test("generic resource mutations reject every dedicated domain type", () => {
  for (const type of ["article", "album", "track"] as const) {
    assert.throws(
      () => assertGenericResourceType(type),
      new RegExp(`dedicated ${type} editor`),
    );
  }
  for (const type of ["document", "photo", "project"] as const) {
    assert.doesNotThrow(() => assertGenericResourceType(type));
  }
});

test("the generic update and archive entrypoints enforce the domain boundary", () => {
  const source = readFileSync(
    path.join(process.cwd(), "modules/resources/application/resource-service.ts"),
    "utf8",
  );
  const update = source.slice(
    source.indexOf("export async function updateGenericResource"),
    source.indexOf("export async function archiveGenericResource"),
  );
  const archive = source.slice(source.indexOf("export async function archiveGenericResource"));
  assert.match(update, /assertGenericResourceType\(current\.type\)/);
  assert.match(archive, /assertGenericResourceType\(current\.type\)/);
});
