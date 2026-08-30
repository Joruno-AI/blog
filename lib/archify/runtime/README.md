# Archify browser/Worker runtime adapter

This directory exposes pure renderers for Archify `architecture` and `sequence`
JSON IR. Together with `lib/archify/mermaid-to-archify.mjs`, it converts the
supported Mermaid flowchart/sequence subset used by live ZRead documents.
It reuses the official renderer, layout, schema validators, SVG semantics, and
viewer template pinned at commit
`f58298be408d62385407ca26bc5a7b612f68be2b`.

- Upstream: <https://github.com/tt-a1i/archify>
- License: MIT (`vendor/archify/LICENSE`)
- Runtime entry: `lib/archify/runtime/index.ts`
- Regenerator: `scripts/generate-archify-runtime.mjs`

The generator is the only filesystem-dependent piece. The module graph rooted
at `index.ts` contains no Node built-ins, `fs`, `child_process`, subprocess, or
network call. That makes the entry safe to import from a Next.js route running
on Cloudflare Workers.

`renderArchitecture(ir)` returns Archify's complete self-contained viewer HTML,
the semantic SVG, and the layout report. `renderArchitecture(ir, { embed: true })`
sets the same `data-embed` state that Archify's viewer normally derives from
`?embed=1`, which also makes the HTML suitable for `iframe.srcDoc`.

`renderSequence(ir)` provides the equivalent official sequence renderer, and
`renderMermaidWithArchify(source)` performs conversion plus renderer dispatch.
Static ZRead artifacts and runtime manifest misses import the same converter,
so their support boundary cannot drift.

The runtime path resolves official built-in brand IDs. Network-backed brand
capture stays in the trusted build-time CLI pipeline because it needs DNS,
HTTP, hashing, and SSRF defenses from the Node implementation.
