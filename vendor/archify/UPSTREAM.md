# Vendored Archify runtime

- Upstream: <https://github.com/tt-a1i/archify>
- Pinned commit: `f58298be408d62385407ca26bc5a7b612f68be2b`
- Upstream package version: `2.16.0-dev.0`
- License: MIT (see `LICENSE`)

This directory contains the upstream Node.js rendering runtime used by the
public-content diagram build. The checked-in files are copied from the pinned
commit so CI and Cloudflare builds do not download executable code or depend on
an unpinned network resource.

The vendored scope includes the CLI, renderers, generated validators, schemas,
HTML template, brand catalogue, workflow migration runtime, architecture delta
runtime, authoring references, and the JSON examples required by the upstream
`doctor` command. The integration invokes the unmodified upstream CLI through
`scripts/lib/archify-compiler.mjs`.

To upgrade:

1. Review the upstream diff and license at the intended commit.
2. Replace the vendored files with byte-for-byte copies from that commit.
3. Update both the commit and version above, plus
   `ARCHIFY_UPSTREAM_COMMIT` in the compiler.
4. Run `pnpm diagrams:build`, `pnpm diagrams:check`, and the full test suite.

The pinned commit participates in every artifact hash. Upgrading the renderer
therefore creates new immutable artifact URLs instead of changing an existing
content-addressed file in place.
