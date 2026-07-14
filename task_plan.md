# Task Plan: Upstream Architecture Integration

## Goal
Integrate upstream Astro 7 architecture changes while preserving this fork's custom content, site data, deployment choices, and local feature work.

## Current Phase
Phase 5

## Phases

### Phase 1: Requirements & Discovery
- [x] Confirm branch and remotes
- [x] Identify upstream delta and likely conflict areas
- [x] Document preservation constraints
- **Status:** complete

### Phase 2: Merge Strategy
- [x] Create isolated integration branch
- [x] Decide which upstream changes are architecture vs content
- [x] Record keep/take rules
- **Status:** complete

### Phase 3: Architecture Integration
- [x] Merge upstream architecture files and resolve conflicts
- [x] Keep local custom content and data
- [x] Adapt local custom code to the new architecture
- **Status:** complete

### Phase 4: Verification
- [x] Install/update dependencies if needed
- [x] Run typecheck/build
- [x] Fix integration regressions
- **Status:** complete

### Phase 5: Handoff
- [x] Summarize integrated upstream changes
- [x] List preserved local customizations
- [x] Report tests and any remaining risks
- **Status:** complete

## Key Questions
1. Which upstream files are pure architecture and should be taken?
2. Which local files contain custom content or product behavior and should be preserved?
3. What local code must be adapted to Astro 7, new schemas, route-based OG images, and Astro Fonts?

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| Work on `refactor/upstream-astro7-architecture` | Keeps `main` unchanged while resolving a large merge. |
| Preserve local content by default | User requested architecture upgrade without changing custom content. |
| Prefer upstream architecture for framework/config/schema internals | Astro 7 migration touches APIs that should follow upstream. |

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| `git add` failed for deleted paths | 1 | Use `git add -u` for deleted files instead of normal path add. |
| `astro check` failed after initial merge | 1 | Updated Rollup manual chunk config for Rollup 5, made `getFilteredPosts` generic, normalized reading time with `getMinutesRead`, and tightened Bluesky embed typing. |

## Notes
- Do not intentionally replace local blog posts, home page copy, project data, photo data, music content, images, or Cloudflare deployment choices.
- Accept upstream example/docs content only if it is required for a new architecture route and does not overwrite local content.
- Verification passed with `pnpm check` and `pnpm build`.
- Build logs still mention empty optional collections such as `blog`, `feeds`, `prs`, and `releases`; this matches the current local loader/content state and does not fail the build.
