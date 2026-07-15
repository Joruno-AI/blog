# Blog Music Theme-Adaptive 3D Design System

## 1. Atmosphere & Identity

The blog remains content-first, and `/music` should feel like a focused 3D
listening surface that belongs to the same site. The page inherits the blog's
monochrome theme tokens, then adds one high-craft WebGL gramophone as the
signature object.

The page must not read as a pasted image, a flat dashboard, a forced dark room,
or a generic purple-blue AI interface. It is a theme-aware WebGL instrument
stage with restrained HUD panels for album selection and playback.

## 2. Color

### Palette

| Role | Token | Source | Usage |
| --- | --- | --- | --- |
| Stage base | `--music-stage-0` | `color-mix(var(--c-bg), var(--c-text))` | Full music-page backdrop |
| Stage depth | `--music-stage-1` | `color-mix(var(--c-bg), var(--c-text))` | Subtle dimensional gradient |
| Stage plane | `--music-stage-2` | `color-mix(var(--c-bg), var(--c-text))` | Atmospheric depth layer |
| Material brass | `--music-brass` | Muted brass mixed with `--c-text` | Small active accents and 3D material cues |
| Brass highlight | `--music-brass-hot` | Soft brass mixed with `--c-text` | Specular and progress highlights |
| Material copper | `--music-copper` | Muted copper mixed with theme text | Secondary 3D material accent |
| Rim neutral | `--music-rim` | `color-mix(var(--c-text), var(--c-bg))` | Model edge separation only |
| Ink text | `--music-ink` | `var(--c-text)` | Primary text on music page |
| Muted text | `--music-ink-soft` | `var(--c-text-muted)` | Secondary text |
| HUD surface | `--music-hud` | Transparent `var(--c-bg)` mix | Sidebar and bottom panels |
| HUD border | `--music-hud-line` | `var(--c-border-soft)` | Panel edges |

### Rules

- The UI chrome follows blog theme tokens first. Brass is a material accent, not
  the page palette.
- Large surfaces must not force fixed black, wine, gold, or teal. Light and dark
  modes need to look intentionally related to the rest of the blog.
- Sidebars use theme glass surfaces and soft borders instead of hard dark rails.
- Album art supplies local color only after selection.

## 3. Typography

### Scale

| Level | Size | Weight | Line Height | Usage |
| --- | --- | --- | --- | --- |
| HUD title | `1rem` | 650 | 1.25 | Panel headers |
| Body | `0.92rem` | 400 | 1.55 | Song and album copy |
| Caption | `0.75rem` | 500 | 1.35 | Counts, metadata, controls |

### Rules

- `/music` does not need a hero headline; the 3D object is the headline.
- Chinese text should remain compact and avoid awkward one-character orphan
  lines where practical.
- Do not introduce marketing copy or meta-labels such as "SECTION 01".

## 4. Spacing & Layout

### Base Unit

Spacing uses a 4px base unit. Music HUD spacing uses 8, 12, 16, 20, 24, and
32px.

### Structure

- The page is a fixed, full-viewport stage below the site navigation.
- Desktop: center WebGL scene, left album HUD, right playlist HUD. Side panels
  float inside the stage with transparent material instead of hard white rails.
- Tablet/mobile: side panels become theme glass sheets controlled by the
  existing bottom buttons; the 3D scene remains the first visual priority.

## 5. Components

### 3D Gramophone Stage

- **Structure**: full WebGL canvas, transparent scene, layered CSS atmosphere.
- **Material**: brass horn, walnut plinth, black vinyl, chrome/tonearm details.
- **States**: idle record is visible; selected albums update the record cover;
  playing state rotates platter and record.
- **Interaction**: drag scene to orbit, wheel/pinch to zoom, click tonearm to
  play/pause, drag knob to adjust volume.
- **Motion**: continuous movement only maps to playback or camera interaction.

### HUD Sidebar

- **Structure**: translucent theme panel with blur, soft border, and restrained
  inner highlight.
- **Variants**: album library, playlist, selected state, empty state.
- **States**: hover/active use theme surface elevation plus a small brass
  material accent, not oversized glow.
- **Motion**: transform/opacity only, 180-320ms.

### Floating Music Button

- **Structure**: circular theme glass button with a small material accent.
- **States**: visible when music is active away from `/music`.
- **Motion**: record icon spin only indicates active playback continuity.

## 6. Motion & Interaction

| Type | Duration | Easing | Usage |
| --- | --- | --- | --- |
| Micro | 120-180ms | ease-out | Button and row feedback |
| Panel | 220-320ms | cubic-bezier(0.16, 1, 0.3, 1) | Sheet/sidebar movement |
| Stage | frame loop | requestAnimationFrame | WebGL rendering and playback motion |

Rules:

- Animate `transform`, `opacity`, and `filter`; avoid layout-property animation.
- Honor `prefers-reduced-motion` for CSS animation. WebGL playback movement is
  stateful behavior, not decoration.
- Do not add decorative hover motion to non-interactive elements.

## 7. Depth & Surface

Depth comes from three layers:

| Layer | Treatment | Usage |
| --- | --- | --- |
| Atmosphere | theme-derived radial gradients plus subtle grain | Page backdrop |
| Object | WebGL lights, shadows, fog, metal roughness | Gramophone and record |
| HUD | theme glass, soft shadow, restrained inner sheen | Side panels and controls |

The focal object must be live geometry, not a raster image. Screenshots or
photos may only be used as album art.

## 8. Accessibility Constraints & Accepted Debt

### Constraints

- HUD text must maintain WCAG 2.2 AA contrast in both light and dark themes.
- Existing controls keep visible hover/focus affordances.
- Touch targets should stay at least 44px where practical.
- Reduced-motion users should not receive extra CSS decorative animation.

### Accepted Debt

| Item | Location | Why accepted | Owner / Exit |
| --- | --- | --- | --- |
| Album cards are pointer-first | `src/components/music/VinylCard.astro` | Existing implementation uses clickable divs. This pass keeps playback behavior stable while changing the stage and styling. | Replace with real buttons in a focused accessibility pass. |
