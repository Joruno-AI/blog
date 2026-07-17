# Task Plan: Unified Blog Reader

## Goal
Turn the blog index and post detail experience into one continuous reading workspace with persistent catalog context, article content, and page TOC while preserving shareable URLs, SEO, and Cloudflare static deployment.

## Current Phase
Complete

## Phases

### Phase 1: Requirements & Visual Audit
- [x] Confirm the user wants a continuous, non-fragmented reading experience
- [x] Inspect the current blog index and post detail layouts
- [x] Inspect the Sitor reference page in a real browser
- [x] Record preservation constraints
- **Status:** complete

### Phase 2: Architecture & Interaction Design
- [x] Audit Astro client navigation and layout persistence support
- [x] Extract a reusable blog catalog/navigation data model
- [x] Define desktop and mobile responsive behavior
- [x] Avoid multiplying all 550 post links across every generated page
- **Status:** complete

### Phase 3: Implementation
- [x] Build the shared blog workspace shell
- [x] Reuse it on the blog index and blog post routes
- [x] Keep active category/post state synchronized with the URL
- [x] Provide mobile catalog and page-TOC access
- **Status:** complete

### Phase 4: Verification
- [x] Run formatting, type checks, and lint
- [x] Build with the Cloudflare CI environment
- [x] Visually QA list/detail navigation at desktop and mobile sizes
- [x] Check light and dark modes and keyboard behavior
- **Status:** complete

### Phase 5: Delivery
- [x] Review the final diff and working tree
- [x] Summarize behavior, files, tests, and remaining risks
- **Status:** complete

### Phase 6: Navbar Search Diagnosis
- [x] Reproduce the gray search backdrop
- [x] Compare development and production search behavior
- [x] Verify the production Pagefind index against a known article
- **Status:** complete

### Phase 7: Development Search Implementation
- [x] Replace fixed development mock results with a real lightweight index
- [x] Preserve production Pagefind behavior and filters
- [x] Keep result rendering safe and keyboard-accessible
- **Status:** complete

### Phase 8: Search Verification
- [x] Test known-title searches in development and production
- [x] Run formatting, type checks, lint, and final diff review
- **Status:** complete

### Phase 9: Production Consistency Audit
- [x] Confirm local and remote Git synchronization
- [x] Reproduce the navbar blur difference in a production browser
- [x] Identify the CSS minifier behavior and apply the targeted fix
- [x] Scan all source styles for prefixed-property ordering hazards
- [x] Inspect the complete production build for warnings and malformed output
- [x] Compare critical local production styles with browser computed values
- **Status:** complete

### Phase 10: Audit Verification & Delivery
- [x] Run lint, Astro diagnostics, production build, and focused browser checks
- [x] Review Git diff and report actionable findings by severity
- **Status:** complete

## Key Questions
1. How can the shared shell remain visually stable during Astro client navigation without losing direct-link support?
2. How much of the 550-post catalog should be rendered on every article page?
3. How should catalog navigation and the page TOC collapse below desktop widths?

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| Preserve `/blog/` and `/blog/<slug>/` routes | Direct links, refresh, sharing, Pagefind, and SEO must continue to work. |
| Treat this as a preserve-style redesign | Existing brand, typography, colors, content, and routes are sound. The fragmentation is structural. |
| Use the existing Astro and CSS-variable system | No new UI framework or animation dependency is necessary. |
| Keep motion restrained | The user wants continuity and lower complexity, not decorative transitions. |
| Do not render a fully expanded 550-post tree on every detail page | This would inflate HTML, DOM cost, and Cloudflare build output. |
| Reuse one `BlogCatalog` component in filter and reader modes | The index and detail routes should share the same hierarchy, spacing, and responsive drawer behavior. |
| Move article TOC to the right at 1280px and above | Three columns fit safely there; between 1128px and 1279px the existing TOC panel remains available. |
| Disable slide-in animation on blog routes | Stable geometry matters more than entrance motion for perceived continuity. |

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| None yet | 1 | N/A |
| Playwright `iPhone 13` preset requested missing WebKit | 1 | Use installed Chromium with an explicit 390x844 viewport instead of installing another browser. |
| Browser interaction assertion ran before article navigation completed | 1 | Replace the broad URL glob with a wait for `blog-catalog[data-mode='reader']`. |
| Planning-file patch missed Prettier-normalized table spacing | 1 | Read the exact table context and apply a narrower patch. |
| First drawer screenshot captured the opening transition | 1 | Wait 400ms, then verify the 319.8px panel reaches x=0. |
| Phase-status patch omitted the Markdown list marker | 1 | Read the exact file and applied a narrower patch with the list marker included. |
| Search regression found a stale `.flex-grow` title selector | 1 | Target the current `.list-item-title` element and rerun the browser test. |
| Blog and music search shared the `search-clear` ID | 1 | Give blog search controls unique IDs and scope lookups to `BlogFilterView`. |
| Repository-wide format check found 10 pre-existing unformatted files | 1 | Leave unrelated files untouched and verify every task-modified file separately. |
| Focus-trap query included links clipped inside collapsed categories | 1 | Restrict the cycle to visible controls and links inside expanded category lists. |
| Development navbar search always returned two fixed mock records | 1 | Replace the mock branch with a real title/description/tag index while keeping Pagefind in production. |
| Final `pnpm check` CMS sync timed out after batch requests | 1 | Run code diagnostics without the remote CMS, then retry the Cloudflare build as a separate external-data check. |
| Production retry loaded all posts but the CMS media endpoint timed out | 2 | Probe the media endpoint before one final build attempt; do not repeat while it is unhealthy. |
| Search result click removed its anchor before default navigation | 1 | Defer panel cleanup until Astro and the browser have handled the link click. |
| Transparent backdrop still intercepted result pointer events | 2 | Render the global search panel outside the navbar stacking context so its z-index can exceed the backdrop. |
| Production CSS kept only `-webkit-backdrop-filter` for the navbar | 1 | Reverse the declaration order so Lightning CSS retains the standard property used by Chromium. |
| Browser label check targeted a page without a JSON block | 1 | Use a confirmed code-block page and inspect the first supported language label instead. |

## Notes
- Reference layout: course tree on the left, article in the center, page TOC on the right.
- Existing blog list already has category search and a mobile drawer; reuse behavior instead of duplicating it.
- Existing article routes already use Astro client routing, but the list and detail structures differ enough to feel like separate products.
