# [UI UX Pro Max](https://uupm.cc)

<p align="center">
  <a href="https://github.com/nextlevelbuilder/ui-ux-pro-max-skill/blob/main/README.vi.md">🇻🇳 Tiếng Việt</a> |
  <a href="https://github.com/nextlevelbuilder/ui-ux-pro-max-skill/blob/main/README.zh.md">🇨🇳 简体中文</a> |
  <a href="https://github.com/nextlevelbuilder/ui-ux-pro-max-skill/blob/main/README.md">🇺🇸 English</a>
</p>

<p align="center">
  <a href="https://github.com/nextlevelbuilder/ui-ux-pro-max-skill/releases"><img src="https://img.shields.io/github/v/release/nextlevelbuilder/ui-ux-pro-max-skill?style=for-the-badge&color=blue" alt="GitHub Release"></a>
  <img src="https://img.shields.io/badge/reasoning_rules-192-green?style=for-the-badge" alt="192 Reasoning Rules">
  <img src="https://img.shields.io/badge/UI_styles-79_searchable-purple?style=for-the-badge" alt="79 searchable UI styles">
  <img src="https://img.shields.io/badge/python-3.x-yellow?style=for-the-badge&logo=python&logoColor=white" alt="Python 3.x">
  <a href="https://github.com/nextlevelbuilder/ui-ux-pro-max-skill/blob/main/LICENSE"><img src="https://img.shields.io/github/license/nextlevelbuilder/ui-ux-pro-max-skill?style=for-the-badge&color=green" alt="License"></a>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/ui-ux-pro-max-cli"><img src="https://img.shields.io/npm/v/ui-ux-pro-max-cli?style=flat-square&logo=npm&label=CLI" alt="npm"></a>
  <a href="https://www.npmjs.com/package/ui-ux-pro-max-cli"><img src="https://img.shields.io/npm/dm/ui-ux-pro-max-cli?style=flat-square&label=downloads" alt="npm downloads"></a>
  <a href="https://github.com/nextlevelbuilder/ui-ux-pro-max-skill/stargazers"><img src="https://img.shields.io/github/stars/nextlevelbuilder/ui-ux-pro-max-skill?style=flat-square&logo=github" alt="GitHub stars"></a>
  <a href="https://paypal.me/uiuxpromax"><img src="https://img.shields.io/badge/PayPal-Support%20Development-00457C?style=flat-square&logo=paypal&logoColor=white" alt="PayPal"></a>
</p>

An AI skill that provides design intelligence for building professional UI/UX across multiple platforms and frameworks.

<p align="center">
  <a href="https://uupm.cc">
    <img src="screenshots/website.png" alt="UI UX Pro Max" width="800">
  </a>
</p>

<p align="center">
  <b>If you find this useful, consider supporting the project:</b><br><br>
  <a href="https://paypal.me/uiuxpromax"><img src="https://img.shields.io/badge/PayPal-Donate-00457C?style=for-the-badge&logo=paypal&logoColor=white" alt="PayPal Donate"></a>
</p>

<p align="center">
  <i>Other projects</i><br>
  <a href="https://nextlevelbuilder.io">NextLevelBuilder.io</a> | <a href="https://goclaw.sh">GoClaw.sh</a> | <a href="https://claudekit.cc">ClaudeKit.cc</a> | <a href="https://tose.sh">TOSE.sh</a>
</p>

## What's New in v2.0

### Intelligent Design System Generation

The flagship feature of v2.0 is the **Design System Generator** - an AI-powered reasoning engine that analyzes your project requirements and generates a complete, tailored design system in seconds.

```
+----------------------------------------------------------------------------------------+
|  TARGET: Serenity Spa - RECOMMENDED DESIGN SYSTEM                                      |
+----------------------------------------------------------------------------------------+
|                                                                                        |
|  PATTERN: Hero-Centric + Social Proof                                                  |
|     Conversion: Emotion-driven with trust elements                                     |
|     CTA: Above fold, repeated after testimonials                                       |
|     Sections:                                                                          |
|       1. Hero                                                                          |
|       2. Services                                                                      |
|       3. Testimonials                                                                  |
|       4. Booking                                                                       |
|       5. Contact                                                                       |
|                                                                                        |
|  STYLE: Soft UI Evolution                                                              |
|     Keywords: Soft shadows, subtle depth, calming, premium feel, organic shapes        |
|     Best For: Wellness, beauty, lifestyle brands, premium services                     |
|     Performance: cost:low | Accessibility: risk:conditional; verify requirements       |
|                                                                                        |
|  COLORS:                                                                               |
|     Primary:    #E8B4B8 (Soft Pink)                                                    |
|     Secondary:  #A8D5BA (Sage Green)                                                   |
|     CTA:        #D4AF37 (Gold)                                                         |
|     Background: #FFF5F5 (Warm White)                                                   |
|     Text:       #2D3436 (Charcoal)                                                     |
|     Notes: Calming palette with gold accents for luxury feel                           |
|                                                                                        |
|  TYPOGRAPHY: Cormorant Garamond / Montserrat                                           |
|     Mood: Elegant, calming, sophisticated                                              |
|     Best For: Luxury brands, wellness, beauty, editorial                               |
|     Google Fonts: https://fonts.google.com/share?selection.family=...                  |
|                                                                                        |
|  KEY EFFECTS:                                                                          |
|     Soft shadows + Context-appropriate transitions + Gentle hover states               |
|                                                                                        |
|  AVOID (Anti-patterns):                                                                |
|     Bright neon colors + Harsh animations + Dark mode + AI purple/pink gradients       |
|                                                                                        |
|  PRE-DELIVERY CHECKLIST:                                                               |
|     [ ] No emojis as icons (use SVG: Heroicons/Lucide)                                 |
|     [ ] cursor-pointer on all clickable elements                                       |
|     [ ] Interaction timing follows the platform, component, and user preference        |
|     [ ] Light mode: text contrast 4.5:1 minimum                                        |
|     [ ] Focus states visible for keyboard nav                                          |
|     [ ] prefers-reduced-motion respected                                               |
|     [ ] Text, chips, and badges reflow without clipping or broken labels               |
|     [ ] Responsive: 375px, 768px, 1024px, 1440px                                       |
|                                                                                        |
+----------------------------------------------------------------------------------------+
```

### How Design System Generation Works

```
┌─────────────────────────────────────────────────────────────────┐
│  1. USER REQUEST                                                │
│     "Build a landing page for my beauty spa"                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. MULTI-DOMAIN SEARCH (5 parallel searches)                   │
│     • Product type matching (192 categories)                    │
│     • Style recommendations (79 searchable; 50 active)          │
│     • Color palette selection (192 palettes)                    │
│     • Landing page patterns (34 patterns)                       │
│     • Typography pairing (74 font combinations)                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. REASONING ENGINE                                            │
│     • Match product → UI category rules                         │
│     • Apply style priorities (BM25 ranking)                     │
│     • Filter anti-patterns for industry                         │
│     • Process decision rules (JSON conditions)                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. COMPLETE DESIGN SYSTEM OUTPUT                               │
│     Pattern + Style + Colors + Typography + Effects             │
│     + Anti-patterns to avoid + Pre-delivery checklist           │
└─────────────────────────────────────────────────────────────────┘
```

### 192 Industry-Specific Reasoning Rules

The reasoning engine includes specialized rules for:

| Category | Examples |
|----------|----------|
| **Tech & SaaS** | SaaS, Micro SaaS, B2B Service, Developer Tool / IDE, AI/Chatbot Platform, Cybersecurity Platform |
| **Finance** | Fintech/Crypto, Banking, Insurance, Personal Finance Tracker, Invoice & Billing Tool |
| **Healthcare** | Medical Clinic, Pharmacy, Dental, Veterinary, Mental Health, Medication Reminder |
| **E-commerce** | General, Luxury, Marketplace (P2P), Subscription Box, Food Delivery |
| **Services** | Beauty/Spa, Restaurant, Hotel, Legal, Home Services, Booking & Appointment |
| **Creative** | Portfolio, Agency, Photography, Gaming, Music Streaming, Photo/Video Editor |
| **Lifestyle** | Habit Tracker, Recipe & Cooking, Meditation, Weather, Diary, Mood Tracker |
| **Emerging Tech** | Web3/NFT, Spatial Computing, Quantum Computing, Autonomous Drone Fleet |

Each rule includes:
- **Recommended Pattern** - Landing page structure
- **Style Priority** - Best matching UI styles
- **Color Mood** - Industry-appropriate palettes
- **Typography Mood** - Font personality matching
- **Key Effects** - Animations and interactions
- **Anti-Patterns** - What NOT to do (e.g., "AI purple/pink gradients" for banking)

## Features

- **79 Searchable UI Styles (50 active)** - Glassmorphism, Claymorphism, Minimalism, Brutalism, Neumorphism, Bento Grid, Dark Mode, AI-Native UI, and more
- **192 Color Palettes** - Industry-specific palettes aligned 1:1 with the 192 product types
- **74 Font Pairings** - Curated typography combinations with Google Fonts imports
- **25 Chart Types** - Recommendations for dashboards and analytics
- **22 Tech Stacks** - React, Next.js, Astro, Vue, Nuxt.js, Nuxt UI, Svelte, SwiftUI, React Native, Flutter, HTML+Tailwind, shadcn/ui, Jetpack Compose, Angular, Laravel, Three.js, JavaFX, WPF, WinUI 3, UWP, Avalonia, Uno Platform
- **119 UX Guidelines** - Best practices, anti-patterns, accessibility rules, resilient text layout, compact labels, and cancellable interactions
- **192 Reasoning Rules** - Industry-specific design system generation (NEW in v2.0)

### Resilient Text and Compact UI

The guidance now covers common production failures around headings, long tokens,
chips, badges, and interrupted micro-interactions:

- Balanced heading wrapping is a progressive enhancement, not a guarantee that a
  specific word will remain on the last line. Designs must still work with natural
  wrapping across widths, fonts, and locales.
- Essential text must reflow without clipping at narrow widths, browser zoom, text
  scaling, and user spacing overrides. Long URLs and identifiers may wrap safely.
- Chip and tag collections should wrap or use an operable `+n` disclosure. A compact
  label should remain whole when practical; unavoidable truncation needs an accessible
  full-value path for keyboard, pointer, and touch users.
- Badge meaning cannot rely on color alone. Interactive chips need native semantics,
  visible focus, and programmatic state; live counts need meaningful context.
- Rapid interactions may cancel animation, but the final semantic state, focus, and
  content must remain correct. Timing is selected for the platform and component,
  with reduced-motion preferences respected.

### Style Taxonomy

The catalog contains **79 searchable styles** backed by stable IDs and aliases:

| Status | Count | Search behavior |
|--------|------:|-----------------|
| Active | 50 | Included in normal recommendations and shown by default in the gallery |
| Supplemental | 29 | Returned for exact or explicit variant/system intent; available through the gallery status filter |
| Deprecated | 9 | Excluded from normal ranking; legacy names redirect to a canonical style or landing pattern |

The active set covers 43 general visual families, 2 mobile-specific styles, 3 official platform/design systems, 1 platform material, and 1 core analytics style. Current official systems include Fluent 2, Shopify Polaris, and Adobe Spectrum; Liquid Glass is scoped as an Apple platform material, Material 3 Expressive remains a mobile Material variant, and Spectrum 2 is supplemental. Landing-page structures live in the separate 34-pattern landing dataset rather than competing with visual styles in BM25 ranking.

See [`styles.csv`](src/ui-ux-pro-max/data/styles.csv) for the full taxonomy and provenance-aware metadata.

## 💎 Basic vs. Premium Version Comparison

Many users ask about the differences between the open-source and premium versions. Here is a detailed breakdown to help you choose the right fit for your workflow.

### 🟢 Basic Version (This Repository)
* **Fully Open Source:** Perfect for individual developers, hobbyists, and standard projects.
* **Core UI/UX Intelligence:** Full access to 79 searchable UI styles (50 active), 192 product types, color palettes, and curated font pairings.
* **Smart Recommendations:** Built-in BM25 search engine for highly accurate design matching.
* **Cross-Platform Support:** Stack-specific guidelines supporting 22 major frameworks (React, Vue, Tailwind, iOS, Android, etc.).
* **Design System Generation:** Instantly generate tailored UI rules, patterns, and logic via CLI.

### 🟡 Premium Version
* **Extended Brand Design Skills:** Goes beyond UI/UX to include Brand Identity generation, Logo Design, Corporate Identity Programs (CIP), Banners, Presentation Slides, and custom Iconography.
* **Advanced Asset Creation:** Deep integration with AI-powered image generation to create real visual assets, not just placeholders.
* **Enterprise Architecture:

> _README 过长已截断, 完整内容请查看 GitHub 仓库。_
