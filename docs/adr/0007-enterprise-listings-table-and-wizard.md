# ADR 0007 — Enterprise İlan Tablosu & İlan Yükleme Sihirbazı

Status: Accepted (2026-07-28)
Supersedes: — · Related: DATA_TABLE_SPEC.md, FORMS_UX.md, DESIGN_SYSTEM.md, ADR 0002/0005

## Context

The MVP listings surfaces (`ListingsListPage`, `ListingCreatePage`) work but sit below the
"enterprise-grade" bar the product needs: the table exposes no per-column filtering, no
KPI context, no inline status editing, and only a single table view; the create form is a
plain 4-step wizard with no dynamic verification rail or live preview. A set of interactive
mockups was produced in `docs/mockups/enterprise-listings.html` (dark Calm Signal tokens,
no reference-palette cloning per Golden Rule 1) exploring the target. The user reviewed the
variants and **approved the full direction**, choosing:

- **Table** — single frame with a 4-view switch (Tablo · Kanban · Galeri · Harita), a KPI
  strip, **per-column header filters (funnel popover, icon on the LEFT of the label)**,
  inline row status quick-edit, plus the existing 10-point `DATA_TABLE_SPEC` machinery
  (faceted toolbar filters, chips, saved views, bulk bar, export, density, URL-sync).
- **Form** — ONE combined wizard: left **vertical progress rail** (F2), right **dynamic
  helper rail** with an EİDS checklist + moving quality-score ring (F1), and a **live
  preview card on the final step** (F3). Category-driven dynamic attribute fields sized to
  their content (e.g. m²/kat/yaş are narrow, not full-width), cascading il→ilçe→mahalle,
  FieldHelp on every field.

## Decision

Adopt the approved mockup as the target and implement it incrementally on top of the
existing shared `@/components/data-table` primitives and the listings feature, in phases:

- **028** — Column header filters in the shared `DataTable` (funnel popover, left of label,
  faceted/range/date/search bodies, URL-synced via the existing `setFilter`). Wire the
  listings columns; add AI-suggestion filter support to the MSW handler.
- **029** — Listings KPI strip + inline row status quick-edit column.
- **030** — Multi-view switch for listings (Kanban moderation board · Gallery · Map split),
  driven by `?view=` in the URL.
- **031** — Rebuild `ListingCreatePage` as the combined wizard (vertical rail + dynamic
  EİDS/score rail + final-step live preview), category-driven dynamic fields.

Each phase is a normal TASK-mode unit (stories + play tests + a11y + verify + dod-reviewer,
then STOP for the user's manual commit).

## Consequences

- The column-filter capability lands in the SHARED table, so every table in the app gains
  it by declaring `meta.filter` on a column — not a listings-only feature.
- No new heavy dependencies; kanban/gallery/map reuse existing tokens and (for map) the
  already-approved React Leaflet stack.
- Golden Rule 1 & 2 hold: reference palettes (İstoc amber/yellow) are NOT cloned; all
  surfaces are Calm Signal tokens.
- The mockup file stays in `docs/mockups/` as the reference artifact for these phases.
