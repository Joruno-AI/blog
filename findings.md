# Findings & Decisions

## Requirements
- Integrate upstream branch changes into this fork.
- Scope should be architecture upgrade only.
- Preserve custom content and custom site behavior.

## Research Findings
- Current branch was `main`, tracking `origin/main`.
- Upstream remote is `https://github.com/lin-stephanie/astro-antfustyle-theme.git`.
- Upstream `main` is at theme version `3.0.0` plus Astro `7.0.7`.
- Local branch has 204 commits not in upstream; upstream has 18 commits not in local.
- Upstream changes include Astro 7, Node `>=22.12.0`, Astro Fonts, route-based OG image generation, schema relocation to `src/schema.ts`, tag sidebar support, post cover fields, and Giscus CSS route changes.
- Simulated merge reported conflicts in package/config/schema/components/styles and content files.
- Local custom schema fields include `titleIcon`, `category`, and URL-capable project icons; these must be carried into the new `src/schema.ts`.
- Local content loaders include CMS-backed blog/media loaders controlled by `CMS_API_URL`; this custom loader path must be preserved.
- Local custom UI/features include `BlogFilterView`, Music page/components, `GlobalMusicPlayer`, `KeyboardShortcuts`, `ReadingProgress`, Cloudflare deployment script, and Three.js dependency.
- Resolved early keep/delete rules: kept local home/project/blog page content, kept local project data, kept Cloudflare direction by deleting Vercel files, and removed the static `public/og-images/og-image.png` to avoid conflicting with the upstream route-based OG endpoint.
- `src/schema.ts` now uses the upstream Astro 7/Zod 4 location while carrying local `titleIcon`, `category`, page `toc`, and URL-capable project icons.
- `src/content.config.ts` now uses upstream collection architecture including `shorts`, while keeping the local CMS and media loaders and leaving release/PR/feed loaders disabled.
- `src/layouts/BaseLayout.astro` and `src/components/base/Head.astro` use upstream dynamic OG image and Astro Fonts architecture while preserving local SEO metadata, global music player, reading progress, and keyboard shortcuts.
- `pnpm install` regenerated the lockfile for Astro 7; `@ascorbic/feed-loader` still reports a peer warning for Astro 7, but the corresponding loader remains disabled in this fork.
- `pnpm check` and `pnpm build` pass. The build generated 43 pages and Pagefind indexed 31 pages.

## Technical Decisions
| Decision | Rationale |
|----------|-----------|
| Keep local content/data files unless build requires schema adaptation | User asked not to change custom content. |
| Take upstream package/config architecture, then reapply local deployment/API choices | Framework migration depends on upstream config shape, but fork has Cloudflare/CMS customizations. |
| Use build/typecheck output to drive adaptation | Astro 7 migrations can surface schema/import/API issues only at build time. |
| Preserve local custom components and routes by default | They implement this fork's product/content behavior and are not upstream theme samples. |
| Keep `shorts` collection from upstream | Local navigation already links to `/shorts`; upstream collection/page support adds architecture without replacing local blog content. |
| Use a Rollup 5 `manualChunks` function | Object-form `manualChunks` no longer type-checks under the upgraded toolchain. |
| Keep optional GitHub/feed loaders defensive | Local release/PR/feed collections are disabled, so views should tolerate missing collections instead of failing the build. |
| Preserve local `BlogFilterView` | It is custom fork behavior; only its types/read-time calculation were adapted to the upstream schema helpers. |

## Issues Encountered
| Issue | Resolution |
|-------|------------|
| Initial typecheck failed on widened collection types after adding `shorts` | Made `getFilteredPosts` generic so `'blog'`, `'changelog'`, and `'shorts'` callers remain typed precisely. |
| Initial typecheck failed on `minutesRead` boolean/number handling | Used upstream `getMinutesRead` helper in the custom blog filter view. |
| Initial typecheck failed on newer Bluesky embed type guards | Added minimal local Bluesky embed shapes and explicit casts after runtime guards. |
| First production build was slow around photos | It completed successfully after remote photo metadata/cache generation. |

## Resources
- Local repository: `/Users/wangshengliang/Desktop/我的项目/blog`
- Upstream branch: `upstream/main`
- Integration branch: `refactor/upstream-astro7-architecture`

## Visual/Browser Findings
- None.
