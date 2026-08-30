import { createHash } from "node:crypto";
import {
  readFile,
  readdir,
  stat,
} from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join, relative } from "node:path";
import { pathToFileURL } from "node:url";

const PRODUCT = "@heroui-pro/react";
const SETUP_PACKAGE = "hpsetup";
const EXPECTED_PRODUCT_VERSION = "1.0.0-beta.8";
const EXPECTED_SETUP_VERSION = "4.7.1";
const EXPECTED_DIST_FILES = 543;
const EXPECTED_DIST_BYTES = 2_572_816;
const EXPECTED_DIST_SHA256 = "7eb36557f138f5f47e26e05d0875c2431a1ab00fad9f86222f5724fcc268c946";
const KEY_PATTERN = /^hp_[0-9a-f]+$/;
const KEY_REDACTION_PATTERN = /hp_[0-9a-f]+/g;

const require = createRequire(import.meta.url);
const projectRoot = process.cwd();

async function json(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function regularFiles(root, directory = root) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await regularFiles(root, path));
    else if (entry.isFile()) files.push(path);
  }
  return files.sort((left, right) =>
    relative(root, left).localeCompare(relative(root, right), "en"));
}

async function distFingerprint(packageRoot) {
  const root = join(packageRoot, "dist");
  const files = await regularFiles(root);
  const hash = createHash("sha256");
  let bytes = 0;
  for (const path of files) {
    const name = relative(root, path).replaceAll("\\", "/");
    const content = await readFile(path);
    hash.update(name);
    hash.update("\0");
    hash.update(String(content.byteLength));
    hash.update("\0");
    hash.update(content);
    bytes += content.byteLength;
  }
  return { files: files.length, bytes, sha256: hash.digest("hex") };
}

function assertExactDependency(manifest, name, expected) {
  const declared = manifest.dependencies?.[name] ?? manifest.devDependencies?.[name];
  if (declared !== expected) {
    throw new Error(`${name} must stay pinned to ${expected}; found ${declared ?? "missing"}.`);
  }
}

async function verifyInstalledPackage(packageRoot) {
  const installed = await json(join(packageRoot, "package.json"));
  if (installed.name !== PRODUCT || installed.version !== EXPECTED_PRODUCT_VERSION) {
    throw new Error(
      `Expected ${PRODUCT}@${EXPECTED_PRODUCT_VERSION}; found ${installed.name ?? "unknown"}@${installed.version ?? "unknown"}.`,
    );
  }

  for (const artifact of ["dist/index.js", "dist/index.d.ts", "dist/heroui-pro.min.css"]) {
    const info = await stat(join(packageRoot, artifact)).catch(() => null);
    if (!info?.isFile()) throw new Error(`HeroUI Pro artifact is missing: ${artifact}.`);
  }

  const fingerprint = await distFingerprint(packageRoot);
  if (
    fingerprint.files !== EXPECTED_DIST_FILES
    || fingerprint.bytes !== EXPECTED_DIST_BYTES
    || fingerprint.sha256 !== EXPECTED_DIST_SHA256
  ) {
    throw new Error(
      `HeroUI Pro artifact verification failed for ${EXPECTED_PRODUCT_VERSION}: `
      + `${fingerprint.files} files, ${fingerprint.bytes} bytes, sha256 ${fingerprint.sha256}.`,
    );
  }
  return fingerprint;
}

async function main() {
  const rootManifestPath = join(projectRoot, "package.json");
  const lockfilePath = join(projectRoot, "pnpm-lock.yaml");
  const rootManifestBefore = await readFile(rootManifestPath);
  const lockfileBefore = await readFile(lockfilePath);
  const rootManifest = JSON.parse(rootManifestBefore.toString("utf8"));
  assertExactDependency(rootManifest, PRODUCT, EXPECTED_PRODUCT_VERSION);
  assertExactDependency(rootManifest, SETUP_PACKAGE, EXPECTED_SETUP_VERSION);

  const productPackagePath = require.resolve(`${PRODUCT}/package.json`);
  const packageRoot = dirname(productPackagePath);

  if (!process.argv.includes("--check")) {
    const key = (process.env.HEROUI_HP_KEY ?? process.env.HEROUI_KEY ?? "").trim();
    if (!KEY_PATTERN.test(key)) {
      throw new Error("HEROUI_HP_KEY must contain a valid HeroUI Pro setup key.");
    }

    // hpsetup's public CLI automatically upgrades when a newer package exists.
    // Import its version-pinned downloader instead so CI materializes only the
    // package version reviewed in package.json/lockfile.
    const setupRoot = dirname(require.resolve(`${SETUP_PACKAGE}/package.json`));
    const [{ downloadFromProxy }, { PRODUCTS }] = await Promise.all([
      import(pathToFileURL(join(setupRoot, "src/download.js")).href),
      import(pathToFileURL(join(setupRoot, "src/constants.js")).href),
    ]);
    await downloadFromProxy(
      PRODUCTS.react,
      EXPECTED_PRODUCT_VERSION,
      packageRoot,
      key,
      false,
      true,
    );
  }

  const fingerprint = await verifyInstalledPackage(packageRoot);
  const [rootManifestAfter, lockfileAfter] = await Promise.all([
    readFile(rootManifestPath),
    readFile(lockfilePath),
  ]);
  if (!rootManifestAfter.equals(rootManifestBefore) || !lockfileAfter.equals(lockfileBefore)) {
    throw new Error("HeroUI Pro setup changed package.json or pnpm-lock.yaml.");
  }

  console.log(
    `Verified ${PRODUCT}@${EXPECTED_PRODUCT_VERSION} `
    + `(${fingerprint.files} files, sha256 ${fingerprint.sha256}).`,
  );
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message.replace(KEY_REDACTION_PATTERN, "[REDACTED]"));
  process.exitCode = 1;
});
