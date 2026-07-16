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

## Notes
- Reference layout: course tree on the left, article in the center, page TOC on the right.
- Existing blog list already has category search and a mobile drawer; reuse behavior instead of duplicating it.
- Existing article routes already use Astro client routing, but the list and detail structures differ enough to feel like separate products.
