import { and, eq, lte, or, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { publicContentRebuildOutbox } from "@/lib/db/schema";

const OUTBOX_ID = "public-content";
const DISPATCH_EVENT_TYPE = "content-published";
const GITHUB_API_VERSION = "2026-03-10";
const DEFAULT_LEASE_MS = 2 * 60 * 1_000;
const DISPATCH_TIMEOUT_MS = 15_000;
const INITIAL_RETRY_DELAY_MS = 30_000;
const MAX_RETRY_DELAY_MS = 60 * 60 * 1_000;
export const PUBLIC_CONTENT_REBUILD_ACK_TIMEOUT_MS = 30 * 60 * 1_000;

export type PublicContentRebuildEnvironment = {
  PUBLIC_REBUILD_GITHUB_REPOSITORY?: string;
  PUBLIC_REBUILD_GITHUB_TOKEN?: string;
  REVIEW_READ_ONLY?: string;
};

export type PublicContentRebuildClaim = {
  id: string;
  generation: number;
  submittedGeneration: number;
  deployedGeneration: number;
  attempts: number;
  lastReason: string;
  lastResourceId: string | null;
  claimedAt: Date;
};

type SubmittedState = {
  generation: number;
  submittedGeneration: number;
  deployedGeneration: number;
  status: "pending" | "submitted" | "deployed";
};

export type PublicContentRebuildDeploymentState = {
  generation: number;
  submittedGeneration: number;
  deployedGeneration: number;
  status: "pending" | "processing" | "submitted" | "deployed";
};

export type PublicContentRebuildOutboxStore = {
  claim(input: {
    leaseId: string;
    now: Date;
    leaseExpiresAt: Date;
    acknowledgementExpiredAt: Date;
  }): Promise<PublicContentRebuildClaim | null>;
  markSubmitted(input: {
    leaseId: string;
    now: Date;
    acknowledgementDueAt: Date;
  }): Promise<SubmittedState | null>;
  acknowledgeDeployed(input: {
    generation: number;
    now: Date;
  }): Promise<PublicContentRebuildDeploymentState | null>;
  releaseForRetry(input: {
    leaseId: string;
    now: Date;
    retryAt: Date;
    error: string;
  }): Promise<boolean>;
};

export function createPublicContentRebuildOutboxStore(
  database: typeof db = db,
): PublicContentRebuildOutboxStore {
  return {
    async claim({ leaseId, now, leaseExpiresAt, acknowledgementExpiredAt }) {
      const [claim] = await database
        .update(publicContentRebuildOutbox)
        .set({
          status: "processing",
          leaseId,
          leaseGeneration: sql`${publicContentRebuildOutbox.generation}`,
          leaseExpiresAt,
          updatedAt: now,
        })
        .where(and(
          eq(publicContentRebuildOutbox.id, OUTBOX_ID),
          sql`${publicContentRebuildOutbox.generation} > ${publicContentRebuildOutbox.deployedGeneration}`,
          lte(publicContentRebuildOutbox.availableAt, now),
          or(
            eq(publicContentRebuildOutbox.status, "pending"),
            and(
              eq(publicContentRebuildOutbox.status, "submitted"),
              sql`${publicContentRebuildOutbox.submittedGeneration} > ${publicContentRebuildOutbox.deployedGeneration}`,
              lte(publicContentRebuildOutbox.lastSubmittedAt, acknowledgementExpiredAt),
            ),
            and(
              eq(publicContentRebuildOutbox.status, "processing"),
              lte(publicContentRebuildOutbox.leaseExpiresAt, now),
            ),
          ),
        ))
        .returning({
          id: publicContentRebuildOutbox.id,
          generation: publicContentRebuildOutbox.generation,
          submittedGeneration: publicContentRebuildOutbox.submittedGeneration,
          deployedGeneration: publicContentRebuildOutbox.deployedGeneration,
          attempts: publicContentRebuildOutbox.attempts,
          lastReason: publicContentRebuildOutbox.lastReason,
          lastResourceId: publicContentRebuildOutbox.lastResourceId,
          claimedAt: publicContentRebuildOutbox.updatedAt,
        });
      return claim ?? null;
    },

    async markSubmitted({ leaseId, now, acknowledgementDueAt }) {
      const nowEpoch = Math.floor(now.getTime() / 1_000);
      const acknowledgementDueEpoch = Math.floor(acknowledgementDueAt.getTime() / 1_000);
      const [state] = await database
        .update(publicContentRebuildOutbox)
        .set({
          submittedGeneration: sql`max(
            ${publicContentRebuildOutbox.submittedGeneration},
            coalesce(
              ${publicContentRebuildOutbox.leaseGeneration},
              ${publicContentRebuildOutbox.submittedGeneration}
            )
          )`,
          status: sql<"pending" | "submitted" | "deployed">`CASE
            WHEN ${publicContentRebuildOutbox.generation} > ${publicContentRebuildOutbox.leaseGeneration}
              THEN 'pending'
            WHEN ${publicContentRebuildOutbox.deployedGeneration} >= ${publicContentRebuildOutbox.leaseGeneration}
              THEN 'deployed'
            ELSE 'submitted'
          END`,
          attempts: 0,
          availableAt: sql`CASE
            WHEN ${publicContentRebuildOutbox.generation} > ${publicContentRebuildOutbox.leaseGeneration}
              THEN ${nowEpoch}
            ELSE ${acknowledgementDueEpoch}
          END`,
          leaseId: null,
          leaseGeneration: null,
          leaseExpiresAt: null,
          lastError: null,
          lastSubmittedAt: now,
          updatedAt: now,
        })
        .where(and(
          eq(publicContentRebuildOutbox.id, OUTBOX_ID),
          eq(publicContentRebuildOutbox.leaseId, leaseId),
        ))
        .returning({
          generation: publicContentRebuildOutbox.generation,
          submittedGeneration: publicContentRebuildOutbox.submittedGeneration,
          deployedGeneration: publicContentRebuildOutbox.deployedGeneration,
          status: publicContentRebuildOutbox.status,
        });
      if (!state) return null;
      return {
        ...state,
        status: state.status === "pending"
          ? "pending"
          : state.status === "deployed" ? "deployed" : "submitted",
      };
    },

    async acknowledgeDeployed({ generation, now }) {
      const selection = {
        generation: publicContentRebuildOutbox.generation,
        submittedGeneration: publicContentRebuildOutbox.submittedGeneration,
        deployedGeneration: publicContentRebuildOutbox.deployedGeneration,
        status: publicContentRebuildOutbox.status,
      };
      const normalize = (state: {
        generation: number;
        submittedGeneration: number;
        deployedGeneration: number;
        status: string;
      }): PublicContentRebuildDeploymentState => ({
        generation: state.generation,
        submittedGeneration: state.submittedGeneration,
        deployedGeneration: state.deployedGeneration,
        status: state.status === "processing"
          ? "processing" as const
          : state.status === "pending"
            ? "pending" as const
            : state.status === "submitted" ? "submitted" as const : "deployed" as const,
      });
      const advance = async () => {
        const [state] = await database
          .update(publicContentRebuildOutbox)
          .set({
            deployedGeneration: generation,
            status: sql<"pending" | "processing" | "submitted" | "deployed">`CASE
              WHEN ${publicContentRebuildOutbox.status} = 'processing'
                AND coalesce(${publicContentRebuildOutbox.leaseGeneration}, 0) > ${generation}
                THEN 'processing'
              WHEN ${publicContentRebuildOutbox.generation} > ${publicContentRebuildOutbox.submittedGeneration}
                THEN 'pending'
              WHEN ${publicContentRebuildOutbox.submittedGeneration} > ${generation}
                THEN 'submitted'
              ELSE 'deployed'
            END`,
            availableAt: now,
            lastError: null,
            lastDeployedAt: now,
            updatedAt: now,
          })
          .where(and(
            eq(publicContentRebuildOutbox.id, OUTBOX_ID),
            sql`${generation} > ${publicContentRebuildOutbox.deployedGeneration}`,
            sql`${generation} <= ${publicContentRebuildOutbox.submittedGeneration}`,
          ))
          .returning(selection);
        return state ?? null;
      };

      let state = await advance();
      if (state) return normalize(state);

      const [current] = await database
        .select(selection)
        .from(publicContentRebuildOutbox)
        .where(eq(publicContentRebuildOutbox.id, OUTBOX_ID))
        .limit(1);
      if (!current || generation > current.submittedGeneration) return null;
      if (generation <= current.deployedGeneration) {
        // A workflow retry is a read-only acknowledgement. In particular, do
        // not erase retry diagnostics or advance timestamps on a replay.
        return normalize(current);
      }

      // Submission can race the first UPDATE. Retry once after observing that
      // this generation is now inside the acknowledged range.
      state = await advance();
      if (state) return normalize(state);
      const [raced] = await database
        .select(selection)
        .from(publicContentRebuildOutbox)
        .where(eq(publicContentRebuildOutbox.id, OUTBOX_ID))
        .limit(1);
      if (!raced || generation > raced.submittedGeneration || generation > raced.deployedGeneration) {
        return null;
      }
      return normalize(raced);
    },

    async releaseForRetry({ leaseId, now, retryAt, error }) {
      const rows = await database
        .update(publicContentRebuildOutbox)
        .set({
          status: sql<"pending" | "deployed">`CASE
            WHEN ${publicContentRebuildOutbox.deployedGeneration} >= coalesce(
              ${publicContentRebuildOutbox.leaseGeneration},
              ${publicContentRebuildOutbox.generation}
            ) AND ${publicContentRebuildOutbox.generation} <= ${publicContentRebuildOutbox.deployedGeneration}
              THEN 'deployed'
            ELSE 'pending'
          END`,
          attempts: sql`${publicContentRebuildOutbox.attempts} + 1`,
          availableAt: retryAt,
          leaseId: null,
          leaseGeneration: null,
          leaseExpiresAt: null,
          lastError: error,
          updatedAt: now,
        })
        .where(and(
          eq(publicContentRebuildOutbox.id, OUTBOX_ID),
          eq(publicContentRebuildOutbox.leaseId, leaseId),
        ))
        .returning({ id: publicContentRebuildOutbox.id });
      return rows.length > 0;
    },
  };
}

function repositoryParts(repository: string) {
  const normalized = repository.trim();
  const match = normalized.match(/^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/);
  if (!match || match[1] === "." || match[1] === ".." || match[2] === "." || match[2] === "..") {
    return null;
  }
  return { owner: match[1], repository: match[2] };
}

function retryDelay(attempt: number) {
  const exponent = Math.min(Math.max(attempt - 1, 0), 7);
  return Math.min(INITIAL_RETRY_DELAY_MS * (2 ** exponent), MAX_RETRY_DELAY_MS);
}

function safeError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/[\r\n\t]+/g, " ").slice(0, 500);
}

export async function dispatchPublicContentRebuild(input: {
  repository: string;
  token: string;
  claim: PublicContentRebuildClaim;
  fetchImpl?: typeof fetch;
}) {
  const repository = repositoryParts(input.repository);
  if (!repository) {
    throw new Error("PUBLIC_REBUILD_GITHUB_REPOSITORY must use the owner/repository format.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DISPATCH_TIMEOUT_MS);
  try {
    const response = await (input.fetchImpl ?? fetch)(
      `https://api.github.com/repos/${encodeURIComponent(repository.owner)}/${encodeURIComponent(repository.repository)}/dispatches`,
      {
        method: "POST",
        headers: {
          accept: "application/vnd.github+json",
          authorization: `Bearer ${input.token}`,
          "content-type": "application/json",
          "user-agent": "personal-platform-public-content-rebuild",
          "x-github-api-version": GITHUB_API_VERSION,
        },
        body: JSON.stringify({
          event_type: DISPATCH_EVENT_TYPE,
          client_payload: {
            source: "cms-outbox",
            generation: input.claim.generation,
            previous_submitted_generation: input.claim.submittedGeneration,
            previous_deployed_generation: input.claim.deployedGeneration,
            last_reason: input.claim.lastReason,
            last_resource_id: input.claim.lastResourceId,
            claimed_at: input.claim.claimedAt.toISOString(),
          },
        }),
        signal: controller.signal,
      },
    );

    if (response.status !== 204) {
      const requestId = response.headers.get("x-github-request-id");
      throw new Error(
        `GitHub repository_dispatch returned HTTP ${response.status}${requestId ? ` (${requestId})` : ""}.`,
      );
    }
  } finally {
    clearTimeout(timeout);
  }
}

export async function acknowledgePublicContentRebuildDeployment(
  generation: number,
  options: {
    store?: PublicContentRebuildOutboxStore;
    now?: () => Date;
  } = {},
) {
  if (!Number.isSafeInteger(generation) || generation <= 0) return null;
  return (options.store ?? createPublicContentRebuildOutboxStore()).acknowledgeDeployed({
    generation,
    now: (options.now ?? (() => new Date()))(),
  });
}

export type PublicContentRebuildRunResult =
  | { status: "disabled"; reason: "review" }
  | { status: "idle" }
  | { status: "submitted"; generation: number; pendingGeneration: number | null }
  | { status: "failed"; generation: number | null; retryAt: string | null; error: string };

export async function runPublicContentRebuildOutbox(
  options: {
    environment: PublicContentRebuildEnvironment;
    store?: PublicContentRebuildOutboxStore;
    fetchImpl?: typeof fetch;
    now?: () => Date;
    leaseMs?: number;
    acknowledgementTimeoutMs?: number;
  },
): Promise<PublicContentRebuildRunResult> {
  if (options.environment.REVIEW_READ_ONLY === "true") {
    return { status: "disabled", reason: "review" };
  }

  const repository = options.environment.PUBLIC_REBUILD_GITHUB_REPOSITORY?.trim();
  const token = options.environment.PUBLIC_REBUILD_GITHUB_TOKEN?.trim();
  if (!repository || !token) {
    const missing = [
      !repository ? "PUBLIC_REBUILD_GITHUB_REPOSITORY" : null,
      !token ? "PUBLIC_REBUILD_GITHUB_TOKEN" : null,
    ].filter(Boolean).join(" and ");
    return {
      status: "failed",
      generation: null,
      retryAt: null,
      error: `Missing production public rebuild configuration: ${missing}.`,
    };
  }
  if (!repositoryParts(repository)) {
    return {
      status: "failed",
      generation: null,
      retryAt: null,
      error: "PUBLIC_REBUILD_GITHUB_REPOSITORY must use the owner/repository format.",
    };
  }

  const now = options.now ?? (() => new Date());
  const startedAt = now();
  const leaseMs = Math.min(Math.max(options.leaseMs ?? DEFAULT_LEASE_MS, 30_000), 10 * 60 * 1_000);
  const acknowledgementTimeoutMs = Math.min(
    Math.max(options.acknowledgementTimeoutMs ?? PUBLIC_CONTENT_REBUILD_ACK_TIMEOUT_MS, 60_000),
    24 * 60 * 60 * 1_000,
  );
  const leaseId = crypto.randomUUID();
  const store = options.store ?? createPublicContentRebuildOutboxStore();
  const claim = await store.claim({
    leaseId,
    now: startedAt,
    leaseExpiresAt: new Date(startedAt.getTime() + leaseMs),
    acknowledgementExpiredAt: new Date(startedAt.getTime() - acknowledgementTimeoutMs),
  });
  if (!claim) return { status: "idle" };

  try {
    await dispatchPublicContentRebuild({
      repository,
      token,
      claim,
      fetchImpl: options.fetchImpl,
    });
    const submittedAt = now();
    const submitted = await store.markSubmitted({
      leaseId,
      now: submittedAt,
      acknowledgementDueAt: new Date(submittedAt.getTime() + acknowledgementTimeoutMs),
    });
    if (!submitted) {
      return {
        status: "failed",
        generation: claim.generation,
        retryAt: null,
        error: "The rebuild dispatch lease changed before submission could be recorded.",
      };
    }
    return {
      status: "submitted",
      generation: submitted.submittedGeneration,
      pendingGeneration: submitted.status === "pending" ? submitted.generation : null,
    };
  } catch (error) {
    const message = safeError(error);
    const failedAt = now();
    const retryAt = new Date(failedAt.getTime() + retryDelay(claim.attempts + 1));
    const released = await store.releaseForRetry({
      leaseId,
      now: failedAt,
      retryAt,
      error: message,
    });
    return {
      status: "failed",
      generation: claim.generation,
      retryAt: released ? retryAt.toISOString() : null,
      error: message,
    };
  }
}
