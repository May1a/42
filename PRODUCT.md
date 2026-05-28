# Product

## Register

product

## Users

42 cadets — students enrolled at a 42 school, logged in with their 42 OAuth account. They reach for this app when they want to look something up about the school's people, projects, or rooms: who's around, who's on what project, where's an open evaluation slot, which classmates share a cursus. Context is usually quick, on-laptop, between sessions in the cluster — not deep planning. The job is **fast lookup and scanning**, not long-form analysis.

## Product Purpose

42 Explorer is a read-first browser over the 42 School API. It exists because the official intranet is slow, cluttered, and not optimized for scanning across people, projects, locations, and slots in one place. Success = a cadet can pull up a peer's profile, find an open slot, or scout a project in a few seconds, with less friction than intra.42.fr. V1 is read-only; writes (slot bookings, project signups, evals, profile edits) are intentionally out of scope.

## Brand Personality

Sharp, terminal, no-nonsense — but pleasant to use. Power-user lens with the politeness of a well-made tool. Three words: **precise, dense, calm**. Voice is direct and unhyped; the app says what it knows and stops. No marketing copy, no exclamation points, no encouragement. Density is a feature, but density without rhythm is hostile — every dense view earns its weight with deliberate typography, generous line-height where it counts, and quiet color. Think Linear, Raycast, k9s, Pinboard — tools that look like they were built by someone who uses them every day.

## Anti-references

- **The 42 intranet (intra.42.fr).** Whatever this app becomes, it must not feel like another skin on the same thing. No mimicking its color palette, its iconography, its information layout, or its modal-heavy interaction model.
- **Generic SaaS dashboards.** No hero metric tiles, no gradient stat cards, no identical icon-plus-title grids, no "Welcome back, Alex 👋" banners, no empty-state illustrations of paper airplanes.
- **Enterprise admin chrome (Salesforce/ServiceNow class).** No ribbons, no nested tab strips, no toolbars-on-toolbars, no modal-as-first-thought. If a panel can be inline or progressive, it must be.
- **Consumer-cute styling.** No mascots, no rounded-cartoon illustrations, no decorative gradients, no playful font pairings. The 42 community has its own culture; this app reflects it through restraint, not iconography.

## Design Principles

1. **Density with rhythm.** Show a lot, but not all at once and not at one tempo. Vary spacing, weight, and alignment to make dense surfaces scannable instead of suffocating.
2. **Keyboard-first, mouse-second.** A cadet should be able to traverse the app — search, navigate, jump between profiles and projects — without leaving the home row. Visible affordances confirm what shortcuts already do.
3. **The data is the design.** Names, intervals, statuses, locations carry the visual weight. Chrome, icons, and decoration recede. If a label can be removed because the value speaks for itself, remove it.
4. **Quiet by default, loud on demand.** Neutral palette, low chroma, no animation noise. Color reserved for state that genuinely matters (live/online, error, active selection) and used sparingly enough that it actually means something.
5. **Honest about being read-only.** V1 doesn't write. Don't pretend with disabled buttons, "coming soon" tags, or affordances that imply interactivity that isn't there. Show what is, link out to intra for what isn't.

## Accessibility & Inclusion

Target WCAG 2.1 AA. Contrast meets AA on all text including dense tabular content; focus rings are always visible and keyboard navigation reaches every interactive element. Respect `prefers-reduced-motion` (default to minimal motion regardless — see Design Principles). No reliance on color alone to convey state; pair every color signal with a glyph, label, or position cue. Beyond compliance: "pleasant to use" is a stated goal, so prioritize readable type sizes, generous touch targets on mobile, and forgiving keyboard navigation over compactness when the two conflict.
