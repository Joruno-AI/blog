import { getCloudflareContext } from "@opennextjs/cloudflare";

import { normalizeAgentRepository } from "@/lib/agent/repository";
import { fetchWithTimeout, readLimitedText } from "@/lib/agent/upstream";

const ALLOWLIST_KEY = "internal/agent/repository-allowlist.txt";
const MINIMUM_REPOSITORIES = 28_000;
const MAXIMUM_REPOSITORIES = 30_000;
const MAXIMUM_ALLOWLIST_BYTES = 1_000_000;

type AllowlistObject = { text(): Promise<string> };
type AllowlistBucket = { get(key: string): Promise<AllowlistObject | null> };

let allowlistPromise: Promise<ReadonlySet<string>> | undefined;

export function parseAgentRepositoryAllowlist(source: string) {
  if (new TextEncoder().encode(source).byteLength > MAXIMUM_ALLOWLIST_BYTES) {
    throw new Error("Agent repository allowlist exceeds its size limit.");
  }
  const repositories = new Set(
    source
      .split(/\r?\n/)
      .map((entry) => normalizeAgentRepository(entry).toLowerCase())
      .filter(Boolean),
  );
  if (repositories.size < MINIMUM_REPOSITORIES || repositories.size > MAXIMUM_REPOSITORIES) {
    throw new Error("Agent repository allowlist is incomplete.");
  }
  return repositories;
}

async function readR2Allowlist() {
  const bucket = getCloudflareContext().env.R2_BUCKET as unknown as AllowlistBucket;
  const object = await bucket.get(ALLOWLIST_KEY);
  return object ? object.text() : null;
}

async function readLocalAllowlist(origin: string) {
  const response = await fetchWithTimeout(
    new URL("/agent/suggest-index.json", origin),
    { headers: { Accept: "application/json" }, cache: "no-store" },
    8_000,
  );
  if (!response.ok) throw new Error("Agent repository catalog is unavailable.");
  const source = await readLimitedText(response, 4_000_000);
  const payload = JSON.parse(source) as { items?: Array<{ f?: unknown }> };
  if (!Array.isArray(payload.items)) throw new Error("Agent repository catalog is invalid.");
  return `${payload.items.map((item) => typeof item.f === "string" ? item.f : "").filter(Boolean).join("\n")}\n`;
}

async function loadAgentRepositoryAllowlist(origin: string) {
  let source: string | null = null;
  try {
    source = await readR2Allowlist();
  } catch {
    // Local Next.js has no Cloudflare binding; use its exact static catalog.
  }
  return parseAgentRepositoryAllowlist(source ?? await readLocalAllowlist(origin));
}

export async function isAgentRepositoryAllowed(owner: string, repo: string, requestUrl: string) {
  const repository = normalizeAgentRepository(`${owner}/${repo}`).toLowerCase();
  if (!repository) return false;
  if (!allowlistPromise) {
    const origin = new URL(requestUrl).origin;
    allowlistPromise = loadAgentRepositoryAllowlist(origin).catch((reason) => {
      allowlistPromise = undefined;
      throw reason;
    });
  }
  return (await allowlistPromise).has(repository);
}
