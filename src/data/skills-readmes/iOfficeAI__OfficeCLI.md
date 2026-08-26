# OfficeCLI

> **OfficeCLI is the world's first and the best Office suite designed for AI agents.**

**Give any AI agent full control over Word, Excel, and PowerPoint — in one line of code.**

Open-source. Single binary. No Office installation. No dependencies. Works everywhere.

**OfficeCLI's built-in HTML rendering engine reproduces documents with high fidelity — and that's what gives AI eyes.** It renders `.docx` / `.xlsx` / `.pptx` to HTML or PNG, closing the *render → look → fix* loop.

[![GitHub Release](https://img.shields.io/github/v/release/iOfficeAI/OfficeCLI)](https://github.com/iOfficeAI/OfficeCLI/releases)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)

**English** | [中文](README_zh.md) | [日本語](README_ja.md) | [한국어](README_ko.md)

<p align="center">
  <strong>🌐 Website:</strong> <a href="https://officecli.ai" target="_blank">officecli.ai</a> &nbsp;|&nbsp; <strong>💬 Community:</strong> <a href="https://discord.gg/2QAwJn7Egx" target="_blank">Discord</a>
</p>

<p align="center">
  <img src="assets/ppt-process.webp" alt="OfficeCLI creating a PowerPoint presentation on AionUi" width="100%">
</p>

<p align="center"><em>PPT creation process using OfficeCLI on <a href="https://github.com/iOfficeAI/AionUi">AionUi</a></em></p>

<p align="center"><strong>PowerPoint Presentations</strong></p>

<table>
<tr>
<td width="33%"><img src="assets/designwhatmovesyou.gif" alt="OfficeCLI design presentation (PowerPoint)"></td>
<td width="33%"><img src="assets/horizon.gif" alt="OfficeCLI business presentation (PowerPoint)"></td>
<td width="33%"><img src="assets/efforless.gif" alt="OfficeCLI tech presentation (PowerPoint)"></td>
</tr>
<tr>
<td width="33%"><img src="assets/blackhole.gif" alt="OfficeCLI space presentation (PowerPoint)"></td>
<td width="33%"><img src="assets/first-ppt-aionui.gif" alt="OfficeCLI gaming presentation (PowerPoint)"></td>
<td width="33%"><img src="assets/shiba.gif" alt="OfficeCLI creative presentation (PowerPoint)"></td>
</tr>
</table>

<p align="center">—</p>
<p align="center"><strong>Word Documents</strong></p>

<table>
<tr>
<td width="33%"><img src="assets/showcase/word1.gif" alt="OfficeCLI academic paper (Word)"></td>
<td width="33%"><img src="assets/showcase/word2.gif" alt="OfficeCLI project proposal (Word)"></td>
<td width="33%"><img src="assets/showcase/word3.gif" alt="OfficeCLI annual report (Word)"></td>
</tr>
</table>

<p align="center">—</p>
<p align="center"><strong>Excel Spreadsheets</strong></p>

<table>
<tr>
<td width="33%"><img src="assets/showcase/excel1.gif" alt="OfficeCLI budget tracker (Excel)"></td>
<td width="33%"><img src="assets/showcase/excel2.gif" alt="OfficeCLI gradebook (Excel)"></td>
<td width="33%"><img src="assets/showcase/excel3.gif" alt="OfficeCLI sales dashboard (Excel)"></td>
</tr>
</table>

<p align="center"><em>All documents above were created entirely by AI agents using OfficeCLI — no templates, no manual editing.</em></p>

## For AI Agents — Get Started in One Line

Paste this into your AI agent's chat — it will read the skill file and install everything automatically:

```
curl -fsSL https://officecli.ai/SKILL.md
```

That's it. The skill file teaches the agent how to install the binary and use all commands.

## For Humans

**Option A — GUI:** Install [**AionUi**](https://github.com/iOfficeAI/AionUi) — a desktop app that lets you create and edit Office documents through natural language, powered by OfficeCLI under the hood. Just describe what you want, and AionUi handles the rest.

**Option B — CLI:** Download the binary for your platform from [GitHub Releases](https://github.com/iOfficeAI/OfficeCLI/releases), then run:

```bash
officecli install
```

This copies the binary to your PATH and installs the **officecli skill** into every AI coding agent it detects — Claude Code, Cursor, Windsurf, GitHub Copilot, and more. Your agent can immediately create, read, and edit Office documents on your behalf, no extra configuration needed.

## For Developers — See It Live in 30 Seconds

```bash
# 1. Install (macOS / Linux) — or: brew install officecli / npm install -g @officecli/officecli
curl -fsSL https://raw.githubusercontent.com/iOfficeAI/OfficeCLI/main/install.sh | bash
# Windows (PowerShell): irm https://raw.githubusercontent.com/iOfficeAI/OfficeCLI/main/install.ps1 | iex

# 2. Create a blank PowerPoint
officecli create deck.pptx

# 3. Start live preview — opens http://localhost:26315 in your browser
officecli watch deck.pptx

# 4. Open another terminal, add a slide — watch the browser update instantly
officecli add deck.pptx / --type slide --prop title="Hello, World!"
```

That's it. Every `add`, `set`, or `remove` command you run will refresh the preview in real time. Keep experimenting — the browser is your live feedback loop.

## Quick Start

```bash
# Create a presentation and add content
officecli create deck.pptx
officecli add deck.pptx / --type slide --prop title="Q4 Report" --prop background=1A1A2E
officecli add deck.pptx '/slide[1]' --type shape \
  --prop text="Revenue grew 25%" --prop x=2cm --prop y=5cm \
  --prop font=Arial --prop size=24 --prop color=FFFFFF

# View as outline
officecli view deck.pptx outline
# → Slide 1: Q4 Report
# →   Shape 1 [TextBox]: Revenue grew 25%

# View as HTML — opens a rendered preview in your browser, no server needed
officecli view deck.pptx html

# Get structured JSON for any element
officecli get deck.pptx '/slide[1]/shape[1]' --json

# Save and close — flushes the resident session to disk
officecli close deck.pptx
```

```json
{
  "tag": "shape",
  "path": "/slide[1]/shape[1]",
  "attributes": {
    "name": "TextBox 1",
    "text": "Revenue grew 25%",
    "x": "720000",
    "y": "1800000"
  }
}
```

## Why OfficeCLI?

What used to take 50 lines of Python and 3 separate libraries:

```python
from pptx import Presentation
from pptx.util import Inches, Pt
prs = Presentation()
slide = prs.slides.add_slide(prs.slide_layouts[0])
title = slide.shapes.title
title.text = "Q4 Report"
# ... 45 more lines ...
prs.save('deck.pptx')
```

Now takes one command:

```bash
officecli add deck.pptx / --type slide --prop title="Q4 Report"
```

**What OfficeCLI can do:**

- **Create** documents from scratch -- blank or with content
- **Read** text, structure, styles, formulas -- in plain text or structured JSON
- **Analyze** formatting issues, style inconsistencies, and structural problems
- **Modify** any element -- text, fonts, colors, layout, formulas, charts, images
- **Reorganize** content -- add, remove, move, copy elements across documents

| Format | Read | Modify | Create |
|--------|------|--------|--------|
| Word (.docx) | ✅ | ✅ | ✅ |
| Excel (.xlsx) | ✅ | ✅ | ✅ |
| PowerPoint (.pptx) | ✅ | ✅ | ✅ |

**Word** — full [i18n & RTL support](https://github.com/iOfficeAI/OfficeCLI/wiki/i18n) (per-script font slots, per-script BCP-47 lang tags `lang.latin/ea/cs`, complex-script bold/italic/size, `direction=rtl` cascading through paragraph/run/section/table/style/header/footer/docDefaults, `rtlGutter` + `pgBorders` shorthand, locale-aware page numbering for Hindi/Arabic/Thai/CJK; `create --locale ar-SA` auto-enables RTL), [paragraphs](https://github.com/iOfficeAI/OfficeCLI/wiki/word-paragraph) (framePr, tabs shorthand, char-based indents), [runs](https://github.com/iOfficeAI/OfficeCLI/wiki/word-run) (underline.color, position half-pts), [tables](https://github.com/iOfficeAI/OfficeCLI/wiki/word-table) (virtual column ops add/remove/move/copyfrom, hMerge), [styles](https://github.com/iOfficeAI/OfficeCLI/wiki/word-style), [textbox](https://github.com/iOfficeAI/OfficeCLI/wiki/word-textbox) / [shape](https://github.com/iOfficeAI/OfficeCLI/wiki/word-shape) (textbox: rotation, `textDirection` `eaVert`/`vert270`, gradient, shadow, opacity), [headers/footers](https://github.com/iOfficeAI/OfficeCLI/wiki/word-header-footer), [images](https://github.com/iOfficeAI/OfficeCLI/wiki/word-picture) (PNG/JPG/GIF/SVG), [equations](https://github.com/iOfficeAI/OfficeCLI/wiki/word-equation) (LaTeX input), [diagrams](https://github.com/iOfficeAI/OfficeCLI/wiki/diagram) (mermaid → native editable shapes, or any mermaid type as a full-fidelity PNG), [comments](https://github.com/iOfficeAI/OfficeCLI/wiki/word-comment), [footnotes](https://github.com/iOfficeAI/OfficeCLI/wiki/word-footnote), [watermarks](https://github.com/iOfficeAI/OfficeCLI/wiki/word-watermark), [bookmarks](https://github.com/iOfficeAI/OfficeCLI/wiki/word-bookmark), [TOC](https://github.com/iOfficeAI/OfficeCLI/wiki/word-toc), [charts](https://github.com/iOfficeAI/OfficeCLI/wiki/word-chart), [hyperlinks](https://github.com/iOfficeAI/OfficeCLI/wiki/word-hyperlink), [sections](https://github.com/iOfficeAI/OfficeCLI/wiki/word-section), [form fields](https://github.com/iOfficeAI/OfficeCLI/wiki/word-formfield), [content controls (SDT)](https://github.com/iOfficeAI/OfficeCLI/wiki/word-sdt), [fields](https://github.com/iOfficeAI/OfficeCLI/wiki/word-field) (22 zero-param types + MERGEFIELD / REF / PAGEREF / SEQ / STYLEREF / DOCPROPERTY / IF), [OLE objects](https://github.com/iOfficeAI/OfficeCLI/wiki/word-ole), [revisions / tracked changes](https://github.com/iOfficeAI/OfficeCLI/wiki/word-revision) (`revision.type=ins\|del\|format\|moveFrom\|moveTo` + `revision.action=accept\|reject`, per-target `/revision[@author=Alice]` selector, tracked Find&Replace), page background color, [document properties](https://github.com/iOfficeAI/OfficeCLI/wiki/word-document)

**Excel** — [cells](https://github.com/iOfficeAI/OfficeCLI/wiki/excel-cell) (phonetic guide / furigana on add, Excel-UI `--shift left\|up` on remove / `shift=right\|down` on add), formulas (350+ built-in functions with auto-evaluation, spilling dynamic arrays with `_xlfn.` auto-prefix, financial / bond and statistical families, OFFSET/INDIRECT, defined-name formula bodies inlined at parse, formula-ref rewrite on row/col insert), [sheets](https://github.com/iOfficeAI/OfficeCLI/wiki/excel-sheet) (visible/hidden/veryHidden, print margins, printTitleRows/Cols, RTL `sheetView`, cascade-aware sheet rename, empty-cell bloat filter on open), boolean `and`/`or` selectors (`row[Salary>5000 and Region=EMEA]`), [tables](https://github.com/iOfficeAI/OfficeCLI/wiki/excel-table), [sort](https://github.com/iOfficeAI/OfficeCLI/wiki/excel-sort) (sheet / range, multi-key, sidecar-aware), [conditional formatting](https://github.com/iOfficeAI/OfficeCLI/wiki/excel-conditionalformatting), [charts](https://github.com/iOfficeAI/OfficeCLI/wiki/excel-chart) (including box-whisker, [pareto](https://github.com/iOfficeAI/OfficeCLI/wiki/excel-chart-add) with auto-sort + cumulative-%, log axis), [pivot tables](https://github.com/iOfficeAI/OfficeCLI/wiki/excel-pivottable) (multi-field, date grouping, showDataAs, sort, grandTotals, subtotals, compact/outline/tabular layout, repeat item labels, blank rows, calculated fields, persistent `labelFilter` / `topN` filters, cache CoW + cross-pivot sharing), [slicers](https://github.com/iOfficeAI/OfficeCLI/wiki/excel-slicer), [named ranges](https://github.com/iOfficeAI/OfficeCLI/wiki/excel-namedrange), [data validation](https://github.com/iOfficeAI/OfficeCLI/wiki/excel-validation), [images](https://github.com/iOfficeAI/OfficeCLI/wiki/excel-picture) (PNG/JPG/GIF/SVG with dual-representation fallback), [sparklines](https://github.com/iOfficeAI/OfficeCLI/wiki/excel-sparkline), [comments](https://github.com/iOfficeAI/OfficeCLI/wiki/excel-comment) (RTL), [autofilter](https://github.com/iOfficeAI/OfficeCLI/wiki/excel-autofilter), [shapes](https://github.com/iOfficeAI/OfficeCLI/wiki/excel-shape), [OLE objects](https://github.com/iOfficeAI/OfficeCLI/wiki/excel-ole), CSV/TSV import, `$Sheet:A1` cell addressing

**PowerPoint** — [slides](https://github.com/iOfficeAI/OfficeCLI/wiki/ppt-slide) (header/footer/date/slidenum toggles, hidden), [shapes](https://github.com/iOfficeAI/OfficeCLI/wiki/ppt-shape) (pattern fill, blur effect, hyperlink tooltip + slide-jump links, **highlight color** on runs, `slideMaster`/`slideLayout` typed add/set/remove, arrow alias, effective.X + effective.X.src), [images](https://github.com/iOfficeAI/OfficeCLI/wiki/ppt-picture) (PNG/JPG/GIF/SVG, fill modes: stretch/contain/cover/tile, brightness/contrast/glow/shadow, rotation, link + tooltip), [tables](https://github.com/iOfficeAI/OfficeCLI/wiki/ppt-table) (built-in PowerPoint style catalogue, virtual `/col[C]` get + swap/copyFrom, row/col Move/CopyFrom, fill/background alias), [charts](https://github.com/iOfficeAI/OfficeCLI/wiki/ppt-chart) (pieOfPie, barOfPie, per-attr axisLine/gridline setters, series add/remove with theme palette, `anchor=x,y,w,h` shorthand), [animations](https://github.com/iOfficeAI/OfficeCLI/wiki/ppt-shape-set) (15 emphasis + 16 exit template-backed presets, multi-effect chains, motion-path presets, repeat/restart/autoReverse, chart animations + `chartBuild`), [transitions](https://github.com/iOfficeAI/OfficeCLI/wiki/ppt-morph-check) (morph + p14 + 12 p15 PowerPoint 2013+ presets), [3D models (.glb)](https://github.com/iOfficeAI/OfficeCLI/wiki/ppt-3dmodel) (combined `rotation=ax,ay,az`), [slide zoom](https://github.com/iOfficeAI/OfficeCLI/wiki/ppt-zoom), [equations](https://github.com/iOfficeAI/OfficeCLI/wiki/ppt-equation) (LaTeX input), [diagrams](https://github.com/iOfficeAI/OfficeCLI/wiki/diagram) (mermaid flowchart / sequence → native editable shapes, or any mermaid type as a full-fidelity PNG), [themes](https://github.com/iOfficeAI/OfficeCLI/wiki/ppt-theme), [connectors](https://github.com/iOfficeAI/OfficeCLI/wiki/ppt-connector) (`from`/`to` accept a full `/slide[N]/shape[@name=Foo]` path), [video/audio](https://github.com/iOfficeAI/OfficeCLI/wiki/ppt-video) (loop, autoStart), [groups](https://github.com/iOfficeAI/OfficeCLI/wiki/ppt-group) (link + tooltip; Get/Query/Add/Remove all descend into groups), [notes](https://github.com/iOfficeAI/OfficeCLI/wiki/ppt-notes) (RTL, lang), [comments](https://github.com/iOfficeAI/OfficeCLI/wiki/ppt-comment) (RTL, legacy + modern p188 threaded round-trip), SmartArt (round-trip via add-part + raw-set), [OLE objects](https://github.com/iOfficeAI/OfficeCLI/wiki/ppt-ole), [placeholders](https://github.com/iOfficeAI/OfficeCLI/wiki/ppt-placeholder) (add/set by phType)

## Use Cases

**For Developers:**
- Automate report generation from databases or APIs
- Batch-process documents (bulk find/replace, style updates)
- Build document pipelines in CI/CD environments (generate docs from test results)
- Headless Office automation in Docker/containerized environments

**For AI Agents:**
- Generate presentations from user prompts (see examples above)
- Extract structured data from documents to JSON
- Validate and check document quality before delivery

**For Teams:**
- Clone document templates and populate with data
- Automated document validation in CI/CD pipelines

## Installation

Ships as a single self-contained binary. The .NET runtime is embedded -- nothing to install, no runtime to manage.

> _README 过长已截断, 完整内容请查看 GitHub 仓库。_
