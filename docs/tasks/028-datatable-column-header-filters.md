# Task 028 — DataTable column header filters (funnel popover)

Ref: ADR 0007 · DATA_TABLE_SPEC.md (point 2 & 4) · mockup `docs/mockups/enterprise-listings.html`

## Goal
Add a per-column filter affordance to the shared `DataTable`: a **funnel icon on the LEFT
of each filterable column header** that opens a popover with the right control (faceted
multi-select / number range / date range / text search), writing to the SAME URL-synced
filter state as the toolbar `FilterBar` (single source of truth). Wire the listings columns
and add AI-suggestion filtering to the MSW handler so it works end-to-end.

## Scope
- `components/data-table/types.ts` — augment TanStack `ColumnMeta` with `filter?: FilterConfig`.
- `components/data-table/filter-utils.ts` (new) — `asArray`, `filterActiveCount`.
- `components/data-table/ColumnHeaderFilter.tsx` (new) — funnel trigger + popover bodies
  (faceted/numberRange/dateRange/search), token-only, a11y (aria-label, 44px hit area,
  active indicator that is not color-only).
- `components/data-table/ColumnHeaderFilter.stories.tsx` (new) — default/faceted/range/
  active + play test.
- `components/data-table/DataTable.tsx` — render the funnel (left of the sort/label) when
  `column.columnDef.meta?.filter` is set; pass `state`.
- `components/data-table/story-fixtures.tsx` — declare `meta.filter` on demo columns.
- `components/data-table/DataTable.stories.tsx` — add a "filter from column header" play test.
- `features/listings/data/filters.ts` (new) — single `listingFilters` (status/category/il/
  ai/price) reused by the page toolbar AND column meta.
- `features/listings/components/listingColumns.tsx` — attach `meta.filter` to
  category/status/aiSuggestion/il/price.
- `features/listings/pages/ListingsListPage.tsx` — use shared `listingFilters`.
- `features/listings/api/handlers.ts` — support the `ai` (aiSuggestion) filter param.

## DoD
- Funnel icon is on the LEFT of the header label (user requirement).
- Opening a column funnel and selecting a value updates the URL + chips, exactly like the
  toolbar filter; clearing works; active state is not color-only.
- Stories (default/faceted/range/active/mobile-N-A) + play tests; a11y clean.
- Token-only; strict TS; `lint` + `typecheck` + `test` + `build` green; dod-reviewer PASS.
- STOP for the user's manual commit.
