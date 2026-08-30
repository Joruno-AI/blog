import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { writeFileSync } from "node:fs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourceRevision = process.argv.find((argument) => argument.startsWith("--revision="))?.slice("--revision=".length)
  || "e734b674668d238bd92af43322780ed25429cc3b";
const sourcePath = "src/content/skills/data.json";
const outputPath = resolve(root, "lib/parity/data/agent-selected-summaries.json");
const expectedCount = 400;

const source = execFileSync("git", ["show", `${sourceRevision}:${sourcePath}`], {
  cwd: root,
  encoding: "utf8",
  maxBuffer: 4 * 1024 * 1024,
});
const skills = JSON.parse(source);

if (!Array.isArray(skills) || skills.length !== expectedCount) {
  throw new Error(`Expected ${expectedCount} selected Agent records, received ${Array.isArray(skills) ? skills.length : "non-array data"}.`);
}

const items = {};
for (const skill of skills) {
  if (!skill || typeof skill !== "object" || Array.isArray(skill)) {
    throw new Error("Selected Agent source contains a non-object record.");
  }
  const repository = typeof skill.id === "string" ? skill.id.trim() : "";
  const title = typeof skill.name === "string" ? skill.name.trim() : "";
  const description = typeof skill.descZh === "string" && skill.descZh.trim()
    ? skill.descZh.trim()
    : typeof skill.desc === "string"
      ? skill.desc.trim()
      : "";
  if (repository.split("/").length !== 2 || !title || !description) {
    throw new Error(`Invalid selected Agent summary for ${repository || "unknown repository"}.`);
  }
  const path = `/agent/${repository}`;
  if (Object.hasOwn(items, path)) throw new Error(`Duplicate selected Agent path: ${path}`);
  items[path] = { repository, title, description };
}

const result = {
  source: {
    revision: sourceRevision,
    path: sourcePath,
    count: skills.length,
  },
  items,
};

writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`);
console.log(`Generated ${skills.length} selected Agent summaries at ${outputPath}`);
