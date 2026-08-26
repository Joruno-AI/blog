# Diagram Design

**Editorial diagrams your designer won't hate.**

<a href="https://trendshift.io/repositories/26141?utm_source=repository-badge&amp;utm_medium=badge&amp;utm_campaign=badge-repository-26141" target="_blank" rel="noopener noreferrer"><img src="https://trendshift.io/api/badge/repositories/26141" alt="cathrynlavery%2Fdiagram-design | Trendshift" width="250" height="55"/></a>

![Content site architecture](docs/screenshots/architecture.png)

![The self-improving loop](docs/screenshots/loop.png)

*New in 2.0 — the Loop: flywheels with a shared-memory hub. The dashed lines are the write-backs.*

*New in 2.3: semantic system patterns and optional accessible motion, while static output stays the default.*

*New in 2.5.10: ten more layout grammars — Sankey, fishbone, Wardley map, kanban, user journey, deployment, dependency graph, UML class, story map, and database schema.*

39 editorial diagram types for Claude Code, Codex, Factory Droid, and Pi. Self-contained HTML + SVG. No shadows. No Mermaid slop. Semantic patterns describe behavior separately from layout, so a queue, policy trace, or trust boundary can use the nearest existing type without expanding the type count. Static HTML remains the default; optional motion is available for ordered explanations. The skill also redraws draw.io or Mermaid sources at a chosen format, size, and detail level.

No Figma. No generic rounded boxes. No 30-minute color-picking sessions.

---

## Why I built it

I write at [littlemight.com](https://littlemight.com?utm_source=diagram-design&utm_medium=readme&utm_campaign=github&utm_content=intro) (and run [BestSelf.co](https://bestself.co?utm_source=diagram-design&utm_medium=readme&utm_campaign=github&utm_content=intro) on the side). Every time I needed a diagram — an architecture sketch, a flowchart, a pyramid of what matters most — I'd ask Claude and get back a generic rounded-box thing that looked nothing like the rest of the site. I'd either fight with Figma for 30 minutes or just skip the diagram.

So I built a Claude Code skill for it. Thirty-nine visual types, editorial quality, matches your brand in 60 seconds by reading your website.

> *The highest-quality move is usually deletion.* Every node earns its place. The accent color is reserved for the 1–2 things the reader should look at first. Target density: 4/10.

---

## What it makes

All 39 visual types ship in three static variants: minimal light, minimal dark, and full-editorial. Open any of them directly in a browser. There is no build step, JavaScript, or external image dependency.

<table>
<tr>
  <td align="center" width="33%"><img src="docs/screenshots/architecture.png" alt="Architecture"><br><b>Architecture</b><br><sub>Components + connections</sub></td>
  <td align="center" width="33%"><img src="docs/screenshots/it-state.png" alt="IT current-state"><br><b>IT current-state</b><br><sub>Legacy landscape + modernization</sub></td>
  <td align="center" width="33%"><img src="docs/screenshots/flowchart.png" alt="Flowchart"><br><b>Flowchart</b><br><sub>Decision logic</sub></td>
</tr>
<tr>
  <td align="center"><img src="docs/screenshots/sequence.png" alt="Sequence"><br><b>Sequence</b><br><sub>Messages over time</sub></td>
  <td align="center"><img src="docs/screenshots/state.png" alt="State machine"><br><b>State machine</b><br><sub>States + transitions</sub></td>
  <td align="center"><img src="docs/screenshots/er.png" alt="ER"><br><b>ER / data model</b><br><sub>Entities + fields</sub></td>
</tr>
<tr>
  <td align="center"><img src="docs/screenshots/timeline.png" alt="Timeline"><br><b>Timeline</b><br><sub>Events on an axis</sub></td>
  <td align="center"><img src="docs/screenshots/swimlane.png" alt="Swimlane"><br><b>Swimlane</b><br><sub>Cross-functional flow</sub></td>
  <td align="center"><img src="docs/screenshots/quadrant.png" alt="Quadrant"><br><b>Quadrant</b><br><sub>Two-axis positioning</sub></td>
</tr>
<tr>
  <td align="center"><img src="docs/screenshots/radar.png" alt="Radar chart"><br><b>Radar / spider</b><br><sub>Multi-axis comparison</sub></td>
  <td align="center"><img src="docs/screenshots/loop.png" alt="Loop"><br><b>Loop / flywheel</b><br><sub>Reinforcing cycle + shared hub</sub></td>
  <td align="center"><img src="docs/screenshots/nested.png" alt="Nested"><br><b>Nested</b><br><sub>Hierarchy by containment</sub></td>
</tr>
<tr>
  <td align="center"><img src="docs/screenshots/tree.png" alt="Tree"><br><b>Tree</b><br><sub>Parent → children</sub></td>
  <td align="center"><img src="docs/screenshots/org-chart.png" alt="Org chart"><br><b>Org chart</b><br><sub>Ownership + routing</sub></td>
  <td align="center"><img src="docs/screenshots/layers.png" alt="Layer stack"><br><b>Layer stack</b><br><sub>Stacked abstractions</sub></td>
</tr>
<tr>
  <td align="center"><img src="docs/screenshots/venn.png" alt="Venn"><br><b>Venn</b><br><sub>Set overlap</sub></td>
  <td align="center"><img src="docs/screenshots/pyramid.png" alt="Pyramid"><br><b>Pyramid / funnel</b><br><sub>Ranked hierarchy or drop-off</sub></td>
  <td align="center"><img src="docs/screenshots/bar.png" alt="Bar chart"><br><b>Bar chart</b><br><sub>Categorical comparison</sub></td>
</tr>
<tr>
  <td align="center"><img src="docs/screenshots/treemap.png" alt="Treemap"><br><b>Treemap</b><br><sub>Part-of-whole by area</sub></td>
  <td align="center"><img src="docs/screenshots/line.png" alt="Line chart"><br><b>Line chart</b><br><sub>Trends over time</sub></td>
  <td align="center"><img src="docs/screenshots/gantt.png" alt="Gantt"><br><b>Gantt</b><br><sub>Tasks + phases on a timeline</sub></td>
</tr>
<tr>
  <td align="center"><img src="docs/screenshots/scatter.png" alt="Scatter plot"><br><b>Scatter plot</b><br><sub>Distribution + correlation</sub></td>
  <td align="center"><img src="docs/screenshots/high-level.png" alt="High-Level"><br><b>High-Level</b><br><sub>End-to-end stack on a cluster</sub></td>
  <td align="center"><img src="docs/screenshots/process.png" alt="Process"><br><b>Process</b><br><sub>Multi-actor sequential workflow</sub></td>
</tr>
<tr>
  <td align="center"><img src="docs/screenshots/medallion.png" alt="Medallion"><br><b>Medallion</b><br><sub>Multi-tier data storage</sub></td>
  <td align="center"><img src="docs/screenshots/data-flow.png" alt="Data flow"><br><b>Data flow</b><br><sub>Role-scoped pipeline steps</sub></td>
  <td align="center"><img src="docs/screenshots/dp-integration.png" alt="DP integration"><br><b>DP integration</b><br><sub>Sources → core → consumers</sub></td>
</tr>
<tr>
  <td align="center"><img src="docs/screenshots/dp-security-matrix.png" alt="DP security matrix"><br><b>DP security matrix</b><br><sub>Per-role access permissions</sub></td>
  <td align="center"><img src="docs/screenshots/sankey.png" alt="Sankey"><br><b>Sankey</b><br><sub>Quantities that split + merge</sub></td>
  <td align="center"><img src="docs/screenshots/fishbone.png" alt="Fishbone"><br><b>Fishbone</b><br><sub>Grouped causes → one effect</sub></td>
</tr>
<tr>
  <td align="center"><img src="docs/screenshots/wardley.png" alt="Wardley map"><br><b>Wardley map</b><br><sub>Value chain × evolution</sub></td>
  <td align="center"><img src="docs/screenshots/kanban.png" alt="Kanban"><br><b>Kanban</b><br><sub>Work in progress by state</sub></td>
  <td align="center"><img src="docs/screenshots/journey.png" alt="User journey"><br><b>User journey</b><br><sub>Stages, actions + sentiment</sub></td>
</tr>
<tr>
  <td align="center"><img src="docs/screenshots/deployment.png" alt="Deployment"><br><b>Deployment</b><br><sub>Zones, hosts + artifacts</sub></td>
  <td align="center"><img src="docs/screenshots/dependency.png" alt="Dependency graph"><br><b>Dependency graph</b><br><sub>Fan-in, ranks + cycles</sub></td>
  <td align="center"><img src="docs/screenshots/uml-class.png" alt="UML class"><br><b>UML class</b><br><sub>Classes, operations + typed relations</sub></td>
</tr>
<tr>
  <td align="center"><img src="docs/screenshots/story-map.png" alt="Story map"><br><b>Story map</b><br><sub>Backbone × release slices</sub></td>
  <td align="center"><img src="docs/screenshots/db-schema.png" alt="Database schema"><br><b>Database schema</b><br><sub>Physical tables + column FKs</sub></td>
  <td align="center"><img src="docs/screenshots/polar.png" alt="Polar chart"><br><b>Polar chart</b><br><sub>Cyclic magnitude · linear radius</sub></td>
</tr>
</table>

The v2.5.10 release added the final ten types above. Compare their light, dark, and full-editorial variants in the [30-variant contact sheet](.github/pr-previews/editorial-diagrams-2.5.10.jpg).

**Browse the live gallery:** [cathrynlavery.github.io/diagram-design](https://cathrynlavery.github.io/diagram-design/) — or open [`skills/diagram-design/assets/index.html`](skills/diagram-design/assets/index.html) locally to flip through all 39 diagrams with light / dark / full-editorial tabs.

---

## Install

**Claude Code:**

```text
/plugin marketplace add cathrynlavery/diagram-design
/plugin install diagram-design@diagram-design
```

Then enable updates once: run `/plugin`, open **Marketplaces**, select **diagram-design**, and choose **Enable auto-update**. Claude Code disables auto-update by default for third-party marketplaces; after this toggle, it refreshes the marketplace and installed plugin in the background after startup. Run `/reload-plugins` when prompted, or let the next session load the update.

**Codex:**

```bash
codex plugin marketplace add cathrynlavery/diagram-design
codex plugin add diagram-design@diagram-design
```

Codex refreshes configured Git marketplaces at startup. To fetch immediately, run `codex plugin marketplace upgrade diagram-design` and start a new session.

**Factory Droid:**

```bash
droid plugin marketplace add https://github.com/cathrynlavery/diagram-design
droid plugin install diagram-design@diagram-design --scope user
```

Droid tracks Git plugins by commit rather than the manifest's display version. To fetch a merged update, run `droid plugin marketplace update diagram-design`, then `droid plugin update diagram-design@diagram-design --scope user`, and start a new session.

**Claude Cowork (organization marketplace):** Organization GitHub marketplaces currently require a private or internal repository, so first mirror this public repository into one owned by your organization. In **Organization settings → Plugins**, choose **Add plugin → GitHub**, connect that mirror, and enable **Sync automatically** from the marketplace menu. Automatic sync runs when a pull request containing a plugin version bump is merged to the mirror's default branch; direct pushes do not trigger the webhook. Install Diagram Design from the resulting organization marketplace.

**Pi:**

```bash
pi install https://github.com/cathrynlavery/diagram-design
```

Run `/reload` in an open Pi session. Pi makes the skill available for matching diagram requests; use `/skill:diagram-design` to invoke it explicitly. Pi also loads the `/export-diagram`, `/import-mermaid`, `/profile`, and `/doctor` prompt templates. The unpinned Git install is intentional: Pi has no automatic package refresh, so run `pi update --extensions` to pull merged updates.

> **One-time migration:** an existing standalone `npx skills add` copy will not start following the Codex marketplace automatically. Remove that standalone copy, then use the Codex marketplace commands above. Likewise, uninstall a personal Cowork copy and reinstall Diagram Design from your organization's marketplace. Future marketplace version bumps then flow through each client's native update path.

### Editable install

Managed installs are convenient, but changes to `references/style-guide.md` may be replaced by package updates. Saved profiles in `~/.diagram-design/profiles/` survive updates, and projects with a `.diagram-design` marker are unaffected. Clone the repo and install the local path if you plan to customize the working style guide directly:

```bash
git clone git@github.com:cathrynlavery/diagram-design.git ~/code/diagram-design

# Pi: register the checkout as a local package
pi install ~/code/diagram-design

# Claude Code: symlink the inner skill
ln -s ~/code/diagram-design/skills/diagram-design ~/.claude/skills/diagram-design
```

The shared skill lives at `skills/diagram-design/`. Pi discovers it through the repo's standard `skills/` package directory; Claude Code, Codex, Factory Droid, and other Agent Skills-compatible tools use the same files.

---

## Onboarding — make it look like *your* brand

The whole point: ship editorial-quality diagrams in **your** colors and typography, not a generic template.

Out of the box, diagrams render in a clean **jet-black + atomic-tangerine** palette (white-smoke paper, jet-black ink, atomic-tangerine accent, blue-slate muted, silver hairlines). Good enough to screenshot straight away. But 60 seconds of onboarding is better — the skill will pull your brand from your website and apply it across every diagram.

### The flow

```
You:     "onboard diagram-design to https://yoursite.com"
Agent:   → fetches the homepage
         → extracts the dominant palette + font stack
         → maps detected values to semantic roles:
             paper, ink, muted, accent, link
         → shows a proposed diff
         → writes your tokens to references/style-guide.md
You:     "yes, apply it"
```

Every new diagram now uses your colors. Your website's paper color becomes the diagram background. Your CTA color becomes the focal accent. Your body font stack becomes the node label family.

Brand matching also emits a fidelity receipt: sampled URLs, exact color roles, font families and weights, font source URLs, and any fallback. Public site fonts are used directly and verified after rendering rather than silently replaced with generic system fonts.

### What gets extracted

| Detected from your site | Becomes |
|---|---|
| `<body>` background | `paper` token |
| Primary text color | `ink` token |
| Secondary / caption text | `muted` token |
| Cards or containers | `paper-2` token |
| Most-used brand color (CTA, link, heading) | `accent` token |
| `<h1>` font family | `title` font |
| `<body>` font family | `node-name` font |
| `<code>` / `<pre>` font | `sublabel` font |

### Contrast checks happen automatically

Before writing tokens, the skill verifies WCAG AA contrast on `ink` over `paper`. If your site has a color that fails contrast at diagram sizes (9–12px), it proposes an adjusted value and explains why.

### Accessible by default

Every diagram template gives the inline SVG an accessible name and description: `role="img"`, a resolving `aria-labelledby`, and first-child `<title>` / `<desc>` slots. IDs are prefixed per diagram and variant, so multiple SVG exports can be safely inlined on one page without duplicate accessible-name IDs. Decorative specimen icons are hidden from assistive technology instead.

### Manual override

Prefer to set tokens by hand? Open [`skills/diagram-design/references/style-guide.md`

> _README 过长已截断, 完整内容请查看 GitHub 仓库。_
