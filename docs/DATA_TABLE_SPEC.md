# Data Table Specification

Built on TanStack Table v8 (NOT v9 beta) + TanStack Virtual v3, server-driven against the resource contract.

## One table, everywhere
Every list surface in the app renders the SAME `DataTable`. The 10 points below are NOT per-feature opt-ins — the component owns them, so no vertical can ship a table that is structurally poorer than another:
- **Column controls** (drag-reorder, pin, resize, visibility + the keyboard pin/move menu) are always on; there is no `columnControls` flag.
- **Column header filters** appear automatically on any column whose `columnDef.meta.filter` is set. Every column backed by a server-supported filter param MUST set it, reusing the SAME `FilterConfig` object the toolbar `FilterBar` uses (per-feature `data/filters.ts`), so both surfaces write the same URL params and share one chip.
- **The expand toggle** for `renderSubRow` is injected by the DataTable — feature column files never hand-roll one.
- **The selection bar** shows on ANY selection (count, select-all-matching, clear); `bulkActions` only contributes domain buttons to its right.

## The 10-point non-negotiable contract
1. **Server-driven** pagination/sort/filter (`manualPagination/Sorting/Filtering`). API: `GET /{resource}?page&pageSize&sort&filters` -> `{ items, total, page, pageSize }`.
2. **Advanced filters**: faceted with counts, multi-select, price/m² ranges, date ranges, cascading il->ilçe->mahalle, filter chips, saved filters, and a natural-language filter box (confirm-before-apply).
3. **Sorting**: multi-column, indicator, URL-synced.
4. **Column controls**: visibility picker, pinning (left/right), resizing, reordering.
5. **Row selection + bulk action bar** (select page/all-matching; contextual bulk actions).
6. **Expandable rows** (detail subrow).
7. **Saved views** (named filter+column+sort presets).
8. **Export** CSV/Excel (current view / selection / all-matching).
9. **Virtualization** + **sticky header** for large sets.
10. **Density toggle** + full **URL-synced state**.

## URL contract
`?page=1&pageSize=25&sort=createdAt:desc&status=pending&priceMin=...&priceMax=...&il=34&ilce=...&q=...&view=...`. URL is the source of truth; deep-linkable/shareable; back/forward works.

## FilterBar spec
Faceted counts from the API; chips summarize active filters with individual clear + "clear all"; saved filters persist (localStorage now, API later); NL box parses text -> proposed filter set shown for confirmation before applying.

## Mobile card transform
Below `lg`, rows render as stacked cards: primary field as title, key attributes as label/value pairs, actions in an overflow menu; selection via long-press/checkbox; sticky filter/sort bar; bottom sheet for column/density.

## Accessibility
`role="grid"` semantics, header scope, sortable headers as buttons with `aria-sort`, focus ring, keyboard navigation, 44px targets, screen-reader announcements for row-selection/bulk actions.

## Performance
Virtualized rows; memoized columns; server pagination; `keepPreviousData` for smooth paging; debounce filter input.

## API assumptions
Total count returned for pagination; sort/filter encoded as above; 4xx surfaces an ErrorState; empty -> EmptyState with a clear next action.
