# CMS public-content rebuild runbook

The public Next.js projection is generated from remote D1 during deployment.
CMS writes do not call GitHub on the request path. Instead, D1 triggers advance
a durable outbox generation in the same transaction as every public projection
change. The existing minute cron leases that generation and sends one GitHub
`repository_dispatch` event named `content-published`.

## One-time production configuration

Create a fine-grained GitHub token scoped to this repository with **Contents:
write**. Store both values as Cloudflare Worker secrets; do not add them to
`wrangler.toml`, `.env` files, GitHub workflow source, or application logs.

```bash
pnpm exec wrangler secret put PUBLIC_REBUILD_GITHUB_REPOSITORY
# Enter: OWNER/REPOSITORY

pnpm exec wrangler secret put PUBLIC_REBUILD_GITHUB_TOKEN
# Enter the fine-grained GitHub token
```

Both secrets are mandatory in production. A missing value is returned as a
failed rebuild result, logged by the cron route, and makes that invocation a
partial failure (HTTP 207). The review Worker has no cron and also checks
`REVIEW_READ_ONLY=true`, so review remains explicitly disabled.

## Delivery and retry semantics

- `public_content_rebuild_outbox.generation` advances transactionally with CMS
  changes to published resources, revisions, taxonomy, music projections and
  public assets.
- A cron invocation leases the latest generation not yet submitted/deployed for
  two minutes.
- GitHub HTTP `204` advances `submitted_generation`; it does not claim that the
  generated projection reached production.
- After deploy and smoke succeed, the workflow posts the validated
  `repository_dispatch` generation to the `CRON_SECRET`-protected acknowledgement
  endpoint. Only that callback advances `deployed_generation`.
- If no callback arrives within 30 minutes, cron re-dispatches the same latest
  generation so a canceled or interrupted workflow cannot strand it.
- Network and non-`204` responses clear the lease, retain the generation and
  retry with exponential backoff from 30 seconds up to one hour.
- A CMS change received while a dispatch is in flight advances `generation`.
  GitHub acceptance only marks the leased submission; the newer generation
  remains pending for the next cron.
- Expired leases can be reclaimed, so a terminated Worker invocation cannot
  strand the outbox.

Inspect state without exposing any secret:

```bash
pnpm exec wrangler d1 execute blog-cms-db --remote --command \
  "SELECT id, generation, submitted_generation, deployed_generation, status, attempts, available_at, last_reason, last_error, updated_at FROM public_content_rebuild_outbox;"
```

## Deployment pipeline

`.github/workflows/deploy.yml` runs on `main`, manual dispatch, and
`repository_dispatch: content-published`. Its production order is:

1. apply D1 migrations;
2. verify remote D1 invariants;
3. generate the public snapshots/endpoints from remote D1;
4. lint, typecheck and test;
5. build OpenNext;
6. deploy the Worker;
7. smoke-test the deployed Worker;
8. acknowledge the exact dispatched generation (repository dispatches only).

The workflow concurrency group cancels an older in-flight build when a newer
generation arrives. Because every build reads the complete remote D1 state,
the newest generation subsumes earlier pending changes.

## Recovery

For a transient GitHub or network failure, wait for the next cron. To request a
rebuild without changing content, use the workflow's manual dispatch. Do not
manually advance either generation column; submission belongs to the dispatcher
and deployment acknowledgement belongs to the post-smoke workflow callback.
