# Task 030 — Listings multi-view (Tablo · Kanban · Galeri · Harita)

Ref: ADR 0007 · mockup `docs/mockups/enterprise-listings.html`

## Goal
A single listings surface with 4 views, switchable via the URL (`?view=`).

## Delivered
- `components/ListingsViewSwitch.tsx` (+ stories) — segmented control; `LISTING_VIEWS`,
  `parseListingView`; aria-label + aria-pressed; play test.
- `components/ListingKanban.tsx` (+ stories) — moderation board, one column per status,
  cards from the current page; AI-first links; empty state.
- `components/ListingGallery.tsx` (+ stories) — cover-first card grid (same language the
  table collapses to on mobile).
- `components/ListingsMap.tsx` (+ stories) — reuses the shared token-styled `MapView`
  (Leaflet + markercluster); coordinates from `listingLatLng` (il/ilçe centroid + jitter);
  marker click → detail. **Lazy-loaded** by the page so Leaflet stays out of the main chunk.
- `components/data/MapView.tsx` — `fitBounds({ animate: false })` so the initial fit doesn't
  animate (also fixes a post-unmount `_leaflet_pos` teardown error in tests).
- `pages/ListingsListPage.tsx` — reads `state.view`; table view keeps the full DataTable;
  kanban/gallery/map render with the shared FilterBar + pagination.

## DoD — met
Stories + play tests (per view); token-only; strict TS; a11y; lazy heavy import (perf);
`lint`/`typecheck`/`build` green; story tests green.
