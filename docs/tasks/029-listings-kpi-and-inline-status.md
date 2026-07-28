# Task 029 — Listings KPI strip + inline row status quick-edit

Ref: ADR 0007 · mockup `docs/mockups/enterprise-listings.html`

## Goal
Lift the İlanlar surface above MVP with (1) a KPI context strip and (2) inline row
status quick-editing.

## Delivered
- `api/handlers.ts` — `GET /listings/stats` (total · pending · aiNok · active), registered
  before `/:id` so `/stats` isn't captured by the param route.
- `api/queries.ts` — `useListingStats()` + `ListingStats` type.
- `api/mutations.ts` — `useSetListingStatus()` (optimistic-ish PATCH + toast + invalidate).
- `components/ListingsKpiStrip.tsx` (+ stories) — 4 token-only tiles, skeleton loading,
  icon+label so tone is never color-only.
- `components/ListingStatusSelect.tsx` (+ stories) — compact inline status Select; stops row
  click propagation; play test asserts the change.
- `components/listingColumns.tsx` — `ListingsTableMeta` contract; actions cell renders the
  status select (only when `onStatusChange` is provided) + Detay.
- `pages/ListingsListPage.tsx` — renders `ListingsKpiStrip`; passes `meta` with a
  permission-gated `onStatusChange` wired to the mutation.

## DoD — met
Stories + play tests; token-only; strict TS; a11y (labels, not color-only); `lint`/`typecheck`/
`build` green; listings story tests green. Permission-gated (listing.edit) status edit.
