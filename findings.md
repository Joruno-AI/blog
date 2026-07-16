# Findings & Decisions

## Requirements
- Make the blog list and article detail feel like one continuous page/workspace.
- Avoid the current sense of navigating into a separate, empty detail screen.
- Use `https://sitor.cc/courses/agent-fundamentals/2-chatbot-to-agent` as the structural reference.
- Preserve existing routes, shareability, SEO, content, brand, dark mode, and Cloudflare deployment.

## Research Findings
- `/blog/` renders `BlogFilterView` inside `StandardLayout`.
- Blog detail routes render `RenderPost`; the blog category tree disappears and `DesktopAside` becomes the article TOC.
- `StandardLayout` constrains both the list and article content to the existing `.prose` width, leaving large unused space on wide displays.
- The blog currently contains about 550 CMS posts, so copying all post links into every static article page would significantly increase generated HTML.
- Astro client routing is already present in the project; the main source of perceived navigation is structural replacement, not necessarily a hard browser reload.
- `ClientRouter` is mounted globally in `Head.astro`, so normal internal links already use Astro client navigation.
- The current desktop breakpoint is 1128px. Two 250px sidebars plus the 65ch article fit comfortably only from about 1280px.

## Technical Decisions
| Decision | Rationale |
|----------|-----------|
| Build a shared blog workspace shell | The left catalog, center content, and optional right TOC need one stable geometry. |
| Keep server-rendered article pages | Preserves static deployment, SEO, refresh, and no-JS access. |
| Reuse existing CSS variables and icon classes | Maintains visual identity and avoids extra dependencies. |
| Render categories plus a focused article subset on details | Preserves context without a 550-link DOM on every page. |
| Use responsive drawers below the three-column breakpoint | A three-column reader is not viable on tablets or phones. |
| Reuse `BlogCatalog` in `filter` and `reader` modes | Filter mode keeps the current complete index tree; reader mode keeps all categories but expands only the active category. |
| Add position/class overrides to `DesktopAside` | Blog posts need their page TOC on the right without changing TOC placement for other collections. |

## Issues Encountered
| Issue | Resolution |
|-------|------------|
| Existing planning files described a completed Astro migration | Replaced their current contents for this task; prior history remains available in Git. |
| First open-drawer screenshot looked only about 94px wide | Computed width was 319.8px; the screenshot was captured during the 250ms opening transition. Waiting 400ms confirmed the final panel at x=0. |

## Resources
- Reference: https://sitor.cc/courses/agent-fundamentals/2-chatbot-to-agent
- Blog index: `src/pages/blog/index.mdx`
- Detail route: `src/pages/blog/[...slug].astro`
- Current index view: `src/components/views/BlogFilterView.astro`
- Current detail view: `src/components/views/RenderPost.astro`
- Layout: `src/layouts/StandardLayout.astro`

## Visual/Browser Findings
- At 1440x1000, the current index has a useful left catalog and a narrow center list, but most of the right half is empty.
- At 1440x1000, the current post uses the left side for the page TOC, center for a narrow article, and leaves the right side empty; blog hierarchy is no longer visible.
- The Sitor reference uses a stable three-part reader: roughly 300px course navigation, flexible center article, and roughly 220px page TOC.
- The active lesson is highlighted in the left navigation, which makes switching lessons feel contextual rather than like leaving the page.
- The reference keeps visual motion low; continuity comes from stable geometry, not animation.
- The first implementation at 1440x1000 now matches the intended structure: shared blog catalog on the left, article in the center, and page TOC on the right.
- The index and detail routes now start from the same left catalog header and category geometry, removing the strongest visual discontinuity.
- At 1200x900, the left catalog remains usable and the right TOC correctly collapses to the existing floating TOC button without overlapping the article.
- Dark mode preserves active-category, active-post, code-block, and TOC hierarchy without introducing a new palette.
- At 390x844, both index and detail collapse cleanly to a single article column; the blog catalog trigger remains on the lower left and the existing page TOC control remains on the lower right for articles.
- Mobile light and dark modes retain readable title wrapping, action buttons, body measure, and code-block contrast.
- The fully opened mobile catalog is 319.8px wide at a 390px viewport, shows the active category and article clearly, and closes with Escape.
- Automated filtering now confirms all 550 posts restore after search, a title query narrows the list correctly, and category selection updates both the visible posts and `?category=` URL state.
- The old list-search selector targeted a removed `.flex-grow` wrapper; using `.list-item-title` restores main-list search behavior.
- Blog and music search controls previously shared the `search-clear` ID; blog search controls now use scoped, unique IDs.
- The closed mobile catalog is now inert, opening moves focus into the dialog, Tab is trapped among visible controls, and Escape restores focus to the trigger.
