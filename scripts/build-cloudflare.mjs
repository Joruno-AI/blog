import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const PRIVATE_KEY_NAME = /(?:^|_)(?:API_KEY|AUTH_TOKEN|ACCESS_KEY(?:_ID)?|CREDENTIALS?|DATABASE_URL|HP_KEY|PASSWORD|PRIVATE_KEY|SECRET|TOKEN)(?:_|$)/i;
const projectRoot = process.cwd();
const forwardedArguments = process.argv.slice(2).filter((argument) => argument !== "--");
const sanitizedBuildEnv = Object.fromEntries(
  Object.entries(process.env).filter(([key]) => !key.startsWith("SCAN_SECRET_") && !PRIVATE_KEY_NAME.test(key)),
);

function run(command, args, env) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    env,
    stdio: "inherit",
  });
  if (result.error) {
    console.error(`Build gate could not start ${command}.`);
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function parseManifest(file, label) {
  if (!existsSync(file)) throw new Error(`Cloudflare build is missing ${label} manifest: ${file}`);
  try {
    const manifest = JSON.parse(readFileSync(file, "utf8"));
    if (!manifest || typeof manifest !== "object" || manifest.schemaVersion !== 1) {
      throw new Error("expected schemaVersion 1");
    }
    return manifest;
  } catch (error) {
    throw new Error(`Cloudflare build has an invalid ${label} manifest: ${error.message}`);
  }
}

function artifactName(publicPath, label) {
  const match = typeof publicPath === "string"
    ? publicPath.match(/^\/diagrams\/archify\/([a-f0-9]{64})\.html$/)
    : null;
  if (!match) throw new Error(`Cloudflare build has an invalid ${label} artifact path: ${String(publicPath)}`);
  return `${match[1]}.html`;
}

function verifyCopiedFile(builtFile, publicFile, label) {
  if (!existsSync(builtFile)) throw new Error(`Cloudflare build is missing ${label}: ${builtFile}`);
  if (!existsSync(publicFile)) throw new Error(`Generated public ${label} is missing: ${publicFile}`);
  const built = readFileSync(builtFile);
  const generated = readFileSync(publicFile);
  if (built.length === 0 || !built.equals(generated)) {
    throw new Error(`Cloudflare build ${label} does not match the generated public file.`);
  }
  return built;
}

function genericArtifactReferences(manifest) {
  if (!Array.isArray(manifest.artifacts)) {
    throw new Error("Cloudflare build generic Archify manifest must contain an artifacts array.");
  }
  return manifest.artifacts.map((artifact, index) => {
    const fileName = artifactName(artifact?.publicPath, `generic[${index}]`);
    if (artifact?.sha256 !== fileName.slice(0, -".html".length)) {
      throw new Error(`Cloudflare build generic[${index}] artifact hash does not match its public path.`);
    }
    return { label: `generic[${index}]`, fileName };
  });
}

function zreadArtifactReferences(manifest) {
  if (!manifest.artifacts || typeof manifest.artifacts !== "object" || Array.isArray(manifest.artifacts)) {
    throw new Error("Cloudflare build ZRead Archify manifest must contain an artifacts object.");
  }
  const references = [];
  for (const [repository, artifacts] of Object.entries(manifest.artifacts)) {
    if (!artifacts || typeof artifacts !== "object" || Array.isArray(artifacts)) {
      throw new Error(`Cloudflare build ZRead artifacts for ${repository} must be an object.`);
    }
    for (const [sourceHash, publicPath] of Object.entries(artifacts)) {
      if (!/^[a-f0-9]{64}$/.test(sourceHash)) {
        throw new Error(`Cloudflare build ZRead source hash is invalid for ${repository}.`);
      }
      const label = `ZRead ${repository}:${sourceHash}`;
      const fileName = artifactName(publicPath, label);
      const artifactHash = fileName.slice(0, -".html".length);
      if (manifest.metadata?.[repository]?.[sourceHash]?.artifactSha256 !== artifactHash) {
        throw new Error(`Cloudflare build ${label} metadata hash does not match its public path.`);
      }
      references.push({ label, fileName });
    }
  }
  const generated = new Set(references.map(({ fileName }) => fileName)).size;
  if (!manifest.stats || manifest.stats.generated !== generated) {
    throw new Error(`Cloudflare build ZRead manifest generated count is ${manifest.stats?.generated}, expected ${generated}.`);
  }
  return references;
}

export function verifyArchifyBuildAssets({
  assetsRoot = join(projectRoot, ".open-next/assets"),
  publicRoot = join(projectRoot, "public"),
} = {}) {
  const diagramAssets = join(assetsRoot, "diagrams/archify");
  const genericManifestFile = join(diagramAssets, "manifest.json");
  const zreadManifestFile = join(assetsRoot, "agent/zread-cache/archify-manifest.json");
  verifyCopiedFile(
    genericManifestFile,
    join(publicRoot, "diagrams/archify/manifest.json"),
    "generic Archify manifest",
  );
  verifyCopiedFile(
    zreadManifestFile,
    join(publicRoot, "agent/zread-cache/archify-manifest.json"),
    "ZRead Archify manifest",
  );
  const genericManifest = parseManifest(genericManifestFile, "generic Archify");
  const zreadManifest = parseManifest(
    zreadManifestFile,
    "ZRead Archify",
  );
  const references = [
    ...genericArtifactReferences(genericManifest),
    ...zreadArtifactReferences(zreadManifest),
  ];

  for (const { label, fileName } of references) {
    const builtFile = join(diagramAssets, fileName);
    const publicFile = join(publicRoot, "diagrams/archify", fileName);
    const built = verifyCopiedFile(builtFile, publicFile, `${label} artifact`);
    if (!built.includes(Buffer.from('<meta name="generator" content="archify '))) {
      throw new Error(`Cloudflare build ${label} artifact is not a self-contained Archify document.`);
    }
  }

  return {
    generic: genericArtifactReferences(genericManifest).length,
    zread: zreadArtifactReferences(zreadManifest).length,
    unique: new Set(references.map(({ fileName }) => fileName)).size,
  };
}

function main() {
  // Validate disk-based env files and every declared cache payload in the same
  // sanitized environment inherited by Next.js. Scan the finished output with
  // the original private values known only to the auditor (never to the compiler).
  run("pnpm", ["data:check:zread-cache"], sanitizedBuildEnv);
  run("pnpm", ["diagrams:build"], sanitizedBuildEnv);
  run(process.execPath, ["scripts/assert-safe-next-env.mjs"], sanitizedBuildEnv);
  run("pnpm", ["exec", "opennextjs-cloudflare", "build", ...forwardedArguments], sanitizedBuildEnv);

  try {
    const verified = verifyArchifyBuildAssets();
    console.log(
      `Cloudflare Archify assets verified: ${verified.generic} generic + ${verified.zread} ZRead reference(s), `
      + `${verified.unique} unique artifact(s).`,
    );
  } catch (error) {
    console.error(`Cloudflare build is missing generated Archify assets or they failed integrity checks: ${error.message}`);
    process.exit(1);
  }
  run(process.execPath, ["scripts/assert-safe-next-env.mjs", "--generated"], process.env);
}

const isMain = process.argv[1]
  && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isMain) main();
