---
name: 42 Explorer
description: A read-first browser over the 42 School API, drawn like a schematic.
colors:
  paper: "oklch(98% 0.008 75)"
  paper-rule: "oklch(95% 0.008 75)"
  ink: "oklch(22% 0.01 250)"
  ink-soft: "oklch(38% 0.01 250)"
  ink-mute: "oklch(58% 0.01 250)"
  rule: "oklch(82% 0.01 250)"
  rule-strong: "oklch(70% 0.01 250)"
  plotter-blue: "oklch(54% 0.13 235)"
  plotter-blue-tint: "oklch(94% 0.04 235)"
  amber: "oklch(72% 0.14 75)"
  amber-tint: "oklch(95% 0.05 75)"
  vermillion: "oklch(58% 0.18 28)"
  vermillion-tint: "oklch(95% 0.04 28)"
typography:
  display:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: "0"
  body:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0"
  label:
    fontFamily: "ui-monospace, 'SF Mono', 'JetBrains Mono', 'Menlo', monospace"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "0.02em"
  mono:
    fontFamily: "ui-monospace, 'SF Mono', 'JetBrains Mono', 'Menlo', monospace"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "0"
rounded:
  none: "0"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "20px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "0 12px"
    height: "36px"
  button-primary-hover:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
  button-secondary:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "0 12px"
    height: "36px"
  input:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "0 8px"
    height: "36px"
  table-header:
    backgroundColor: "{colors.paper-rule}"
    textColor: "{colors.ink-soft}"
  nav-link-active:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    padding: "8px 12px"
  nav-link-rest:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink-soft}"
    padding: "8px 12px"
  badge-live:
    backgroundColor: "{colors.plotter-blue-tint}"
    textColor: "{colors.plotter-blue}"
    rounded: "{rounded.none}"
    padding: "2px 6px"
  badge-warn:
    backgroundColor: "{colors.amber-tint}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "2px 6px"
  alert-error:
    backgroundColor: "{colors.vermillion-tint}"
    textColor: "{colors.vermillion}"
    rounded: "{rounded.none}"
    padding: "12px"
---

# Design System: 42 Explorer

## 1. Overview

**Creative North Star: "The Schematic"**

42 Explorer is drawn like a plotted schematic on warm draughtsman's paper: a single ink color does the bulk of the work, hairline rules carve the surface into measured regions, and one technical accent (plotter blue) is reserved for live state and active selection. The aesthetic is the inverse of a SaaS dashboard. There are no gradients, no shadows, no decorative illustration, no rounded corners. Every line is intentional; every label earns its place. The reader feels they are looking at the school's data through a precise instrument, not a marketing surface.

This system explicitly rejects intra.42.fr's institutional look (heavy chrome, modal flows, dense tabs), the SaaS hero-metric template (gradient tiles, "Welcome back" banners), and enterprise admin density (ribbons, nested toolbars, modal-everything). It also rejects consumer-cute: no mascots, no playful illustrations, no rounded-cartoon vibe. The personality is **precise, dense, calm** — pleasant precisely because nothing competes for attention.

**Key Characteristics:**
- Single-ink default with one cool accent for live state and one warm hue for warnings.
- Warm-paper background (never `#fff`) sets a calm, analog ground.
- Hairline rules (1px, `rule`) carve the surface; no shadows, no rounded corners.
- Monospaced labels for IDs, timestamps, counts; proportional sans for prose and names.
- Density is real: tables and lists pack rows tightly, but vertical rhythm and label/value contrast keep them scannable.

## 2. Colors

A near-monochrome palette of warm paper and dark ink, with one cool accent (plotter blue) for selection and live state, one warm hue (amber) for warnings, and a single saturated vermillion reserved for errors. Total color weight on any screen stays below 10%.

### Primary
- **Plotter Blue** (`oklch(54% 0.13 235)`): The single accent. Used for active selection, live-online indicators, currently-playing slot timers, and "you are here" wayfinding. Never decorative. If it appears, it carries information. Paired with **Plotter Blue Tint** (`oklch(94% 0.04 235)`) for active-row backgrounds and live badges.

### Secondary
- **Amber** (`oklch(72% 0.14 75)`): Warning state only — expiring tokens, deprecated endpoints, rate-limit approach. Paired with **Amber Tint** (`oklch(95% 0.05 75)`) for warning panels. Never used for emphasis.

### Tertiary
- **Vermillion** (`oklch(58% 0.18 28)`): Error state only — API errors, 4xx/5xx responses, scope-denied messages. Paired with **Vermillion Tint** (`oklch(95% 0.04 28)`) as the error panel background, replacing the existing Tailwind `red-50/200/700/900` stack.

### Neutral
- **Paper** (`oklch(98% 0.008 75)`): The page ground. A warm off-white tinted toward amber. Used as the default `<body>` background, button rest fill, and input fill. Never `#fff`.
- **Paper Rule** (`oklch(95% 0.008 75)`): Table headers, code blocks, zebra-stripe surfaces. One step deeper than Paper, same hue.
- **Ink** (`oklch(22% 0.01 250)`): The single dark. Primary text, primary borders at full strength, hover-fill on inverting buttons. Never `#000`.
- **Ink Soft** (`oklch(38% 0.01 250)`): Secondary text, table-header text, table-cell prose that isn't the primary value.
- **Ink Mute** (`oklch(58% 0.01 250)`): Tertiary text, captions, "n/a" placeholders, deemphasized labels.
- **Rule** (`oklch(82% 0.01 250)`): The default 1px border. Used on cards, tables, dividers, inputs at rest.
- **Rule Strong** (`oklch(70% 0.01 250)`): Section dividers and table-header underlines that need to read as structure, not just texture.

### Named Rules
**The One Voice Rule.** Plotter Blue is used on ≤10% of any screen. Its scarcity is what makes it readable as "this is live" or "this is selected." If a second element wants the same color, one of them is misusing it.

**The Warm-Paper Rule.** Backgrounds are never `#fff` and text is never `#000`. The page ground is `paper`; the darkest ink is `ink`. The eye should never feel it is staring at a fluorescent rectangle.

**The Color-Means-State Rule.** Plotter blue means *live or selected*. Amber means *warning*. Vermillion means *error*. Colors carry meaning; they are not decoration. If a color appears without state, it is wrong.

## 3. Typography

**Display Font:** System sans (`ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif`) — native to each platform, no web font cost.
**Body Font:** Same system sans, used at smaller sizes.
**Label / Mono Font:** System mono (`ui-monospace, 'SF Mono', 'JetBrains Mono', 'Menlo', monospace`) — used for IDs, logins, timestamps, counts, keyboard hints, and section labels.

**Character:** Native and direct. The pairing is deliberately unbranded — the system sans hands the visual identity over to the data and the schematic chrome, and the mono signals "this is a value, not prose." No web fonts means no flash-of-unstyled-text, which matters for a fast-lookup tool.

### Hierarchy
- **Display** (`600`, `1.5rem` / 24px, `1.2`, `-0.01em`): Page titles only ("Students", "Locations", "Events"). One per page.
- **Headline** (`500`, `1.125rem` / 18px, `1.3`): Section headings inside a page ("Profile", "Campus snapshot", "Projects").
- **Body** (`400`, `0.875rem` / 14px, `1.5`): The default for everything else — table cells, paragraph text, field labels above inputs. Max line length 65–75ch in prose contexts.
- **Label** (`500`, `0.75rem` / 12px, `1.2`, `0.02em` tracking): Monospace. Used uppercase for column headers, badge text, and kbd hints; sentence-case for inline metadata.
- **Mono** (`400`, `0.8125rem` / 13px, `1.4`): Monospace at body-ish size. Used for logins, intra IDs, ISO timestamps, file paths, raw JSON values. Sets cadets apart from prose visually so the eye finds an identifier instantly.

### Named Rules
**The Mono-Means-Value Rule.** If the text is a stable identifier (login, ID, timestamp, file path), it is monospace. Prose, names, and titles are always proportional. The font itself signals "this is something you can copy and paste."

**The One-Title Rule.** A page has exactly one Display heading. Anything else competing for that role is a Headline.

## 4. Elevation

The system is **flat by doctrine**. There are no box-shadows anywhere. Depth, when needed, is conveyed by hairline rules (`rule` at 1px) and tonal layering (Paper Rule sitting on Paper). Hover and focus states change color and weight, not elevation. Modals are rare on purpose — most state lives inline, expanded in place.

### Named Rules
**The No-Shadow Rule.** `box-shadow` is forbidden on every component. If a thing needs to stand out, give it a hairline border, a tonal shift, or a position; never a shadow.

**The Hairline-Only Rule.** Borders are 1px, `rule` by default, `rule-strong` only when structural. No 2px borders, no 3px accent stripes, no colored left-borders as decoration. If a side-stripe seems necessary, the layout itself is failing.

## 5. Components

### Buttons
- **Shape:** Rectangular. 0px radius. Always.
- **Height:** 36px. Padding 0 12px.
- **Primary:** Paper fill, Ink text, 1px Ink border. On hover, fill and text invert — Ink fill, Paper text. No transition longer than 80ms, ease-out.
- **Secondary:** Paper fill, Ink text, 1px Rule border. On hover, border darkens to Ink. Same height, same padding as primary.
- **Focus:** A 2px Plotter Blue outline offset 2px outside the border. Always visible on keyboard focus; never suppressed.

### Inputs / Fields
- **Style:** Paper fill, 1px Rule border, 0px radius, 36px height (matches buttons so they align in toolbars). Ink text.
- **Focus:** Border shifts to Plotter Blue. No glow, no shadow.
- **Label:** Sits above the input as Body text in Ink Soft. Always present; placeholder is hint, not replacement.
- **Error:** Border shifts to Vermillion; an error line in Vermillion appears below at Label size.

### Tables
- **Shape:** Rectangular. 1px Rule border around the whole. No internal cell borders except a single Rule under the header row and Rule dividers between rows (`divide-y`).
- **Header:** Paper Rule background, Ink Soft text, Label size + uppercase tracking. Sticky on long tables.
- **Cell padding:** 12px horizontal, 8px vertical. The primary value in each row uses Body weight 500; secondary values are Body 400 in Ink Soft.
- **Active row:** Plotter Blue Tint background. Used for "current selection," not for hover.
- **Hover:** Paper Rule background. Subtle. Cursor pointer only if the row is interactive.

### Navigation
- **Sidebar:** Vertical stack of links. Each link is Body size, 8px × 12px padding, Ink Soft at rest, Ink on hover, Ink fill + Paper text when active (matches existing code; keep). 0 radius.
- **Logo:** Top of sidebar. Display weight 600, Headline size. Plain text, no mark.
- **Footer area:** Auth state — current login in Mono, sign-out as a single underlined link in Body size.

### Badges
- **Live** (`badge-live`): Plotter Blue Tint background, Plotter Blue text, Label size, 2px × 6px padding, 0 radius. Used for "online," "live slot," "current evaluation."
- **Warn** (`badge-warn`): Amber Tint background, Ink text, Label size. Used for "scope-restricted," "deprecated," "rate limited."
- **Meta** (existing `border + neutral` tag style): 1px Rule border, Paper fill, Ink Soft text, Label size. Used for non-stateful tags like event kind, project type.

### Alerts
- **Error** (`alert-error`): Vermillion Tint fill, Vermillion text for the leading line, Ink for the body. 1px Vermillion border. No icon, no close button — the panel describes the error and offers a single inline action (retry, re-auth). Replaces the current Tailwind `red-*` stack.

### Schematic Header (signature)
The header strip on each page — title + a thin row of metadata (counts, filters, the "n total" indicator) — should read like the title block of a technical drawing. Display title at left, monospace metadata at right, separated by a 1px Rule-Strong line below. This is the single distinctive component worth keeping consistent across every page.

## 6. Do's and Don'ts

### Do:
- **Do** use `paper` as the page ground and `ink` as the darkest text. Never `#fff` or `#000`.
- **Do** keep Plotter Blue under 10% of any screen — it must mean live or selected.
- **Do** use monospace for any value that's an identifier (login, ID, timestamp, file path) and proportional sans for prose.
- **Do** convey depth with hairline rules and tonal layering only. Borders are 1px `rule`; structural ones are 1px `rule-strong`.
- **Do** invert on hover for primary buttons (Paper → Ink fill). Keep transitions ≤ 80ms, ease-out.
- **Do** keep page titles to one Display heading per page. Sections use Headline.
- **Do** preserve focus rings: 2px Plotter Blue outline offset 2px. Visible on keyboard focus everywhere.
- **Do** respect `prefers-reduced-motion`; default to near-zero animation regardless.

### Don't:
- **Don't** mimic intra.42.fr — no institutional ribbons, no modal-heavy flows, no its-color-palette.
- **Don't** ship SaaS-dashboard cliches: no hero-metric tiles, no gradient stat cards, no identical icon+heading grids, no "Welcome back" banners.
- **Don't** ship enterprise admin chrome: no ribbons, no nested tab strips, no toolbars-on-toolbars, no modal-as-first-thought.
- **Don't** add consumer-cute decoration: no mascots, no illustrations, no rounded-cartoon vibe, no playful fonts.
- **Don't** use `border-radius` greater than 0 on any surface. The whole system is rectangular.
- **Don't** use `box-shadow`. Anywhere. Use a hairline border or a tonal shift.
- **Don't** apply `background-clip: text` with gradients. Single solid colors only; emphasis through weight and size.
- **Don't** use color decoratively. Plotter Blue means live/selected. Amber means warning. Vermillion means error. If a color appears without state, remove it.
- **Don't** put `border-left` greater than 1px as a colored stripe on cards, list rows, or callouts. If you reach for that, redesign the row.
- **Don't** introduce web fonts. System stacks only — flash-of-unstyled-text is a worse experience than the platform default.
- **Don't** use em dashes in UI copy. Use commas, colons, semicolons, periods, or parentheses.
- **Don't** add disabled buttons or "coming soon" tags for V1's read-only scope. Link out to intra.42.fr instead.
