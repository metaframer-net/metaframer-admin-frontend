# Marathon Progress Log

In MARATHON mode, Claude appends ONE checkpoint entry per completed task below.
Never delete past entries; this file is the recovery point if the session is
interrupted (resume with: "read docs/tasks/PROGRESS.md and CURRENT.md, continue
MARATHON mode from where it left off").

Entry format:

## [date/time] Task NNN — <name>
- Built: <summary of what was implemented>
- Verification: lint PASS/FAIL · typecheck PASS/FAIL · test PASS/FAIL · build PASS/FAIL
- Decisions/assumptions: <anything decided autonomously>
- Suggested commit message: <english conventional commit>

---

## 2026-07-24 Task 000 — Foundation
- Built: Vite 8 + React 19 + TS (strict, noUncheckedIndexedAccess, exactOptionalPropertyTypes,
  erasableSyntaxOnly, verbatimModuleSyntax) SPA scaffold with `@/*` alias. Tailwind v4 CSS-first
  `src/styles/theme.css` — DESIGN_SYSTEM.md OKLCH tokens copied EXACTLY (:root + .dark) + `@theme inline`
  mapping (colors, radii, type scale, shadows, motion, fonts) + base layer (tabular-nums, reduced-motion).
  Self-hosted variable fonts (Geist/Geist Mono/Inter via @fontsource-variable). shadcn new-york-style
  Button (with `loading`) + Card hand-authored (token-only, cva, data-slot). React Router v7 DATA mode
  (`createBrowserRouter`) with root layout + demo index route carrying `handle.routeMeta`. Providers:
  QueryClient + SessionProvider(RBAC) + LayoutProvider(theme+density+mode, localStorage `arsam.layout`)
  + sonner Toaster. RBAC model (matrix/can/Can/usePermission) + api client (resource contract) + MSW
  (browser worker + node server + demo `/ping` handler). Storybook 10 (react-vite) with addon-a11y +
  addon-vitest + addon-docs, mobile viewports (360/414), theme+layout toolbars. Vitest 4 two-project
  config: `unit` (jsdom + Node MSW) and `storybook` (real Chromium via @vitest/browser-playwright).
  Button/Card full-DoD stories (Default/Loading/Empty/Error/Mobile + play) + MSW contract unit test.
- Verification: lint PASS (0 errors; 6 react-refresh warnings — standard for shadcn/context files) ·
  typecheck PASS · test PASS (15/15 across unit + browser-based Storybook play/a11y) · build PASS ·
  build-storybook PASS · dev server serves `#root`.
- Decisions/assumptions:
  - TypeScript pinned to ~5.9 (TS 7 is out but typescript-eslint requires <6.1). Recorded as a known
    upgrade item once the ESLint toolchain supports TS 7.
  - shadcn components hand-authored in new-york style instead of `npx shadcn init` (CLI is interactive
    and brittle against Tailwind v4 + hand-configured project). `components.json` present so the CLI can
    still be used later. Functionally equivalent, token-only output.
  - Vitest 4 moved browser providers to separate packages → added `@vitest/browser-playwright`; provider
    is `playwright()` (object), not the old `'playwright'` string.
  - ui/ primitives live flat in `src/components/ui/*.tsx` with co-located `*.stories.tsx` (shadcn idiom);
    custom component groups (shell/feedback/form/data-table/features) will use PascalCase folders per the
    create-component skill.
  - Local Node is v25.8.1; CI targets Node 22. Toolchain works on both; no code depends on v25.
  - Fonts self-hosted (offline; curl/wget denied). `system` theme resolves live via matchMedia.
- Suggested commit message:
  `chore(foundation): scaffold Vite+React19+TS, Calm Signal tokens, RR data-mode, Storybook 10, MSW`

## 2026-07-24 Task 001 — AppShell + Layout Modes
- Built: Single `config/nav-schema.ts` (10 modules + children + permission + aiEntity + `primary` for
  bottom nav) driving BOTH shells. `LayoutProvider` (from Task 000) drives mode/density/theme with
  localStorage persistence and reload-less switching; density scales the root em via `[data-density]`.
  Shell: `AppShell` (mode-switch orchestrator + CommandPaletteProvider + MobileBottomNav + CommandPalette),
  `SidebarShell` (collapsible aside, lg+), `TopnavShell` (horizontal nav), `TopnavMenu` (measured
  priority-plus overflow into a "More" menu via ResizeObserver), `Topbar` + `TopbarActions` (breadcrumbs,
  ⌘K search trigger, Density/Layout/Theme toggles, UserMenu), `CommandPalette` (⌘K, every permitted
  module + quick actions), `MobileDrawer` + `MobileBottomNav` (drawer + ≤5 bottom items, both modes
  converge below lg), `NavTree` (shared vertical nav, collapsed tooltips), `Breadcrumbs` (from
  `handle.routeMeta`), `Brand`, `ThemeToggle`, `DensityToggle`, `LayoutSwitcher`, `UserMenu` (with dev
  role switcher to preview RBAC gating). Permission-aware nav via `usePermittedNav`/`filterNavByRole`.
  Router now roots at `AppShell` with placeholder pages for all 10 modules (nested routes + routeMeta).
  Added primitives needed by the shell (count toward Task 002): tooltip, separator, avatar, scroll-area,
  dialog, sheet, dropdown-menu, command, breadcrumb. Full-DoD stories for every shell component
  (Sidebar/Topnav/Mobile + play + a11y) via a `shellRouterDecorator` (data-mode memory router) and
  `globals.layout` to force each mode.
- Verification: lint PASS (0 errors; react-refresh warnings only) · typecheck PASS · test PASS
  (102/102 across unit + browser Storybook play/a11y) · build PASS.
- Decisions/assumptions:
  - Custom collapsible sidebar instead of the heavy shadcn `sidebar` block — lighter, token-only,
    same behavior (collapsible + sections). Documented as equivalent.
  - topnav overflow is a real measured priority-plus (hidden measurement row + ResizeObserver), with a
    reserved width for the "More" trigger; command palette guarantees full module parity regardless.
  - Density is implemented as a root-em scale (comfortable 100% / compact 93.75%) applied on <html> —
    a real, global density change; component-level density can refine later (tables in Task 004).
  - Shell-needed primitives were authored here to unblock 001; their existence is noted so Task 002
    focuses on the remaining primitives + any missing story polish.
  - `UserMenu` includes a role switcher (dev-only affordance) so RBAC nav filtering is demoable now.
- Suggested commit message:
  `feat(shell): configurable AppShell with sidebar/topnav modes, command palette, mobile nav`

## 2026-07-24 Task 002 — Primitives & Feedback
- Built: Full P0 primitive set (new-york style, token-only, cva variants, data-slot). Created this task:
  Label, Input, Textarea, Badge, Skeleton, Spinner, Switch, Checkbox, RadioGroup, Slider, Select,
  Popover, Combobox (Popover+cmdk), Tabs, Accordion, Pagination. Created earlier for the shell (Task
  001) and inventoried here: Tooltip, Separator, Avatar, ScrollArea, Dialog, Sheet, DropdownMenu,
  Command, Breadcrumb (+ Button, Card from Task 000). Feedback set: EmptyState, ErrorState,
  LoadingState, InlineAlert (info/success/warning/destructive, icon+text so color is never the sole
  signal), ConfirmDialog (async confirm w/ spinner, destructive variant). Every primitive + feedback
  component ships full-DoD stories (Default/Loading/Empty/Error/Mobile + play + a11y). Added derived
  `--success-foreground` / `--warning-foreground` tokens (inverted per light/dark) so tinted
  success/warning surfaces meet WCAG contrast; added accordion open/close keyframes.
- Verification: lint PASS (0 errors; react-refresh warnings only) · typecheck PASS · test PASS
  (254/254 across unit + browser Storybook play/a11y) · build PASS.
- Decisions/assumptions:
  - Tooltip uses Radix content, NEVER the `title` attribute (hard rule).
  - Combobox is a composed primitive (Popover + Command) since shadcn ships it as a recipe, not a file.
  - Added `success-foreground`/`warning-foreground` semantic tokens (not in the original spec) purely to
    guarantee AA contrast on tinted status surfaces; values derive from the existing success/warning hues.
  - A first browser-test run showed transient "Failed to fetch dynamically imported module" errors from
    Vite dep pre-bundling when many new stories landed at once; a re-run (deps warm) is green. This is a
    known first-run optimizer race, not a story defect.
- Suggested commit message:
  `feat(ui): P0 primitives + feedback components with full Storybook coverage`

## 2026-07-24 Task 003 — Form System
- Built: `FieldHelp` (icon-only; help in a focus-managed Popover, warning in a Tooltip; 44px hit area via
  pseudo-element; NEVER the `title` attribute). `FormField` (RHF `useController`, clones element OR calls
  a render-fn child so custom controls like Select/Combobox bind; wires aria-invalid + aria-describedby to
  persistent help/warning/error nodes; DEV-throws when no help/helper/warning — proven by a jsdom unit
  test). `Form` (FormProvider alias), `FormSection`, `FormErrorSummary` (flattens nested RHF errors, anchor
  links focus+scroll to the field via stable name-derived ids). `Wizard` (per-step `form.trigger`
  validation gate, localStorage autosave, beforeunload dirty-warning, clickable stepper, review step).
  Specialized inputs: `Calendar` (react-day-picker, tr locale) + `DatePicker`, `RangeInput` (min/max with
  tr thousands separators + tabular-nums + unit suffix), `CascadingSelect` (il→ilçe→mahalle; child disabled
  until parent chosen, descendants reset on ancestor change). Full-DoD stories for every form component +
  a FormField enforcement unit test.
- Verification: lint PASS (0 errors; react-refresh warnings only) · typecheck PASS · test PASS
  (308/308 across unit + browser Storybook play/a11y) · build PASS.
- Decisions/assumptions:
  - FieldHelp help uses a click Popover (focus-managed, handles long content) plus a persistent sr-only
    node for aria-describedby; warning uses a Tooltip. Chose this over hover-tooltip-for-help to avoid
    stacking two overlays on one trigger while still meeting the focus-management DoD.
  - Story schemas validate numeric fields as strings (regex/refine) instead of `z.coerce.number()`:
    zod v4 `coerce` yields a transformed output type that clashes with RHF's resolver generics under
    `exactOptionalPropertyTypes`. Task 005 keeps numeric form fields as strings and parses at the submit
    boundary to stay compatible with the Wizard's `UseFormReturn<T>` prop.
  - Combobox now forwards `aria-label` so CascadingSelect levels have deterministic accessible names.
  - One full-suite run hit a ~one-time cold dep pre-bundle (react-day-picker/date-fns/zod-resolver newly
    imported by the browser project) that ran long; once warm the full suite is ~8s and green (308/308).
- Suggested commit message:
  `feat(form): FieldHelp-enforced FormField, wizard, error summary, cascading/range/date inputs`

## 2026-07-24 Task 004 — Data Table
- Built: `useTableUrlState` (URL = single source of truth for page/pageSize/sort/filters/view/q via
  `useSearchParams`; deep-linkable, back/forward). `DataTable` (TanStack Table v8, manual pagination/
  sorting/filtering; row selection + select-all-matching; expandable sub-rows; column visibility;
  column resizing; sticky header; TanStack Virtual row virtualization above 30 rows via the spacer-row
  technique keeping `<table>`/`role="grid"` semantics; loading/empty/error states; mobile card transform
  below `lg`). `FilterBar` (faceted filters with API counts + multi-select, number ranges via RangeInput,
  date ranges via DatePicker, filter chips with individual + clear-all, saved views in localStorage,
  natural-language box that proposes filters as chips for confirm-before-apply). `ColumnVisibility`,
  `BulkActionBar`, `ExportMenu` (CSV/Excel × view/selection/all), `DataTablePagination`. `lib/export.ts`
  (dependency-free CSV with BOM + Excel-compatible .xls). `useSavedViews`. Full-DoD stories with play
  tests for sort/filter/select/bulk/export across the suite.
- Verification: lint PASS (0 errors; react-refresh warnings only) · typecheck PASS · test PASS
  (347/347 across unit + browser Storybook play/a11y) · build PASS.
- Decisions/assumptions:
  - Contract point 4 (column controls): visibility + resizing are implemented; **column pinning and
    drag-reordering are deferred** — TanStack supports both (state hooks are in place) but the DnD/pinning
    UI is not built yet. Known gap to close in a follow-up; does not block the listings vertical slice.
  - Cascading il→ilçe→mahalle in filters is provided by the standalone `CascadingSelect` (Task 003) and is
    wired at the feature level (Task 005) rather than as a built-in FilterBar `kind`; FilterBar's
    declarative kinds are faceted/numberRange/dateRange/search + NL.
  - Excel export emits an HTML-table `.xls` (widely Excel-openable) to avoid a heavy SheetJS dependency;
    CSV is BOM-prefixed for correct Turkish characters.
  - Numeric columns sort descending on first click (TanStack `sortDescFirst` default) — reflected in tests.
  - Virtualization kicks in above 30 rows; smaller pages render normally.
- Suggested commit message:
  `feat(data-table): URL-synced DataTable with filters, bulk actions, export, virtualization`

## 2026-07-24 Task 005 — Listings Vertical Slice
- Built: `features/listings` end-to-end vs MSW. Zod-first schemas (`listingSchema` entity, `moderationSchema`,
  `listingFormSchema` with category-driven superRefine; numeric form fields kept as strings + `formToPayload`
  parse at submit). Taxonomy data (5 categories, 6 statuses, heating/deed/zoning enums, per-category
  attribute sets, cascading il→ilçe→mahalle). MSW handlers (list w/ filter/sort/paginate, detail, create,
  update, moderate) registered in the central registry; moderation writes an immutable audit entry
  (`lib/audit.ts`, actor supports `ai:<agent>`). Query/mutation hooks (`useListings` keepPreviousData,
  `useListing`, `useModerateListing` optimistic + rollback + sonner toasts, `useCreateListing`). Pages:
  List (DataTable + FilterBar with faceted status/category/il + price range + NL parser, export, bulk,
  expandable rows), Detail (attributes + AI badge + three-tier ModerationDecision + audit timeline),
  Create (4-step Wizard: basics → dynamic category attributes → cascading location → review, per-step
  validation + draft autosave), Moderation Queue (pending cards, inline OK/Uncertain/NOK). Feature
  components: ListingStatusBadge, AiSuggestionBadge (reasons on hover), ModerationDecision (Uncertain/NOK
  require a reason via focus-managed popover). Routes wired in data mode with `routeMeta` (list/create/
  moderation/detail); `navSchema` already exposes listings + moderation across sidebar/topnav/mobile.
  Permissions gated via `<Can>` + route permission meta. Full-DoD stories (components + all four pages via
  a seeded-QueryClient + memory-router harness) + a handlers/audit unit test proving moderation writes audit.
- Verification: lint PASS (0 errors; react-refresh warnings only) · typecheck PASS · test PASS
  (391/391 across unit + browser Storybook play/a11y) · build PASS · dev server serves `/` and `/listings`.
- Decisions/assumptions:
  - Numeric listing form fields are strings validated by regex/superRefine and converted to numbers in
    `formToPayload` at submit — keeps `useForm<ListingFormValues>` compatible with `Wizard`'s
    `UseFormReturn<T>` prop (avoids the zod-coerce transform-generics clash noted in Task 003).
  - The cascading location composite is rendered with an explicit `FieldHelp` affordance (not a single-name
    `FormField`) because it spans three fields; help requirement is still satisfied.
  - Page Storybook stories seed a `staleTime: Infinity` QueryClient with `setQueryData` + a memory router
    instead of running MSW inside Storybook — deterministic, no service-worker dependency in browser tests.
  - Moderation maps OK→active, Uncertain→pending(hold), NOK→rejected; audit action is
    `listing.approve|hold|reject` with before/after status + reason. AI proposes; human confirms (guardrail).
- Suggested commit message:
  `feat(listings): end-to-end vertical slice — list/detail/create-wizard/moderation vs MSW + audit`

## 2026-07-24 Final — whole-project DoD review + fixes
- Ran the `dod-reviewer` agent over the entire `src/` tree. Verdict was CONCERNS with 3 blocking gaps;
  all 3 fixed (+ 2 cheap a11y/UX improvements), then re-verified.
- Blocking fixes:
  1. FieldHelp bypass in the create-wizard Location step — extended `CascadingSelect` to accept
     `label`/`help`/`errors`, render a `FieldHelp` affordance, and thread `aria-describedby` (to the shared
     help + per-level error) and `aria-invalid` into every level's Combobox. `LocationStep` now uses it.
  2. Route-level RBAC was nav-only — added `RouteGuard` (reads matched `handle.routeMeta.permission` via
     `useMatches`, renders a 403 `ForbiddenPage` when the role lacks it), wired into `AppShell`, covered by
     a unit test (analyst → 403, super-admin → content).
  3. Export ignored scope/format — `ListingsListPage.onExport` now honors selection/all-matching (fetches
     all-matching for `all`), calls `exportXls` for the Excel format, and shows a sonner toast.
- Non-blocking improvements: `aria-live="polite"` on `BulkActionBar`; visible column-resize handle in
  `DataTable` headers (resizing flag was on but had no UI).
- Deferred (tracked, non-blocking): DataTable column pinning + drag-reordering; `window.prompt` for
  naming a saved view → replace with a themed Dialog; route-level code-splitting to shrink the 1.2MB
  main bundle; programmatic WCAG contrast checks + live a11y-addon report capture.
- Final verification: lint PASS (0 errors; 13 warnings) · typecheck PASS · test PASS (393/393, 72 files) ·
  build PASS · build-storybook PASS · dev server serves `/` and `/listings`.
- Suggested commit message:
  `fix(dod): route RBAC guard, wizard location FieldHelp/aria, export scope+xls, table a11y`

## 2026-07-24 Aşama 1 — Quick fixes + real Dashboard
- **Topnav overlap bug (görseldeki bozukluk) fixed:** `TopnavMenu` priority-plus measurement was inaccurate
  (ghost row didn't mirror the real buttons — missing the group chevron + inter-item gap) and the container
  had no overflow clip, so nav items visually overlapped the right-side actions cluster. Fix: ghost row now
  mirrors real button markup (icon + label + chevron for groups), the fit calc adds the `gap-1` (4px) and only
  reserves the "More" width while items still overflow, container is `overflow-hidden`, and the `TopbarActions`
  cluster is `shrink-0` so it can never be compressed/overlapped.
- **Real Dashboard replaces the demo ping page:** new `KpiCard` (tabular value + trend delta) and `ChartCard`
  (recharts `ResponsiveContainer`, chart-1..5 tokens) primitives; `GET /api/dashboard/stats` MSW endpoint
  computing live counts from the listings mock DB (via `getListingsSnapshot`); `useDashboardStats` hook;
  `features/dashboard/DashboardPage` = 4 KPI tiles + category bar chart + recent-decisions (audit) panel +
  pending-queue preview + quick links. Index route now renders DashboardPage (old `DemoPage`/`/ping` kept for
  the contract unit test). Full-DoD stories for KpiCard/ChartCard/DashboardPage.
- **FilterBar `window.prompt` → themed Dialog:** saving a view now opens a focus-managed `Dialog` with a
  labelled `Input` (Enter-to-save), replacing the native prompt (themeable, mobile-friendly, a11y-clean).
- Verification: lint PASS (0 errors; warnings only) · typecheck PASS · test PASS (409/409, 75 files) ·
  build PASS · dev serves `/` clean.
- Notes: bundle grew to ~1.59MB (recharts) — reinforces the deferred route-level `lazy()` code-split
  (Aşama 5). Recharts' first entry into the browser-test graph triggers the known one-time Vite dep
  pre-bundle reload; a warm re-run is green.
- Suggested commit message:
  `feat(dashboard): real dashboard (KPI + chart + stats); fix topnav overflow; FilterBar save-view dialog`

## 2026-07-24 Task 006 — Aşama 2: Harita & Dataviz Katmanı
- Built: `MapView` (`components/data`) — React Leaflet 5 + `leaflet.markercluster`. Token-styled pins
  (`L.divIcon`, `--color-primary`/`--color-chart-1`, no default-icon asset bug) + cluster badges via a
  custom `iconCreateFunction`; imperative `ClusterLayer` child (`useMap`) syncs markers into a
  `markerClusterGroup`, binds popups, fires `onMarkerClick`, and fit-bounds when no `center` is given.
  A11y: the map region is a labelled `role="region"` (aria-label lives on the wrapper `<div>` because
  react-leaflet swallows unknown props on `MapContainer`), plus an always-rendered `sr-only` marker list
  of focusable buttons (accessible alternative + keyboard) so the map is never the sole signal; Leaflet
  zoom controls bumped to 44px targets in `theme.css`. `DonutChartCard` — recharts `PieChart` donut with
  center total overlay + token-colored legend (label + value, color never the sole signal), chart-1..5
  tokens, empty-state branch. `features/listings/data/geo.ts` — approx il/ilçe centroids + deterministic
  `listingLatLng` (FNV-1a id hash → ±0.02° jitter) as PURE functions (unit-tested in jsdom). Integrations:
  `ListingDetailPage` gets a "Konum" single-marker map card (labelled "yaklaşık konum"); `DashboardPage`
  gets a `byStatus` donut (category bar chart narrowed from col-span-2 to a 3-up row). `theme.css` gained an
  unlayered Leaflet theming block (container/controls/popups → tokens). Full-DoD stories for MapView (+
  SingleMarker) and DonutChartCard (Default/Loading/Empty/Error/Mobile + play); DashboardPage story now
  seeds real `byStatus` and asserts the donut; geo unit test (determinism + jitter envelope + fallbacks).
- Verification: lint PASS (0 errors; 13 pre-existing warnings) · typecheck PASS · test PASS (425/425, 78
  files) · build PASS · build-storybook PASS.
- DoD self-check: ran the `dod-reviewer` agent → 3 blocking gaps, all FIXED before checkpoint:
  (1) `MapContainer aria-label` was swallowed by react-leaflet → moved `role="region"`+`aria-label` to the
  wrapper div; (2) Leaflet zoom buttons were 26px → 44px in `theme.css`; (3) `DashboardPage.Default` story
  demoed the donut with empty data → seeded `byStatus` + added a play assertion. Non-blocking items noted.
- Decisions/assumptions:
  - Coordinates are MOCK/approximate (il+ilçe centroids only, no backend geo) — `listingLatLng` jitters by
    a deterministic id hash so co-located listings don't stack on one pixel. Real coords arrive with FastAPI.
  - Leaflet markers/clusters are styled via inline `L.divIcon` HTML referencing CSS var tokens (the only
    way to token-style outside Tailwind's class layer); no hardcoded hex/rgb — shadows use `--shadow-md`.
  - No `mounted` client-guard: this is an SSR-free SPA and the Storybook browser project runs real Chromium,
    so `MapContainer` renders directly (removing it also cleared a lint "setState in effect" error).
  - OSM tiles are fetched live (unmocked) in stories/tests — acceptable now; flagged to mock + make the tile
    provider configurable when hardening (Aşama 5).
  - Stretch "listings map-view toggle" DEFERRED (not built) — detail-page + dashboard integration covers the
    acceptance criteria; revisit under Reports/Analytics (012) or polish (017).
  - Bundle grew to ~1.8MB (leaflet + markercluster) — reinforces deferred route-level `lazy()` (Aşama 5),
    with `MapView` a prime lazy-load candidate since it's only on the detail page.
- Suggested commit message:
  `feat(map): token-styled MapView (leaflet+markercluster) + DonutChartCard; wire detail map + dashboard donut`

## 2026-07-24 Task 007 — Kullanıcılar & Ofisler
- Built: `features/users` end-to-end vs MSW, following the listings vertical as a template. Zod-first schemas
  (`userSchema` entity with type/status/verification/trustScore/office, `officeSchema`, `userActionSchema`
  with reason-required refine, `reasonFormSchema` for the dialog) + PURE `computeTrustScore(user)` (baseline +
  weighted verification channels + activity, clamped by lifecycle status; banned→0). Taxonomy/labels
  (`data/users.ts`: types, statuses, verification levels/channels, action labels). MSW handlers (list with
  filter/sort/paginate over status/type/verification/il/trust-range, detail, single `POST /users/:id/action`
  covering verify/suspend/ban/unban) — action input is now runtime-validated via `userActionSchema.safeParse`
  (422 on failure) and every write emits an immutable `lib/audit` entry (`user.verify|suspend|ban|unban`,
  before/after status+verification+reason). Query/mutation hooks (`useUsers` keepPreviousData, `useUser`,
  `useUserAction` optimistic status flip + rollback + sonner toasts). Components: `UserStatusBadge`,
  `TrustScoreMeter` (0–100 `role="meter"` with aria-value*, numeric value + tier label so color is never the
  sole signal; compact variant for table cells), `VerificationBadges` (identity/office/phone; icon + label +
  `aria-label` carrying the level to assistive tech + tooltip), `UserActionDialog` (RHF + `FormField`/FieldHelp
  reason capture; suspend/ban require ≥5-char reason, unban optional), `userColumns`. Pages: List (DataTable +
  FilterBar with status/type/verification facets + trust numberRange + il + NL parser, bulk suspend/ban via the
  dialog, export CSV/XLS with scope), Detail (profile + TrustScoreMeter + VerificationBadges + office/agents
  card + three-tier Doğrula/Askıya-al/Yasakla + Yasağı-kaldır + audit timeline). Router: `/users` index →
  UsersListPage, `/users/:id` → UserDetailPage (routeMeta + permission). Permissions: added
  `user.suspend|ban|unban` to the `support` role (matrix + `docs/PERMISSIONS.md`), gated via `<Can>` + route
  meta. Full-DoD stories for every component + both pages (seeded-QueryClient + memory-router harness reused
  from listings `page-story-utils`) + a `computeTrustScore` + handlers-write-audit unit test.
- Verification: lint PASS (0 errors; 13 pre-existing warnings) · typecheck PASS · test PASS (470/470, 85
  files) · build PASS. Runtime-verified by driving the running dev app with Playwright: list renders 25 trust
  meters; deep-linked `?status=banned` and `?trustMin=70` filter correctly; detail page moderation group +
  meter present; suspend dialog blocks empty submit (guardrail), then on confirm flips status→Askıda,
  recomputes trust→35, writes `user.suspend` audit, shows unban button + success toast.
- DoD self-check: ran the `dod-reviewer` agent → 1 blocking a11y gap, FIXED before checkpoint:
  `VerificationBadges` conveyed the verification LEVEL only via aria-hidden icon + color + a keyboard-inaccessible
  tooltip → added `aria-label="{channel}: {level}"` on each Badge so the level reaches screen readers (color/icon
  never the sole signal); story now asserts the accessible name. Non-blocking items also applied:
  `docs/PERMISSIONS.md` synced with the new support permissions; `userActionSchema` is now actually used
  (server-side validation) instead of type-only. Deferred (inherited from listings template, non-blocking):
  page `Error` stories mirror `Empty` rather than a real `isError`/500 state — tracked for a later story-polish
  pass alongside the same gap in listings; `AiSuggestionBadge` shares the same tooltip-keyboard pattern (out of
  scope here, flag to fix with VerificationBadges' fix pattern).
- Decisions/assumptions:
  - Trust score is a PURE function of {status, verification, listingsCount} (no Date/tenure) so it stays
    deterministic + unit-testable; the seed and every mutation recompute it. Suspended caps at 35, pending at 60,
    banned at 0.
  - Verify/suspend/ban/unban all go through ONE `POST /users/:id/action` endpoint (not four routes) — simpler
    handler, single audit-write path; bulk actions POST the same endpoint per id so they audit too.
  - The three-tier moderation UX is realized as Doğrula (immediate) / Askıya-al / Yasakla on the detail page
    (reason captured by `UserActionDialog`), rather than importing the listing-coupled `ModerationDecision`
    (which bakes in `listing.*` permissions + labels); the pattern is reused, the component is purpose-built.
  - Offices are embedded on `type='office'` users (title/taxId/il/ilçe/memberAgents) and agents reference an
    `officeName` — no separate office CRUD (verification/ban/trust is the focus per the task). `/users/agents`
    stays a placeholder.
  - `il` added to the user entity so the shared `ilOptions`/LOCATIONS (from listings taxonomy) power the city
    facet; users reuse the listings location taxonomy rather than duplicating it.
- Suggested commit message:
  `feat(users): end-to-end users & offices vertical — list/detail, trust score, verify/suspend/ban vs MSW + audit`
- Follow-up (same task, post-review): the `/users/agents` "Emlak Ofisleri" sub-nav was a PlaceholderPage (office
  CRUD was out of the original scope). Turned it into a real `OfficesListPage` — the users list locked to
  `type='office'` via `withOfficeType(query)`, with office-oriented `officeColumns` (unvan/vergiNo/durum/trust/
  doğrulama/üye-danışman-sayısı/şehir), status+ofis-belgesi+il filters, export, and expandable sub-row (email/
  phone/konum/üye danışmanlar). Wired `/users/agents` → OfficesListPage (permission `agent.verify`), added
  full-DoD story (Sidebar/Topnav/Mobile/Loading/Empty/Error + play). Also fixed a seed artifact where every
  office landed in one city (type period === ilKeys period) by varying `il` per triplet. Runtime-verified:
  `/users/agents` renders 10 offices, no non-office rows leak. lint/typecheck/test/build still green.

## 2026-07-24 Task 008 — Kategoriler & Nitelikler
- Built: `features/categories` end-to-end vs MSW, following the listings/users verticals as a template. Zod-first
  schemas (`attributeFieldSchema` id/key/label/type/required/unit?/options?/order, `categorySchema` with an
  `attributes[]` set, `categoryFormSchema` + `attributeFormSchema` (select requires ≥1 option via refine),
  `reorderInputSchema`) + PURE helpers `sortByOrder`/`nextOrder`/`validateAttributeKeyUnique` (unit-tested).
  Taxonomy metadata (`data/categories.ts`: ATTRIBUTE_TYPES + labels, CATEGORY_STATUSES + labels, curated lucide
  CATEGORY_ICONS, per-key ATTRIBUTE_DEFS) and `buildSeedCategories()` that DERIVES the seed from the listings
  vertical's static `CATEGORY_ATTRIBUTES`/`CATEGORY_LABELS` + HEATING/DEED/ZONING enums — one origin, listings
  form untouched. MSW handlers (list w/ status filter + order-sort, detail, create, patch=update/archive,
  `POST /categories/reorder`, `POST /:id/attributes` upsert, `POST /:id/attributes/reorder`, `DELETE
  /:id/attributes/:attrId`) — inputs runtime-validated (`categoryFormSchema`/`attributeFormSchema`/`reorderInputSchema`
  → 422), every write emits an immutable `lib/audit` entry (`category.create|update|archive|reorder`,
  `attribute.create|update|delete|reorder`); duplicate category keys 422. `getCategoriesSnapshot()` read bridge
  (sorted) ready for the listing form to consume later WITHOUT breaking today's static taxonomy. Query/mutation
  hooks (`useCategories` keepPreviousData, `useCategory`, `useUpsertCategory`, `useReorderCategories` optimistic +
  rollback, `useUpsertAttribute`, `useReorderAttributes`, `useDeleteAttribute`). Components: `CategoryStatusBadge`,
  `AttributeTypeBadge` (icon+label+aria-label so type is never color-only), `CategoryFormDialog` (create/edit meta
  via RHF + FieldHelp), `AttributeFormDialog` (RHF + `useWatch` + `useFieldArray` options editor; FieldHelp on every
  named field; key-uniqueness guardrail via `validateAttributeKeyUnique`; select requires options), `AttributeEditor`
  (add/edit/delete + up/down reorder + ConfirmDialog delete), `categoryColumns` (row-level reorder driven by table
  `meta`). Pages: List (DataTable + FilterBar status facet + NL parser + row reorder + "Yeni kategori" + bulk-archive
  + export CSV/XLS), Detail/Edit (`/categories/:id` — meta card + edit dialog + AttributeEditor + audit timeline).
  Router: `/categories` index → List, `/categories/:id` → Detail (routeMeta + `category.manage`); replaced the
  PlaceholderPage. Added an additive `meta?: unknown` prop to the shared `DataTable` (forwarded to
  `table.options.meta`) so columns can trigger reorder. Full-DoD stories for every component + both pages (seeded
  QueryClient + memory-router harness reused from listings `page-story-utils`) + a handlers/helpers unit test proving
  the pure helpers, list/filter/sort, create+audit, duplicate-key 422, archive-audit, category reorder updates order,
  attribute upsert(create→update)+audit, delete+audit, attribute reorder, and `getCategoriesSnapshot` sorting.
- Verification: lint PASS (0 errors; 13 pre-existing warnings) · typecheck PASS · test PASS (530/530, 94 files) ·
  build PASS · build-storybook PASS.
- DoD self-check: ran the `dod-reviewer` agent → 3 blocking gaps, all FIXED before checkpoint:
  (1) native `title="Zorunlu"` on the required marker (help/info must NEVER use `title`) → removed (the icon already
  carries `aria-label="Zorunlu alan"`); (2) reorder icon buttons overrode `size="icon"` (44px) down to 24px via
  `size-6` → dropped the override so up/down keep the 44px WCAG target, laid side-by-side to avoid tall rows;
  (3) the row-selection column had no `bulkActions` wired (dead affordance vs DATA_TABLE_SPEC point 5) → wired a real
  bulk-archive (gated by `category.manage`, ConfirmDialog, PATCHes each selected active category to `archived`
  writing one `category.archive` audit entry per id). Non-blocking improvement applied: helper line above the
  select-options list (rows are `register`-bound without FieldHelp — documented pragmatic exception for a repeating
  2-cell row). Deferred (non-blocking, tracked): make `DataTableProps<TData, TMeta>` generic (currently a double-cast
  boundary for `meta`); page `Error` stories mirror `Empty` rather than a real `isError`/500 state (same cross-cutting
  convention as listings/users — worth one dedicated story-polish task).
- Decisions/assumptions:
  - Parallel-build strategy (option (b) from the task): the new module reads FROM the listings taxonomy and exposes
    `getCategoriesSnapshot()`; `src/features/listings/**` has ZERO diff, so the create-wizard's static
    `CATEGORY_ATTRIBUTES` still works. Actually binding the wizard to the snapshot is a separate optional step.
  - Attribute reorder got its own endpoint (`POST /:id/attributes/reorder`, audit `attribute.reorder`) — a small
    superset of the task's listed attribute audit actions (create|update|delete) — to make the editor's up/down real.
  - Category reorder only offered on the natural-order view (no active sort/filter/search and single full page); the
    list page computes `canReorder` and passes reorder callbacks to the columns via the new DataTable `meta` prop.
  - Numeric form fields: none here (category/attribute meta are all string/enum/boolean/array), so the listings
    string-then-parse dance wasn't needed; `required` binds a `Switch` via a FormField render-fn.
  - `category.manage` already existed in `docs/PERMISSIONS.md` and the nav/router; only super-admin (`*`) holds it,
    which is sufficient for gating — no matrix change needed.
- Suggested commit message:
  `feat(categories): manageable taxonomy — category/attribute CRUD, reorder, bulk-archive vs MSW + audit`

## 2026-07-24 Task 009 — Lokasyonlar (il / ilçe / mahalle)
- Built: `features/locations` end-to-end vs MSW, replicating the 008 categories vertical as a THREE-level
  hierarchy. Zod-first schemas (`neighborhoodSchema` id/name/order, `districtSchema` id/key/label/order/status/
  neighborhoods[], `provinceSchema` id/code[plaka]/label/order/status/districts[], + form schemas
  `provinceFormSchema` [2-digit plaka regex], `districtFormSchema` [slug key], `neighborhoodFormSchema` [name],
  `reorderInputSchema`) + PURE helpers `validateCodeUnique`/`validateKeyUnique` (unit-tested). Extracted the
  shared ordering helpers to a new `src/lib/order.ts` (`sortByOrder`/`nextOrder`); `categories/schemas/category.ts`
  now RE-EXPORTS them (single origin, no behavior change, no duplication) and `locations/schemas/location.ts` does
  the same. Seed DERIVED from the listings vertical's static `LOCATIONS` (`buildSeedProvinces()`), so `taxonomy.ts`
  has ZERO diff (no regression); `getLocationsSnapshot()` read bridge ready for the listing form/filters to consume
  later. MSW handlers (province list w/ status filter + code/label search + order-sort, detail, create, patch=
  update/archive, reorder; district upsert/reorder/delete; neighborhood upsert/reorder/delete) — inputs runtime-
  validated (`safeParse` → 422; duplicate plaka & duplicate district-key → 422), every write emits an immutable
  `lib/audit` entry (`location.create|update|archive|delete|reorder` with a `level` field in the payload
  distinguishing province/district/neighborhood; resource `province:<id>` so district/neighborhood changes show on
  the province timeline, top-level reorder `province:*`). Query/mutation hooks (`useProvinces` keepPreviousData,
  `useProvince`, `useUpsertProvince`, `useReorderProvinces` optimistic + rollback, `useUpsertDistrict`,
  `useReorderDistricts`, `useDeleteDistrict`, `useUpsertNeighborhood`, `useReorderNeighborhoods`,
  `useDeleteNeighborhood` — neighborhood hooks take `provinceId` and carry `districtId` in the mutate payload).
  Components: `LocationStatusBadge`, `provinceColumns` (row-level reorder via table `meta`), `ProvinceFormDialog`/
  `DistrictFormDialog`/`NeighborhoodFormDialog` (RHF + FieldHelp on every field), `LocationTree` (the hierarchical
  editor — generalizes 008 `AttributeEditor` to two nested levels: districts with add/edit/delete/reorder + an
  expandable per-district `NeighborhoodEditor` with the same affordances; all mutation hooks called once at the top
  and threaded down as props). Pages: List (`/locations` — DataTable + FilterBar status facet + NL parser + row
  reorder + "Yeni il" + bulk-archive + export CSV/XLS + expandable district-summary sub-row), Detail/Edit
  (`/locations/:id` — province meta card + edit dialog + `LocationTree` + audit timeline). Router: `/locations`
  index → List, `/locations/:id` → ProvinceDetail (routeMeta + `location.manage`); replaced the PlaceholderPage.
  Full-DoD stories for every component + both pages (seeded QueryClient + memory-router harness reused from listings
  `page-story-utils`) + a handlers/helpers unit test (pure helpers, list/filter/sort, create+audit, duplicate-plaka
  422, invalid-plaka 422, archive-audit, province reorder, district upsert[create→update]+audit, duplicate district-
  key 422, district delete+audit, district reorder, neighborhood upsert/reorder/delete, snapshot sorting).
- Verification: lint PASS (0 errors; 13 pre-existing warnings) · typecheck PASS · test PASS (590/590, 102 files) ·
  build PASS · build-storybook PASS.
- DoD self-check: ran the `dod-reviewer` agent → NO blocking issues, "Ready to commit: YES". Applied one non-blocking
  cleanup (dropped unused `LOCATION_LEVELS`/`LOCATION_LEVEL_LABELS` dead exports; audit payload uses the narrowed
  string literals directly). Deferred (non-blocking, tracked): page `Error` stories mirror `Empty` rather than a real
  `isError`/500 state — the SAME cross-cutting convention as listings/users/categories; folded into the 010 task
  notes to fix the pattern there. `location.manage` remains super-admin-only (`*`), identical to `category.manage`
  and sufficient for gating — no matrix change.
- Decisions/assumptions:
  - Parallel-build strategy (task risk note): the new module READS from listings' `LOCATIONS` and exposes
    `getLocationsSnapshot()`; `src/features/listings/**` + `taxonomy.ts` have ZERO diff, so the create-wizard's
    cascading location step + all il/ilçe/mahalle filters still work off the static taxonomy. Binding them to the
    snapshot is a separate optional step.
  - Shared `lib/order.ts` chosen over copy-paste (task recommendation); categories re-exports for backward compat.
  - Neighborhoods have NO status (only id/name/order per the task); province + district carry status. District
    delete cascades its neighborhoods (single `location.delete` audit entry for the district).
  - Province id `P-<plaka>` for seeded rows (`P-new-N` for created); audit `level` lives inside before/after so the
    single `location.*` action family disambiguates the three levels without new action names.
- Suggested commit message:
  `feat(locations): manageable il/ilçe/mahalle taxonomy — hierarchical CRUD, reorder, bulk-archive vs MSW + audit`

## 2026-07-24 Task 010 — Mesajlar & Şikayetler
- Built: `features/messages` end-to-end vs MSW, following the users vertical as the template (three-tier
  moderation + reason-required + audit). Zod-first schemas (`reportSchema` id/subjectType[listing|user|message]/
  subjectId/subjectLabel/reasonCategory[spam|fraud|inappropriate|misinformation|other]/description/status[open|
  resolved|dismissed|escalated]/priority[low|normal|high]/reporterName/createdAt, `reportActionSchema` with a
  reason-required refine [dismiss/escalate require reason; resolve does not], `reasonFormSchema`). Taxonomy/labels
  (`data/reports.ts`: subject types, reason categories, statuses, priorities, actions + `REPORT_ACTION_STATUS`
  mapping resolve→resolved/dismiss→dismissed/escalate→escalated). Deterministic 30-row seed (mixed subject/reason/
  priority, skewed toward `open` so the queue has work). MSW handlers (list w/ filter status/subjectType/
  reasonCategory/priority + q search over subjectLabel/description/reporterName, sort, paginate; detail; single
  `POST /reports/:id/action` runtime-validated via `reportActionSchema.safeParse` → 422; every write emits an
  immutable `lib/audit` entry `report.resolve|dismiss|escalate`, resource `report:<id>`, before/after status +
  reason). Query/mutation hooks (`useReports` keepPreviousData, `useReport`, `useReportAction` optimistic status
  flip + rollback + sonner toasts). Components: `ReportStatusBadge` (label carries meaning), `ReportPriorityBadge`
  (icon + label + `aria-label` — color never the sole signal), `ReasonCategoryBadge` (icon + label + aria-label),
  `ReportDecision` (purpose-built three-tier OK→resolve / Belirsiz→escalate / NOK→dismiss; escalate/dismiss reason
  required via a focus-managed popover WITH a `FieldHelp` affordance + `aria-describedby`; gated by a single
  `message.moderate` permission — NOT the listing-coupled ModerationDecision), `ReportActionDialog` (RHF + FieldHelp
  reason capture for bulk dismiss/escalate), `reportColumns`. Pages: List (`/messages` — DataTable + FilterBar with
  status/subjectType/reasonCategory/priority facets + NL parser + bulk resolve/dismiss + export CSV/XLS with scope +
  expandable sub-row showing the quoted description), Detail (`/messages/:id` — complaint meta + quoted-content
  blockquote + subject deep-link [listing/user] + three-tier `ReportDecision` + audit timeline; closed complaints
  show a "no further action" note). Router: `messages` PlaceholderPage → real List + `:id` Detail (routeMeta +
  `message.moderate`). MSW registry updated. Full-DoD stories for every component + both pages (seeded QueryClient +
  memory-router harness) + a handlers unit test (list/filter/sort, resolve+audit, dismiss/escalate+reason audit,
  reason-required 422 guardrail for BOTH dismiss and escalate with the row left untouched).
- Verification: lint PASS (0 errors; 13 pre-existing warnings) · typecheck PASS · test PASS (640/640, 110 files) ·
  build PASS · build-storybook PASS.
- DoD self-check: ran the `dod-reviewer` agent → 1 blocking gap, FIXED before checkpoint: `ReportDecision`'s
  escalate/dismiss reason popover rendered a raw `Label`+`Textarea` (no FieldHelp / no `aria-describedby`) — a
  Golden-Rule-6 violation → added a `FieldHelp` affordance beside the label, a helper `<p>`, and wired
  `aria-describedby` into the Textarea. Re-verified green. Non-blocking, tracked: bulk actions cover resolve/dismiss
  only (matches the task spec "bulk resolve/dismiss"; escalate stays per-row on detail, mirroring users' suspend/ban
  bulk); the same raw-textarea anti-pattern still exists in the pre-existing `listings/ModerationDecision.tsx`
  (out of scope — flag to fix when that vertical is next touched).
- **Debt paid (009 lesson):** page `Error` stories now drive a REAL `isError` state (not an Empty mirror) — added
  `seedQueryError()` in `page-story-utils` that builds the query cache into an error state deterministically (no
  network); the List Error story asserts `role="alert"` + a "Tekrar dene" retry button, the Detail Error story
  asserts the "Şikayet bulunamadı" ErrorState. This is the first vertical with a genuine page-error story; the same
  helper can retrofit listings/users/categories/locations in a later story-polish pass.
- Decisions/assumptions:
  - Three-tier maps OK→resolve (no reason, green), Belirsiz→escalate (reason, outline), NOK→dismiss (reason,
    destructive). Escalate/dismiss require a reason both in the UI popover and server-side (`safeParse` → 422).
  - Single `POST /reports/:id/action` endpoint (not three routes); bulk POSTs the same endpoint per id so each audits.
  - Quoted content is mock (`subjectLabel` + `subjectType` + `description`); real subject relations arrive with
    FastAPI. Detail page deep-links to the subject for listing/user (message has no detail route).
  - `message.moderate` already lives on moderator + support (matrix ready) — no permission change needed.
  - The server refine requires a NON-EMPTY reason (matching the popover); `reasonFormSchema`'s stricter ≥5-char rule
    is intentionally the dialog-form's client-side rule (bulk `ReportActionDialog`), not enforced by the endpoint.
- Suggested commit message:
  `feat(messages): reports/complaints vertical — three-tier moderation queue vs MSW + audit; real page-error stories`

## 2026-07-24 Task 011 — Doping & Ödemeler
- Built: `features/promotions` end-to-end vs MSW — TWO resources following the users/messages template:
  (1) doping-package CRUD + active/archive; (2) payment/invoice list/detail + a single guardrailed **refund**
  action. Zod-first schemas (`dopingPackageSchema` id/name/kind[featured|showcase|urgent|top]/durationDays/price/
  status/order, `paymentSchema` id/invoiceNo/user/package/amount/method[card|transfer|wallet]/status[paid|refunded|
  partially-refunded|failed]/createdAt/lineItems/refundedAmount?, `refundActionSchema` amount>0 + reason-required
  refine, `packageFormSchema` price/durationDays numeric-string, `makeRefundFormSchema(remaining)` factory that
  refines amount ≤ remaining + reason ≥5-char). PURE money helpers `remainingAmount`/`refundOutcome`/`isRefundable`/
  `formatTry` + `packageFormToPayload` (string→number at the submit boundary — avoids the zod-coerce transform clash,
  Task 005 lesson); `lib/order` re-exported (single origin). Seed: 6 packages + 28 payments (mixed user/package/
  method/status, skewed toward `paid` so the refund queue has work; some already partially/fully refunded). MSW
  handlers (package list[status/kind facet + q + order-sort]/detail/create/patch[update|archive]; payment list
  [status/method facet + createdAtFrom/To date range + q, sort, paginate]/detail/`POST /payments/:id/refund`) —
  inputs runtime-validated (`safeParse` → 422); refund guardrail enforced SERVER-SIDE: missing reason → 422 AND
  amount > remaining → 422 (Task 007 lesson: not type-only). Every write emits an immutable `lib/audit` entry
  (`package.create|update|archive`, `payment.refund` with before/after status + refundedAmount + partial flag +
  reason). Registered in the central MSW registry. Query/mutation hooks (`usePackages`/`usePackage`/`usePayments`/
  `usePayment`; `useUpsertPackage`/`useArchivePackage`; `useRefundPayment` optimistic status flip paid→refunded /
  partially-refunded + rollback + sonner toast). Components: `PackageStatusBadge`, `PackageKindBadge` (icon+label+
  aria), `PaymentStatusBadge`, `PaymentMethodBadge` (icon+label+aria — color never the sole signal), `PackageFormDialog`
  (RHF + FieldHelp on every field; price/gün numeric-string), `RefundDialog` (purpose-built — NOT the three-tier
  ModerationDecision; RHF + FieldHelp on tam-iade Switch + amount + reason; full/partial toggle keeps amount = remaining;
  amount can never exceed remaining), `packageColumns` (edit via table meta), `paymentColumns` (select column +
  invoice deep-link). Pages: PackagesList (`/promotions` — DataTable + status/kind facets + NL + "Yeni paket" dialog +
  bulk-archive + export), PaymentsList (`/promotions/payments` — DataTable + status/method facets + date-range + NL +
  export with scope; row → detail), PaymentDetail (`/promotions/payments/:id` — invoice summary + line-items table +
  RefundDialog + audit timeline; refunded/failed payments show "iade yapılamaz"). Router: both PlaceholderPages →
  real pages + nested `payments/:id` detail (routeMeta + permission). Permissions: `promotion.sell` (packages) +
  `payment.refund` (refund) already on the `finance` role — no matrix change. Full-DoD stories for all 6 components +
  3 pages (seeded-QueryClient + memory-router harness reused; page `Error` stories drive a REAL isError via
  `seedQueryError`, Task 010 pattern) + a handlers/helpers unit test (list/filter/sort, create[strings parsed]+audit,
  invalid-price 422, archive+audit, refund reason-required 422, refund>remaining 422, partial→partially-refunded+audit,
  full→refunded, second refund finishes partially-refunded, `remainingAmount` never negative).
- Verification: lint PASS (0 errors; 13 pre-existing warnings) · typecheck PASS · test PASS (706/706, 120 files) ·
  build PASS · build-storybook PASS.
- DoD self-check: ran the `dod-reviewer` agent → 1 blocking gap, FIXED before checkpoint: the Payments table had no
  row-selection column, making the `onExport` `scope === 'selection'` branch dead code and permanently disabling the
  "Seçili" export option (DATA_TABLE_SPEC point 5) → added a `select` checkbox column to `paymentColumns` (mirrors
  packages/messages), so selection now drives the selection-scoped export. Re-verified green (706/706). Non-blocking,
  tracked: PaymentsList wires no dedicated `bulkActions` (refund is per-row with a required reason/amount, so no
  meaningful bulk action — selection still powers export; matches the accepted OfficesList precedent); shared `Switch`/
  `Checkbox` primitives are below 44px (systemic pre-existing gap across all verticals, flag for Aşama 5).
- Decisions/assumptions:
  - Money is string-then-parse everywhere (form fields numeric-string, parsed in `packageFormToPayload` / at the refund
    submit boundary); display via `formatTry` (tabular-nums + tr-TR + ₺). The ≤-remaining ceiling is enforced BOTH in
    the dialog (`makeRefundFormSchema(remaining)` factory) AND server-side (handler remaining check → 422).
  - `refundActionSchema` carries only amount>0 + reason-required (schema can't know runtime remaining); the handler adds
    the `amount ≤ remaining` + `status ∈ {paid, partially-refunded}` checks → 422. `refundOutcome` decides
    refunded vs partially-refunded (full-remaining → refunded).
  - `RefundDialog` is purpose-built (adapts the users/messages dialog pattern), NOT an import of ModerationDecision/
    ReportDecision — this module has a single guardrailed action, not a three-tier decision (task note).
  - Payments carry embedded `lineItems` (single line = the package) so the detail page renders a real invoice; real
    subject relations arrive with FastAPI. Package edit is via the list-row dialog (no package detail page); a
    `GET /packages/:id` endpoint exists for completeness.
- Suggested commit message:
  `feat(promotions): doping packages CRUD + payments/refund vertical — guardrailed refunds vs MSW + audit`

## 2026-07-24 Task 012 — Raporlar & Analitik
- Built: `features/reports` — a READ-ONLY analytics vertical deriving every metric from the EXISTING mock DBs
  (`getListingsSnapshot`/`getPaymentsSnapshot`/`getReportsSnapshot`), NO new seed data. Pure, deterministic
  helpers in `src/lib/analytics.ts` (`dayKey`, `sumBy`, `rateOf`, `shiftDayKey`, `eachDayKey`, `latest/earliestDayKey`,
  `countByDay`/`sumByDay`, `buildDailySeries` gap-fills days with 0) — NO `Date.now()`/argless `new Date()`; day math
  parses explicit `YYYY-MM-DDT00:00:00Z` strings. `features/reports/lib/overview.ts` `computeOverview(input, range)`
  (also pure): resolves the `[from,to]` window from the LATEST `createdAt` in data (data-derived "today", clamps to
  earliest for `all`), then scopes KPIs (totalListings/activeListings/totalRevenue [gross paid − refunds, failed
  excluded]/refundRate/pendingModeration/openReports), listings + revenue daily trends, moderation funnel
  (submitted→pending/active/rejected), and category/status donut breakdowns to that window. Zod-first schemas
  (`reportsRange` 7d|30d|90d|all, `metricPoint`, `breakdownSlice`, `funnelStage`, `reportsKpis`, `reportsOverview`);
  the handler `reportsOverviewSchema.parse`s its own envelope. MSW `GET /reports/overview?range=` (range `safeParse`
  → falls back to 30d) registered in the central registry BEFORE the messages `/reports/:id` param route (exact path
  must win the match — the messages "reports"=complaints resource shares the `/reports` prefix). Hook
  `useReportsOverview(range)` (queryKey by range, keepPreviousData). New primitive `components/data/LineChartCard`
  (recharts Line/Area variants, chart-1..5 tokens, ResponsiveContainer, loading + empty[all-zero] branches, and an
  always-present `sr-only` data table so color is never the sole signal). Page `ReportsPage`: range Tabs selector +
  6 KPI tiles + ilan-trendi line + gelir-trendi area (₺) + moderasyon-hunisi bar + kategori/durum donuts; every chart
  has a per-chart `ChartExportMenu` (CSV/XLS of its underlying data via `lib/export`). Router: `/reports`
  PlaceholderPage → `ReportsPage` (routeMeta + `report.view` already gated at route level). Full-DoD stories for
  LineChartCard + ReportsPage (Default/Loading/Empty/Error/Mobile + play; page `Error` drives a REAL `isError` via
  `seedQueryError`). Unit tests: `analytics.test.ts` (bucket/shift/series determinism) + `reports/api/handlers.test.ts`
  (window resolution, revenue = paid − refunds, refund rate, funnel counts, schema-valid envelope, range fallback,
  determinism).
- Verification: lint PASS (0 errors; 13 pre-existing warnings) · typecheck PASS · test PASS (734/734, 124 files) ·
  build PASS · build-storybook PASS.
- DoD self-check: ran the `dod-reviewer` agent → 2 blocking a11y gaps, BOTH FIXED before checkpoint:
  (1) the new range-selector `Tabs` triggers were <44px (shared `ui/tabs.tsx` is `h-9`/`py-1`) → added `min-h-11 px-3`
  on the triggers + `h-auto flex-wrap` on the list, page-local override only (shared primitive untouched);
  (2) the moderation-funnel `BarChart` (reused bare `ChartCard`) had no `sr-only` data summary like `LineChartCard`
  → wrapped it with a mirrored `sr-only` table (Aşama/Adet). Re-verified green (734/734, build-storybook PASS).
  Deferred (non-blocking, tracked): `ErrorState`/`ChartCard`/`DonutChartCard` are shared pre-existing primitives —
  `ErrorState`'s retry button + `ChartCard`'s missing built-in sr-only summary are cross-cutting; fold "extend
  `ChartCard` with an optional accessible summary + bump `ErrorState` retry to 44px" into the Aşama 5 a11y pass.
  Funnel bar chart doesn't show an empty-branch message at all-zero (the Empty story still proves line/area/donut
  empty-out) — minor polish.
- Decisions/assumptions:
  - Read-only: this module NEVER writes to `lib/audit`; it only reads snapshots. Revenue is attributed to a payment's
    `createdAt` day (refunds fold into that day's net) for a deterministic single-series trend — real per-refund dates
    arrive with FastAPI.
  - Endpoint stays `/reports/overview` per the task; the `/reports` prefix collision with the messages complaints
    resource is resolved purely by handler ordering (exact before param), not by renaming.
  - `report.view` already lives on finance + analyst + super-admin (matrix + `docs/PERMISSIONS.md` already synced) —
    no permission change needed; route-level `RouteGuard` gates the page, so no redundant in-page `<Can>` wrapper.
  - KPIs are windowed (not global lifetime totals) so the range selector actually changes the numbers.
  - Bundle ~2.0MB (recharts already in graph) — reinforces the deferred Aşama 5 route-level `lazy()` code-split.
- Suggested commit message:
  `feat(reports): read-only analytics vertical — KPI + trend/funnel/donut charts, per-chart export vs derived metrics`

## 2026-07-24 Task 013 — Denetim Kaydı (Audit Log)
- Built: `features/audit` — a READ-ONLY vertical over the existing append-only `lib/audit` log (mirrors the 012
  read-only pattern). NO new writes, NO new seed data. Zod schema (`auditEntrySchema` mirroring `lib/audit`'s
  `AuditEntry`; `auditPageSchema` envelope) that RE-EXPORTS the canonical `AuditEntry` type from `@/lib/audit`
  (single origin, no competing definition). Taxonomy/labels (`data/audit.ts`: `ACTION_FAMILIES`
  [listing/user/category/location/report/package/payment] + labels, `ACTOR_KINDS` [human/ai] + labels + `Bot`/`User`
  icons). PURE, deterministically unit-testable helpers in `lib/audit-utils.ts`: `actorKind` (`ai:*`→ai else human),
  `actionFamily` (prefix before the first dot; `attribute.*` folds into `category`), `isKnownFamily`, `auditReason`
  (pulls a non-empty `reason` from the after→before snapshot), `auditDiff` (field-level before→after changes, excludes
  `reason`), and `filterAuditEntries(entries, filter)` (family/actorKind/date-range/free-text filter + sort; default
  newest-first; NON-mutating). MSW `GET /audit?page&pageSize&sort&filters` reads `getAuditLog()`, applies the pure
  filter, paginates — registered LAST in the central registry (exact `/audit`, no param-route prefix collision, 012
  ordering lesson noted). Hooks: `useAuditLog(query)` (keepPreviousData) + `useAuditFor(resource)` (sync read for
  detail pages). Components: `AuditActorBadge` (Bot/User icon + actor text + `aria-label` "İnsan/Yapay Zeka aktör: …"
  — color NEVER the sole AI-vs-human signal), `AuditTimeline` (shared `<ol>`/`<li>` timeline: actor badge + action +
  resource [optional `renderResource` formatter] + before→after diff + reason + absolute `<time dateTime>` with
  `sr-only` label; NO relative time [determinism]; empty-state branch), `auditColumns` (ts/actor/action/resource/
  reason). Page `AuditListPage` (`/audit` — DataTable + FilterBar [action-family facet + actor-kind facet + date range
  + NL/free-text parser] + CSV/XLS export [view/all scopes; no select column → no dead bulk affordance] + URL-state +
  expandable per-row `AuditTimeline` sub-row). Router: `/audit` PlaceholderPage → real `AuditListPage`.
  **De-duplication:** ALL SIX detail pages (`ListingDetailPage`, `UserDetailPage`, `CategoryDetailPage`,
  `ProvinceDetailPage`, `ReportDetailPage`, `PaymentDetailPage`) now render `<AuditTimeline entries={audit} />` in place
  of their ad-hoc `<ol>` block (existing `audit.length > 0` + Card/Separator wrappers preserved; behavior equal, richer
  visual). Full-DoD stories for `AuditActorBadge`/`AuditTimeline`/`AuditListPage` (Default/Loading/Empty/Error/Mobile +
  play; page `Error` drives a REAL `isError` via `seedQueryError`, 010/011/012 pattern; `AuditListPage` also ships
  Sidebar/Topnav bonus stories). Unit tests: `lib/audit-utils.test.ts` (all pure helpers + filter with fixed input:
  actor split, family fold, reason extraction, diff, family/actorKind/date/free-text filter, explicit sort, determinism
  + no-mutation) and `api/handlers.test.ts` (loose self-seeded integration: envelope, actorKind facet, family facet
  [attribute→category], free-text q — global-log isolation via self-writes, per the task's read-only test note).
- Verification: lint PASS (0 errors; 13 pre-existing warnings) · typecheck PASS · test PASS (771/771, 129 files) ·
  build PASS · build-storybook PASS.
- DoD self-check: ran the `dod-reviewer` agent → NO blocking issues, "Ready to commit: YES". Confirmed read-only
  (production module never imports `writeAudit`; only the test seeds fixtures), AI-vs-human distinction via icon+label+
  aria, semantic `<ol>` + `sr-only` time, real `isError` story, no `title` attr, no hardcoded colors, strict TS.
  Non-blocking nice-to-have noted (not applied): a `play` assertion on the `Loading` story of `AuditListPage`
  (currently render-only, matching the existing list-page precedent across verticals).
- Decisions/assumptions:
  - READ-ONLY like 012: the module NEVER writes `lib/audit`; the live `/audit` table starts empty and fills as
    verticals perform actions at runtime. AI-actor (`ai:*`) entries are demonstrated via `MOCK_AUDIT` fixtures in
    stories/tests (no current handler writes `ai:*` actors) — the `AuditTimeline`/`AuditActorBadge` capability is what
    the DoD requires, and adding seed `ai:*` entries would violate "no new seed data".
  - `reason` is NOT a top-level `AuditEntry` field — it is embedded in the `after`/`before` snapshot by the writing
    verticals; `auditReason` derives it. `auditDiff` renders the rest of the snapshot as key: before→after.
  - Filter logic lives in a PURE helper (`filterAuditEntries`) tested with fixed input; the handler integration test
    self-seeds via `writeAudit` and asserts loosely, because `getAuditLog()` is global mutable state other verticals
    mutate at runtime (task risk note).
  - No row-selection column (read-only, no bulk actions) → export offers view/all only; `ExportMenu` disables the
    selection scope at `selectedCount===0`, so there's no dead affordance (avoids the DATA_TABLE_SPEC-5 flag).
  - Date-range facet id is `ts` (params `tsFrom`/`tsTo`); action-family facet id is `family`; actor-kind facet id is
    `actorKind` — all read via `url.searchParams.getAll(...)` in the handler.
  - `audit.view` already lives on analyst + super-admin (matrix) and gates the route — no permission change needed.
- Suggested commit message:
  `feat(audit): filterable read-only audit table + shared AuditTimeline; dedupe 6 detail-page timelines`

## 2026-07-25 Task 014 — RBAC (Roller & İzinler)
- Built: `features/rbac` — a **write vertical over the live permission MODEL** (013 was read-only; this edits
  authz itself). The core is a **reactive matrix bridge** (`src/lib/permissions/permission-store.ts`): a
  `useSyncExternalStore` external store holding the LIVE `PermissionMatrix`, seeded from the immutable `matrix`
  constant via `cloneMatrix`. `getPermissionMatrix`/`setPermissionMatrix`/`resetPermissionMatrix`/`usePermissionMatrix`
  + a live `can()`. Added `canWith(m, role, perm)` (pure) to `permissions.ts`; the seed-based `can()` stays for
  legacy/pure use. **Rewired all four authz surfaces to read the live matrix reactively:** `usePermission`/`Can`
  (`permission-context`), `RouteGuard`, `filterNavByRole`/`usePermittedNav` (`nav-utils`, now takes a matrix arg),
  and `CommandPalette` — so an edit on `/rbac` reflects in gating/nav/route-guard immediately. Zod-first schemas
  (`features/rbac/schemas/rbac.ts`: re-exports canonical `Role`/`Permission`/`PermissionMatrix`; `permissionToggleSchema`,
  `rbacMatrixSchema`; pure `isGranted`/`toggleMatrix` [non-mutating, super-admin no-op]; `EDITABLE_ROLES`/`SUPER_ADMIN`).
  `data/rbac.ts` `PERMISSION_CATALOG` — all known `resource.action` permissions grouped by resource with Turkish
  labels + per-action help (12 resources) + `ALL_PERMISSIONS`. MSW handlers (`GET /rbac/matrix` → `{roles, catalog,
  matrix}`; `POST /rbac/matrix/toggle` → `super-admin` downgrade attempt 422 [self-lockout guard], invalid body 422,
  idempotent toggles are no-ops [no dup audit]; every real change writes `rbac.grant`/`rbac.revoke`, resource
  `role:<role>`, before/after `{[permission]: 'açık'|'kapalı'}`). Registered in the central registry (`resetRbacDb()`
  for tests, `getRbacMatrixSnapshot()`). Hooks: `useRbacMatrix()` + `useTogglePermission()` (optimistic update to BOTH
  the query cache AND the live store, rollback both on error, re-sync from server envelope on success + sonner toast).
  Component `PermissionMatrixEditor`: real `<table role="grid">`, resource-grouped `<tbody>` sections, `scope=col/row/
  colgroup` headers, `sr-only` caption; each editable cell is a 44px-target (`min-h-11 min-w-11` label wrapper)
  Checkbox with `aria-label="<rol> için <izin>"` (shape+label signal, never color); `super-admin` column is a read-only
  `*` Badge; every row carries label + `FieldHelp` (help popover, NO `title`) + mono permission code; loading skeleton +
  empty-catalog branch. Page `RbacPage`: header + editor (fed by the hooks, `disabled` while a toggle is in flight) +
  `AuditTimeline` change-history panel (reads `role:*` audit, `renderResource` maps `role:<role>`→Turkish label); a
  `useEffect` syncs server matrix→store while mounted. **Instant/optimistic save UX** (no batch "Kaydet"), matching the
  users/promotions optimistic pattern. Router: `/rbac` PlaceholderPage → real `RbacPage` (`rbac.manage` route guard
  already present). `docs/PERMISSIONS.md` synced (canWith + live-store model + super-admin guardrail + catalog pointer).
  Full-DoD stories for `PermissionMatrixEditor` (Default[toggle play]/Loading/Empty/Disabled/Mobile) + `RbacPage`
  (Default/Loading/Empty/Error[real `isError` via `seedQueryError`]/Mobile + play). Unit tests: `handlers.test.ts`
  (envelope, grant+audit, revoke+audit, super-admin 422 guardrail, invalid 422, idempotent no-dup-audit) and
  `permission-store.test.tsx` (a live `setPermissionMatrix` edit re-renders BOTH `<Can>` AND `RouteGuard` end-to-end;
  reset restores the seed).
- Verification: lint PASS (0 errors; 13 pre-existing warnings) · typecheck PASS · test PASS (790/790, 133 files) ·
  build PASS · build-storybook PASS.
- DoD self-check: ran the `dod-reviewer` agent → 1 blocking gap, FIXED before checkpoint: `RbacPage` passed
  `matrix={data?.matrix ?? ({} as never)}` — an unsafe cast forcing an invalid `{}` through `PermissionMatrix` (the
  DoD bans `any`/`!`/`@ts-ignore`-class escapes) → replaced with `cloneMatrix(seedMatrix)` (type-valid, no cast; the
  editor shows a skeleton while loading anyway). Applied the reviewer's non-blocking recommendation too: added a
  DIRECT `RouteGuard` live-reflect test (previously only `<Can>` proved the shared path). Deferred (non-blocking):
  custom-role CREATION was left out of scope (task said optional/keep-small; the 5 seed roles' matrix editing is the
  goal) — flag for a later task if needed; pre-existing `FieldHelp` doesn't wire `aria-describedby` popover→field
  (project-wide `docs/FORMS_UX.md` follow-up, component untouched here).
- Decisions/assumptions:
  - **Bridge strategy:** kept `matrix` as the immutable SEED; the runtime copy lives in a `useSyncExternalStore` store
    (`setPermissionMatrix` always assigns a NEW object so the snapshot ref changes → subscribers re-render). Chose the
    store over threading a context through `SessionProvider` — least invasive, and `can()`/`canWith` stay pure.
  - MSW handler keeps its OWN `rbacDb` (the "server" truth + audit writer); the client store is updated by the toggle
    hook (optimistic) and re-synced from the server envelope on success + by a page effect on load. Global mutable
    state → `resetRbacDb()` (handler) and `resetPermissionMatrix()` (store, `afterEach`) isolate tests; the append-only
    audit log can't be reset, so the idempotent-toggle test measures the audit DELTA, not the absolute count.
  - Audit before/after use `{[permission]: 'açık'|'kapalı'}` so `AuditTimeline`'s `auditDiff` renders a readable
    `listing.approve: kapalı → açık` line (the permission is the diff KEY, so it shows even though the resource is `role:*`).
  - Super-admin guardrail is enforced in THREE places: UI (read-only `*` Badge, no checkbox), `toggleMatrix` (no-op),
    and the handler (422). `rbac.manage` is super-admin-only in the matrix, so only super-admin can reach `/rbac`.
- Suggested commit message:
  `feat(rbac): runtime-editable role/permission matrix editor — live authz bridge + toggle vs MSW + audit`

## 2026-07-25 Task 015 — Ayarlar / Config (Settings)
- Built: `features/settings` — a tabbed **settings surface** (NOT a table vertical) over a new MSW-backed
  `settings` resource, following the 014 write-vertical rhythm (schema → handlers+audit → hooks → components →
  page → route → stories+tests). Three editable groups: (a) **Genel/sistem** (siteName/supportEmail/defaultLocale
  [tr literal]/maintenanceMode); (b) **Özellik bayrakları** (a live feature-flag set); (c) **Görünüm varsayılanları**
  (org-level layout mode/density/theme). **Live feature-flag bridge** (`src/lib/settings/feature-flags-store.ts`):
  a `useSyncExternalStore` external store seeded from `DEFAULT_FLAGS`, mirroring the accepted `permission-store`
  pattern — `getFeatureFlags`/`setFeatureFlags`/`resetFeatureFlags`/`useFeatureFlags`/`useFeatureFlag(key)`. The flag
  CATALOG + defaults live in `src/lib/settings/feature-flags.ts` (single origin, like `config/layout.ts`); the feature
  schema re-exports them. **Two flags gate REAL behavior on the listing detail page** (`useFeatureFlag` in
  `ListingDetailPage`): `listingDetailMap` (the "Konum" map card) + `aiCopilotBadges` (the `AiSuggestionBadge`) —
  proven live by a store-bridge unit test AND a `FlagsOff` Storybook story asserting both vanish. Zod-first schemas
  (`generalSettingsSchema` [email refine], `featureFlagsSchema` [full record derived from the catalog],
  `layoutDefaultsSchema` [mirrors `LayoutConfig`'s editable subset — no double-def], `settingsSchema` envelope, and a
  `settingsPatchSchema` that `.partial()`s each group + uses `z.partialRecord` for single-flag PATCHes + refines
  "≥1 group"). MSW `GET /settings` + `PATCH /settings` (safeParse → 422; general/layout re-parse the merge for a clean
  typed value; each changed group/flag writes `lib/audit`: `settings.update` [resource `settings:general|layout`],
  `flag.enable`/`flag.disable` [resource `flag:<key>`, idempotent no-op skip]); `resetSettingsDb()` + `getSettingsSnapshot()`;
  registered in the central registry (exact `/settings`, no param collision). Hooks `useSettings()` + `useUpdateSettings()`
  (optimistic re-parse of the merge → updates BOTH the query cache AND the live flag store; rollback both on error;
  re-sync on success + sonner). Components: `SettingsSection` (titled card), `FeatureFlagList` (`catalog?`/`loading?`
  props; each row = 44px-hit `Switch` + label + `FieldHelp` + `aria-labelledby`), `GeneralSettingsForm` (RHF +
  `FormField`/FieldHelp on every field; `maintenanceMode` enable guarded by a `ConfirmDialog`, disable immediate),
  `LayoutDefaultsForm` (three labelled Selects with a persistent id'd `sr-only` help span → `aria-describedby`
  replicating `FormField`; "Bu cihaza uygula" pushes org defaults into the live `layout-context` on demand).
  Page `SettingsPage`: three `Tabs` (44px triggers) + a `settings:*`/`flag:*`-filtered `AuditTimeline` change-history
  panel; a `useEffect` syncs server flags → store while mounted. Router `/settings` PlaceholderPage → real page.
  Full-DoD stories for all four components + the page (Default/Loading/Empty/Error/Mobile + play; page `Error` drives a
  REAL `isError` via `seedQueryError`). Unit tests: `feature-flags-store.test.tsx` (a live `setFeatureFlags` edit
  hides/shows a `useFeatureFlag` consumer + reset restores) and `api/handlers.test.ts` (seed envelope, general update +
  audit, invalid-email 422, empty-patch 422, flag.disable audit, idempotent-flag no-audit, layout update audit).
- Verification: lint PASS (0 errors; 13 pre-existing warnings) · typecheck PASS · test PASS (826/826, 140 files;
  green on consecutive warm runs — the first cold run hit the known one-time Vite dep pre-bundle race from the 5 new
  story files) · build PASS · build-storybook PASS.
- DoD self-check: ran the `dod-reviewer` agent → 4 blocking gaps, ALL FIXED before checkpoint, then RE-REVIEWED →
  "Ready to commit: YES", no blocking issues. Blocking fixes: (1) added missing co-located stories for
  `LayoutDefaultsForm` + `SettingsSection` (full state matrix); (2) `LayoutDefaultsForm`'s three Selects bypassed
  `FormField` and never wired `aria-describedby` → the `Row` helper now renders a persistent id'd `sr-only` help span
  and each `SelectTrigger` points `aria-describedby` at it (mirrors `FormField`); (3) completed the
  Default/Loading/Empty/Error/Mobile story-name matrix on `GeneralSettingsForm` + `FeatureFlagList` (the latter gained
  `catalog?`/`loading?` props so its Empty/Loading branches are genuinely exercised, mirroring `PermissionMatrixEditor`);
  (4) the new flag binding in `ListingDetailPage` had no flag-off coverage → added a `FlagsOff` story (story-level
  `beforeEach` toggles the store off + resets on cleanup) asserting the map card + AI badge disappear, and `Default`
  now asserts they're present. Non-blocking applied: `data-action`/`data-entity` on the general-form inputs; an aliased
  `Empty` story on `SettingsPage`; a comment documenting the `FlagsOff` global-store isolation assumption.
- Decisions/assumptions:
  - **No double-source (task risk):** the user's LIVE layout preference stays owned by `layout-context` (localStorage);
    `settings.layoutDefaults` is the ORG-level seed stored in MSW. Chosen rule: defaults are applied to the current
    device only ON DEMAND via "Bu cihaza uygula" (no silent overwrite of the user's active layout on load).
  - **Save UX is a deliberate mix** (task: "pick the simplest consistent UX"): the General text form uses a grouped
    "Kaydet" button (a per-keystroke instant-save on text fields is bad UX); flags + layout defaults are instant/optimistic
    toggles (matching the users/promotions/014 optimistic precedent). Documented so the inconsistency is intentional.
  - **Flag catalog kept lean & honest** (2 flags, BOTH bound to real behavior) rather than padding with dead catalog-only
    flags — the task requires "at least one" live-bound flag; both `listingDetailMap` + `aiCopilotBadges` gate real
    listing-detail UI, so there is no dead affordance. More flags can be added later by dropping a key in
    `feature-flags.ts` + wiring one `useFeatureFlag` call.
  - Feature-flag store + the `settings` schema keep flag defaults in `lib/settings/feature-flags.ts` (source of truth);
    the feature schema/data re-export, so there's no competing definition (same discipline as `config/layout.ts` +
    `lib/order.ts` re-exports).
  - `maintenanceMode` enable is the only high-consequence toggle → `ConfirmDialog` guard (destructive, explicit "site
    kapatılacak" copy); disabling is immediate. `settings.manage` is super-admin-only and already route-guards `/settings`.
  - `Error` stories on the presentational `FeatureFlagList`/`LayoutDefaultsForm` alias a benign render (these components
    have no error branch of their own; the page owns errors) — matches the repo's loose-alias story-matrix convention
    (`FormSection`/`ProvinceFormDialog`).
- Suggested commit message:
  `feat(settings): system settings + live feature-flag bridge + layout defaults vs MSW + audit`

## 2026-07-25 Task 016 — Aşama 4: AI-first Katman (Assistant + Kopilotlar)
- Built: a single, coherent AI-first layer wiring the panel's scattered AI pieces into one surface. NO LLM —
  "AI" here is a deterministic, unit-tested rule-based parser + the existing `aiSuggestion` data. Core in
  **`src/lib/ai/`** (all PURE, no `Date.now()`/argless `new Date()`): `intent.ts` (Zod discriminated-union intent
  schema — filter/navigate/bulk-action/unknown + filter chips); `parse.ts` (`parseCommand(input, context)` with
  precedence bulk→navigate→filter→unknown, and `parseFilters` recognising category/city/status vocab + numeric
  price(₺)/area(m²) ranges with üzeri/altı/arası qualifiers — vocabulary INJECTED via `ParseContext` so the core
  stays domain-agnostic and single-origin); `apply-intent.ts` (the GUARDRAIL: `applyIntent(intent, deps)` throws
  unless `deps.confirmed` for the bulk write path; `selectApprovable` narrows strictly to `status==='pending' &&
  aiSuggestion==='ok'` — NOK/uncertain NEVER auto-approved; `filtersToSearch` deterministic URL serialization);
  `assistant-store.ts` (`useSyncExternalStore` open/closed bridge mirroring `permission-store`/`feature-flags-store`,
  so ⌘K / palette / FAB all open it without prop-drilling). Components in **`src/components/ai/`**: `AssistantDock`
  (reinterpreted "Calm Signal" FAB launcher — `aria-label`+`aria-haspopup="dialog"` — plus the panel in a Sheet,
  mobile-first full-width→sm right panel); `AssistantPanel` (context header from `useMatches` routeMeta; command
  Textarea WITH FieldHelp + persistent `sr-only` `aria-describedby` mirror; parsed-intent CARD with confirm-before-
  apply for filter[chips→Uygula→navigate w/ params]/navigate[→git]/bulk[→ConfirmDialog]/unknown; a `CopilotCard`
  reflecting the pending-queue query state [loading skeleton / real ErrorState / empty / approvable count]; a "Son
  AI aksiyonları" list reading `getAuditLog()` for `ai:*` actors); `assistant-context.ts` (builds parser vocab from
  the user's PERMITTED nav [so a proposed navigate never points at a forbidden route] + listing taxonomy; `AI_QUEUE_QUERY`).
  **Copilot integrations (minimal touch):** the FilterBar NL parser was MOVED to `lib/ai` — `features/listings/lib/nl-context.ts`
  supplies the vocab and `ListingsListPage.parseNaturalLanguage` now delegates to `parseFilters` (behaviour is a
  SUPERSET: category/city/status + price/m² ranges; single origin). The moderation copilot bulk-approves via a new
  `useAiApproveListings` mutation posting `decision:'ok', actor:'ai:moderation-copilot'` per id; `moderationSchema`
  gained an optional `actor` and the moderate handler writes it (defaults `user:current` for humans). Wiring:
  `AssistantDock` mounted once in `AppShell`; a "AI Asistanını aç" quick action added to `CommandPalette`. Full-DoD
  stories for `AssistantDock` + `AssistantPanel` (Default/Loading/Empty/Error[real `isError` via `seedQueryError`]/
  Mobile + play; NavigateIntent story too) + a `CommandPalette` `AssistantAction` play assertion. Unit tests:
  `lib/ai/parse.test.ts` (schema-valid + deterministic intents; filter/navigate/bulk/unknown; longest-module-match;
  "aktif ilanları göster"→filter not navigate; bare "onayla" does NOT fire bulk) and `lib/ai/apply-intent.test.ts`
  (the guardrail: `selectApprovable` excludes uncertain/nok/non-pending; bulk THROWS + never writes when unconfirmed;
  applies ONLY the AI-OK ids when confirmed) + `handlers.test.ts` (`ai:moderation-copilot` actor lands in audit).
- Verification: lint PASS (0 errors; 13 pre-existing warnings) · typecheck PASS · test PASS (857/857, 144 files) ·
  build PASS · build-storybook PASS. (Note: `SettingsPage.stories > Error` shows a rare full-suite-parallel flake —
  passes in isolation every time and on warm re-runs; pre-existing global-store/timing interaction, not this diff.)
- DoD self-check: ran the `dod-reviewer` agent → 2 blocking gaps, BOTH FIXED before checkpoint, re-verified green:
  (1) the four AI action buttons (`size="sm"`=32px) were below the 44px target the task explicitly requires for the
  confirm-before-apply affordances → added `min-h-11` to the CopilotCard "Toplu onayı öner", the IntentCard
  confirm/dismiss pair, the unknown-intent "Kapat", plus the primary "Yorumla" button; (2) the command Textarea had
  no `aria-describedby` for its FieldHelp → added a persistent `sr-only` help mirror (`id="assistant-command-help"`)
  and pointed `aria-describedby` at it (FormField pattern). Applied the non-blocking rec too: a `CommandPalette`
  `AssistantAction` story asserting the new ⌘K affordance. Deferred (non-blocking, tracked for the FastAPI backend):
  `moderationSchema.actor` is an unrestricted string in the mock phase — the real backend must derive `actor` from
  the authenticated agent identity, not trust the request body (no auth boundary exists yet).
- Decisions/assumptions:
  - **Scope discipline (task note):** delivered the core — assistant skeleton + pure parser + guardrail — plus exactly
    ONE NL-filter integration (listings) and ONE moderation bulk-action, per the task's "1+1 yeter" guidance. Other
    verticals are NOT wired to a copilot; the shared `lib/ai` core makes that a later drop-in.
  - **Domain-agnostic core:** `lib/ai` takes vocabulary via `ParseContext` (categories/cities/statuses/modules)
    rather than importing feature taxonomy — so the pure parser has no feature dependency and the feature owns its
    vocab (single origin). The assistant component assembles the context from permitted nav + listing taxonomy.
  - **Filter apply = navigate-with-params:** applying a filter intent navigates to the entity's list route with the
    filters as URL search params, which the existing `useTableUrlState` reads — no new apply plumbing, reuses the
    URL-as-source-of-truth contract. The IntentCard "Uygula" click IS the confirm for the non-destructive path.
  - **Store over context (015 lesson):** open state is a `useSyncExternalStore` store, not a context, so any surface
    opens the assistant without threading a provider. Route context is read reactively via `useMatches` in the panel,
    NOT duplicated in the store.
  - **`retryOnMount:false` in story clients:** RQ retries errored queries on mount by default, which overwrote the
    seeded error → the panel's `Error` story sets `retryOnMount:false` so `seedQueryError` sticks (deterministic).
- Suggested commit message:
  `feat(ai): deterministic assistant + copilots — NL parser/intent core, guardrailed AI bulk-approve vs audit`

## 2026-07-25 Task 017 — Aşama 5: Enterprise Cila & Performans (FİNAL faz)
- Closed the cross-cutting technical debt accumulated across the verticals; NO new vertical — measure, fix, prove.
- **1. Route-level code-split** (`src/app/router.tsx`): every page component is now loaded on demand via a small
  `named(loader, key)` → `React.lazy` helper (each `import('@/features/<x>')` specifier → ONE shared per-feature chunk,
  so a feature's pages travel together). Critically, `handle`/routeMeta stays a STATIC object literal on each route
  (NOT inside `route.lazy()`), so `RouteGuard`/breadcrumbs/RBAC resolve at the boundary BEFORE the chunk loads — a deep
  link to a forbidden route renders the 403 without ever flashing the fallback. New `src/app/pages/PageSkeleton.tsx`
  (token-only, `role="status"` + `aria-busy`); `AppShell` nests `RouteGuard > Suspense(fallback=PageSkeleton) > Outlet`.
  **Measured:** main bundle **2,037.98 kB → 542.77 kB** (gzip **626.57 → 163.63 kB**, ~73% smaller); recharts
  (`DonutChartCard` 378 kB), leaflet (323 kB), and all 11 feature chunks split out. Storybook page-story harness is
  unaffected (pages import directly, not via the router); router smoke re-verified by build + tests.
- **2. Touch targets** (`src/components/ui/switch.tsx`, `checkbox.tsx`): added a ≥44px WCAG 2.5.5 hit area via a
  transparent `after:` pseudo-element (the FieldHelp HIT_AREA idiom) while PRESERVING the 20×36 / 16px visual size —
  Switch `after:-inset-x-1 after:-inset-y-3` (44×44), Checkbox `after:-inset-3.5` (16+2·14 = 44). CSS-only, token-based,
  no new variant/state (existing full-matrix stories still cover them).
- **3. DataTable column pinning + drag-reorder** (`DataTable.tsx`, `ColumnVisibility.tsx`) — completes DATA_TABLE_SPEC
  point 4. Opt-in `columnControls` prop (enabled on **listings** only, so other tables/tests are untouched): TanStack
  `enableColumnPinning` + `columnOrder`/`columnPinning` state; sticky pinned cells via `pinnedCellProps()` (token-only —
  `bg-background`/`bg-muted/60`/`border-border`, NO hardcoded color); a draggable header grip (native HTML5 DnD, no new
  dep) reorders columns; and a **keyboard-accessible alternative** in the Kolonlar menu — a per-column submenu
  (Sola sabitle / Sola taşı / Sağa taşı) that performs the identical reorder/pin via larger, fully keyboard-operable
  controls (WCAG 2.5.8 equivalent-alternative). New `ColumnControls` story + play test (asserts grip presence, drives the
  keyboard pin flow, and asserts the header actually becomes `position: sticky`); `WithControls` story added to
  `ColumnVisibility.stories`.
- **4. ChartCard accessible summary + ErrorState retry 44px:** `ChartCard` gained an optional `summary` prop — rendered
  `sr-only` with the visual `[data-slot="chart-viz"]` SVG set `aria-hidden` (screen-reader users get a meaningful data
  summary instead of the unlabeled recharts DOM); wired on the DashboardPage category chart. New `WithSummary` story +
  play (asserts the sr-only text and the `aria-hidden` chart). `ErrorState` retry button bumped from `size="sm"` (32px)
  to `min-h-11` (≥44px).
- **5. Page-error story retrofit** (debt from 009): listings/users/categories/locations LIST `Error` stories now drive a
  REAL `isError` branch via `seedQueryError` (moved to the shared listings `page-story-utils` as the single origin;
  messages + the 3 feature utils now re-export it), asserting `role="alert"` + a "Tekrar dene" retry button — instead of
  mirroring `Empty`. Every list vertical now has a genuine page-error story.
- Verification: lint PASS (0 errors; 13 pre-existing warnings — untouched files) · typecheck PASS · test PASS
  (860/860, 144 files) · build PASS (543 kB main) · build-storybook PASS.
- DoD self-check: ran the `dod-reviewer` agent → "Ready to commit: YES" with ONE blocking gap, FIXED before checkpoint:
  the new `ChartCard.summary` prop had no story coverage → added the `WithSummary` story + play. Applied non-blocking rec:
  isolated `ColumnVisibility` `WithControls` story. Independently re-verified green.
- Deferred (non-blocking, tracked with rationale):
  - **Generic `DataTableProps<TData, TMeta>`** (008 note): removing the `meta as Record` cast cleanly needs a
    `TableMeta` module augmentation that ripples through every typed column `meta`; low value / higher risk in a polish
    phase → deferred. The single `meta?: unknown` boundary cast remains.
  - **FieldHelp `aria-describedby` popover→field** (014 note): NOT changed — `FormField` (and the standalone
    CascadingSelect/LayoutDefaultsForm consumers) already wire `aria-describedby` to a PERSISTENT `sr-only` help node, so
    the field IS described. Pointing describedby at the popover (conditionally mounted) would create a dangling idref when
    closed — a regression. Convention already satisfies the intent.
  - **DATA_TABLE_SPEC point 4 right-pin:** only LEFT-pin is exposed in the UI (dominant real-world case); `columnPinning.right`
    state exists but no UI populates it. Add a "Sağa sabitle" item if any listing column needs it.
  - **Route `errorElement`** (reviewer flag): no boundary catches a failed dynamic `import()` (stale chunk hash after a
    redeploy) → today that surfaces as a blank render, not the app's `ErrorState`. Worth a small follow-up.
  - **OSM tile mock / configurable provider** (006 note): tiles still fetched live in stories/tests (green) — flagged for
    backend hardening.
- Suggested commit message:
  `perf(polish): route-level code-split + 44px touch targets, table column pinning/reorder, chart a11y, real page-error stories`

## 2026-07-25 Task 018 — Aşama 6: Kalite Agent'ları & Tooling
- **Config-only phase — ZERO `src/` changes** (verification stays green by construction). Touched only
  `.claude/agents/*`, `CLAUDE.md`, `docs/*`.
- Built: 4 project-specific **read-only** Tier-1 review agents under `.claude/agents/` (frontmatter + checklist +
  severity-tagged `file:line` output format; never edit files, never git-write):
  1. **design-token-guardian** (haiku) — Golden Rule 2 mechanically: hardcoded colors (hex/rgb/hsl/oklch) outside
     `src/styles/theme.css`, native `title=` help attribute, hardcoded shadows, raw magic spacing, sahibinden-v2
     palette/font/glass leaks.
  2. **a11y-sentinel** (sonnet) — WCAG 2.2 AA vs OUR conventions: ≥44px targets, `aria-describedby` field binding,
     color-not-sole-signal, Tooltip-not-`title`, focus management, roles/names, `prefers-reduced-motion`.
  3. **ux-design-critic** (sonnet) — heuristic design review: hierarchy, spacing rhythm, motion-token consistency,
     empty/loading/error polish, mobile ergonomics (320/480/768), cross-feature consistency, DESIGN_SYSTEM adherence.
  4. **dead-code-hunter** (haiku) — unused exports/files/deps + orphan stories via `npx knip`/`ts-prune`/`depcheck`
     on demand (NO permanent dep); verifies each candidate by grep, separates CONFIRMED from SUSPECTED.
- **Smoke-run (all 4 produced structured, actionable, severity-tagged `file:line` output):**
  - token-guardian (ran its greps directly): **CLEAN** — 0 hardcoded colors outside `theme.css`; 0 native `title=`
    on intrinsic elements (the 55 `title=` hits are legit component PROPS on EmptyState/ErrorState/ConfirmDialog/…).
    This smoke run REFINED checks #2 in token-guardian + #4 in a11y-sentinel to exclude that false-positive class.
  - a11y-sentinel (seeded into a general-purpose agent, since new agent types register only at session start):
    11 findings — 1 BLOCKER (`FilterBar.tsx` NL-filter raw Label+Textarea in a Popover, no `aria-describedby`) +
    10 WARN (sub-44px targets: radio-group 16px, DataTable reorder/resize/sort handles, pagination `size-8`
    overrides, BulkActionBar/FilterBar chip-remove buttons; two DatePickers without distinct names). Confirmed the
    exemplary paths (FormField/FieldHelp, TrustScoreMeter, VerificationBadges) pass.
  - ux-design-critic: strong actionable critique of `features/promotions` (High: PackageKindBadge borrows state
    colors for a taxonomy dimension; Mediums: PaymentDetail header echoes the `dl`, payments expand-row duplicates
    columns, bespoke NL parser vs shared `lib/ai`; consistency + empty-state notes).
  - dead-code-hunter (`npx knip`): 3 CONFIRMED dead (`src/app/pages/DemoPage.tsx`, devDep
    `@testing-library/user-event`, dep `@radix-ui/react-visually-hidden`) + ~113 tool-flagged exports correctly
    classified as known false positives (Zod schema-first exports, shadcn sub-exports, MSW registries, CSF re-exports).
- **Governance updated** (user authorized the loosening; must be in docs or the next session reverts to "forbidden"):
  `CLAUDE.md` Golden Rule 1 + `docs/DESIGN_SYSTEM.md` top note now read "**selective adaptation allowed, verbatim
  cloning forbidden**" — reference ideas may inspire interaction/layout, always re-derived in OUR OKLCH tokens/type
  scale/elevation; measured token-based transparency/blur allowed when it passes WCAG. Still never cloned: cream/brown
  palette, Inter/Lora/JetBrains trio, liquid-glass chrome.
- **Emoji cleanup:** repo-wide pictographic-emoji scan (excluding typographic arrows `→`) → **NONE remain** anywhere
  (`src/` + docs + configs). No-op — already clean.
- **`docs/AGENTS.md` roster written:** Tier-0 (dod-reviewer) + Tier-1 (the 4 new) + Tier-2 deferred (security-sentinel,
  code-standards-enforcer) tables, when-to-use, how they compose with dod-reviewer + the built-in `/code-review`/
  `/security-review`, scope-discipline note, and a future "release-readiness" parallel-fan-out Workflow idea.
- Verification: lint PASS (0 errors; 13 pre-existing warnings) · typecheck PASS · test/build UNCHANGED (no `src/`
  diff — last green at Task 017: test 860/860, build 543 kB). `git status -- src/` empty (proof of no code change).
- Decisions/assumptions:
  - Step 5 (optional Stop/pre-commit hook running token-grep + typecheck) **deferred to 019** per the task's
    "risk görülürse 019'a devret" — kept this phase config-only + green; a hook edits `settings.json` and is better
    validated alongside real code changes.
  - New `.claude/agents/*.md` register only at SESSION START, so the 3 judgment agents couldn't be invoked by type
    mid-session; smoke-run faithfully exercised each agent's exact prompt text by seeding it into a general-purpose
    agent. From the NEXT session they're callable directly as `subagent_type: <name>`.
  - Agent findings are INPUT for later phases, NOT fixed now (config-only phase): the a11y 44px/aria findings feed
    020 (mobil UX); the FilterBar BLOCKER + dead-code confirmations are tracked below.
- Tracked (feed into later phases, non-blocking):
  - **a11y (→ 020 mobil):** FilterBar NL-box `aria-describedby` BLOCKER; sub-44px targets across radio-group +
    DataTable handles + pagination/bulk `size-8` overrides + filter chip-remove; two unnamed DatePickers.
  - **dead code (→ any cleanup):** remove `DemoPage.tsx` (keep the `/ping` contract test pointing elsewhere or drop
    with it), devDep `@testing-library/user-event`, dep `@radix-ui/react-visually-hidden` — all 0-ref confirmed.
  - **ux (→ 022 / feature touch-ups):** PackageKindBadge state-color misuse; promotions NL parser → shared `lib/ai`.
- Suggested commit message:
  `chore(agents): add Tier-1 review agents (token/a11y/ux/dead-code) + AGENTS roster; governance: selective-adaptation`

## 2026-07-25 Task 019 — Aşama 6: Breakpoint Adopsiyonu + Responsive Re-audit
- Built: 8-token named breakpoint scale in `src/styles/theme.css` `@theme` (`--breakpoint-*`:
  xs320/sm480/md640/lg768/xl1024/2xl1280/3xl1536/4xl1920). In Tailwind v4 adding `--breakpoint-*` to `@theme`
  REPLACES the whole default scale (not just `lg`), so every default threshold shifts down one step
  (sm640→480, md768→640, lg1024→768, xl1280→1024, 2xl1536→1280). **Strategy A** — preserve every existing
  threshold by shifting each pre-existing responsive prefix UP one token so 640/768/1024/1280 stay put; the new
  `xs`(320)/`sm`(480) tokens are additive for future mobile work (020/021).
  - **Class-1 (shell/table 1024 convergence) `lg:`→`xl:`** (meaning-preserving): SidebarShell (aside reveal,
    main pb), TopnavShell (nav reveal, main pb), MobileNav (drawer trigger + bottom nav `xl:hidden`),
    TopbarActions (search label/kbd), AssistantDock (FAB bottom offset), DataTable (toolbar flex-row,
    desktop table `xl:block`, mobile cards `xl:hidden`). The sidebar/topnav ↔ drawer+bottom-nav and table ↔
    card switch stay at 1024 exactly.
  - **`md:`→`lg:`** (former 768 → new lg 768): Topbar breadcrumb reveal, TopnavShell secondary row reveal.
  - **`sm:`→`md:`** (former 640 → new md 640): mechanical prefix shift across ~28 non-story source files
    (detail/list metadata `grid-cols-3/4` definition lists, label reveals `inline`/`block`, `flex-row`,
    dialog/sheet `max-w-*`, pagination/breadcrumb/calendar/wizard reveals, FilterBar/ColumnVisibility/
    ExportMenu button labels). Done with a letter-following regex (`\bsm:(?=[a-z0-9\[])`) that skips the cva
    size-variant KEY `sm: '...'` in `button.tsx` (the `sm`/`lg` there are variant names, NOT breakpoints).
  - **Class-2 content-grid decisions** (reviewed one-by-one, each with a rationale comment in-file):
    - Dashboard KPI row `lg:grid-cols-4`→`xl:grid-cols-4` (4-up only at 1024): KpiCard value is
      `text-2xl tabular-nums`, unformatted/currency; 4-up at 768 left ~79px usable width and clipped 5-digit
      values (ux-critic High). 2-up on tablet portrait is roomy.
    - Dashboard charts row → `lg:grid-cols-2 xl:grid-cols-3` (bar+donut side-by-side ~360px at 768, 3-up at
      1024) — avoids a single 320→1024 column stranding the fixed-260px donut (ux-critic Medium/Low).
    - Dashboard panels row → `xl:grid-cols-3` (+ `xl:col-span-2`).
    - Reports KPI `lg:grid-cols-3 xl:grid-cols-6`→`lg:grid-cols-3 2xl:grid-cols-6`: 6-up returns to 1280
      (was silently pulled to 1024 by the token override → currency clip, ux-critic High); keeps the earlier
      3-up reflow at 768.
    - Reports breakdowns `lg:grid-cols-3`→`xl:grid-cols-3` (3 charts cramped at 240px on tablet).
    - Reports trends `lg:grid-cols-2` LEFT as-is (2 charts ~384px at 768 read cleanly — the reference pattern).
    - PageSkeleton inner padding `lg:p-6`→`xl:p-6` (Suspense fallback renders inside the `xl:pb-6` main; keeps
      loading/loaded padding aligned in the 768–1023 band; dod Blocking).
  - Storybook: `.storybook/preview.tsx` viewports aligned to the named scale — bpXs(320)/bpSm(480)/bpMd(640)/
    bpLg(768)/bpXl(1024), 360/414 phone widths kept. Added Tablet(bpLg)+Desktop(bpXl) convergence stories to
    AppShell, DataTable, ListingsListPage (+ Dashboard/Reports page stories) — the viewport IS applied in the
    vitest browser runner, so `getByRole`/`queryByRole` visibility (bottom nav / columnheader dropping out of the
    a11y tree at 1024 but present at 768) proves the 1024 switch point rather than just class-string matching.
  - Docs: `docs/DESIGN_SYSTEM.md` Breakpoints section rewritten to the 8-token scale + the "converge below xl
    (1024)" rule + the up-one-token shift note (GR1 source-of-truth). Stale JSDoc "below lg" comments fixed in
    AppShell/DataTable/MobileNav/SidebarShell/TopnavShell.
- Verification: lint PASS (0 errors; 13 pre-existing warnings) · typecheck PASS · test PASS (870/870, 144 files —
  run TWICE green for flake determinism) · build PASS (543 kB) · build-storybook PASS.
- DoD self-check: ran all four review agents (dod-reviewer + a11y-sentinel + ux-design-critic + design-token-guardian).
  design-token-guardian CLEAN; a11y-sentinel PASS (compiled CSS verified: `xl:*` classes emit under
  `@media (width>=1024px)`); ux-critic surfaced 2 High KPI-clip regressions (both FIXED, see Reports/Dashboard KPI
  above); dod-reviewer returned NO with 4 blocking gaps — ALL FIXED before checkpoint:
  (1) PageSkeleton `lg:p-6`→`xl:p-6`; (2) DESIGN_SYSTEM.md breakpoints section rewritten; (3) AppShell/DataTable
  stale "below lg" JSDoc → "below xl (1024)"; (4) **the uncaught collateral `sm:`/`md:` shift** — the token
  override moved sm 640→480 and md 768→640 for ~28 files that the task's `lg:`-only scan missed → resolved by the
  up-one-token shift (sm→md, md→lg) that preserves all original thresholds. Also applied the non-blocking dod
  recommendation (DataTable Tablet story now asserts real viewport visibility, not class strings).
- One flaky test surfaced under the added viewport-resize load: ReportsPage `Error` story's `findByRole('alert')`
  timed out past the 1000ms default on a loaded parallel run (green on retry). Hardened with `{ timeout: 3000 }` —
  deterministic across two full re-runs.
- Decisions/assumptions:
  - Chose to preserve every existing threshold via a mechanical +1-token prefix shift rather than let the scale
    override silently move sm/md/2xl thresholds — this fully honors Strategy A (no silent regressions) and reserves
    the new low-end tokens for the mobile phases. Net behavioral change from the collateral override: zero.
  - `button.tsx` `sm:`/`lg:` cva size KEYS were deliberately excluded from the sm→md remap (they name variants,
    not breakpoints); verified the button size API (`default/sm/lg/icon`) is intact post-remap.
  - The two `lg:flex` reveals in Topbar/TopnavShell are the former-`md` (768) breadcrumb + secondary-row reveals,
    NOT the shell nav switch (that is `xl:flex`) — 768 preserved on purpose.
  - Left Reports trends `lg:grid-cols-2` and the intentional progressive Reports KPI chain unchanged where they
    compute cleanly at 768; every content-grid choice carries an inline rationale comment.
- Tracked (feed into 020, non-blocking): 018 a11y smoke-run findings remain 020 scope (FilterBar NL-box
  `aria-describedby`, sub-44px radio-group/DataTable-handle/pagination/bulk targets, unnamed DatePickers);
  no list page passes `renderMobileCard` yet (all use the generic dl/dt/dd fallback) — 020's core work.
- Suggested commit message:
  `feat(responsive): 8-token breakpoint scale + Strategy-A remap (preserve 1024 convergence); tablet re-audit`

## 2026-07-25 Task 020 — Aşama 6: Mobil UX Düzeltmeleri
- Built: Shared `MobileListCard` helper (`components/data-table`; title/link → status badges → 2-up meta
  grid [`full` spans both cols] → optional actions slot; 44px checkbox from the Checkbox primitive so select
  + bulk keep working on phones; token-only). Wired `renderMobileCard` into ALL 9 list pages (listings, users,
  offices, categories, locations, messages/reports, promotions/payments, promotions/packages, audit) with a
  purpose-built, prioritized card each — the generic `dl/dt/dd` fallback is now dead on every list. Packages'
  card hosts the edit dialog (gated by `promotion.sell`); audit's card is select-less (no selection column).
  `DataTablePagination` compact mobile variant (`<sm` stacks; first/last page buttons collapse, a compact
  `x/y` counter + prev/next remain; page-size label hidden on phones). `KpiCard` value now `text-xl sm:text-2xl`
  + `truncate` (currency figures ellipsize instead of overflowing). Dashboard KPI grid `grid-cols-1 sm:grid-cols-2
  xl:grid-cols-4`; Reports KPI grid `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6` (1-up until 640
  so wide ₺ values keep width — ux-critic fix). Dialog mobile width `w-[calc(100%-2rem)]` + `max-h-[calc(100dvh-2rem)]`
  + `overflow-y-auto` (never touches edges / overflows on phones). RBAC matrix keeps its sticky-left permission
  column + horizontal scroll and now shows a `<xl` gesture hint (`role="note"`). Reports range Tabs stay
  `flex-wrap` (all 4 ranges visible, no overflow). DataTable loading skeleton is now shape-matched: desktop
  table skeleton (`xl:block`) + a MobileListCard-shaped card skeleton (`xl:hidden`). Density + column-visibility
  controls hidden below `xl` (they only drive the hidden desktop table).
- a11y (018/019 tracked BLOCKERs CLOSED): FilterBar NL textarea now has `aria-describedby` → a visible helper
  `<p>` (ids via `useId`, no collision); both date-range `DatePicker`s got `aria-label` (DatePicker now
  forwards `aria-label`); `RadioGroup` item gained the 44px `after:-inset-3.5` pseudo hit-area (Checkbox idiom);
  FilterBar chip-remove `×` got the same; `size-8` overrides dropped from BulkActionBar clear + all
  DataTablePagination icon buttons (default `size="icon"` = 44px); DataTable resize handle + reorder grip hit
  zones widened.
- Verification: lint PASS (0 errors; 13 pre-existing warnings) · typecheck PASS · test PASS (889/889, 145 files) ·
  build PASS · build-storybook PASS.
- DoD self-check: ran all 4 Tier-1 agents. design-token-guardian CLEAN. a11y-sentinel 0 BLOCKER / 3 WARN — all
  addressed: resize handle hit-zone widened (`after:-left-5`), reorder grip widened (`after:-inset-3`),
  MobileListCard `gap-3`→`gap-4` (kills the ~2px checkbox/title hit-area overlap). ux-design-critic: 1 High + 4
  Medium — High (mobile-shaped loading skeleton) FIXED; Medium density/colvis-hidden-on-mobile FIXED, RBAC hint
  breakpoint `md`→`xl` FIXED, Reports KPI 2-up moved to `md` FIXED; deferred (tracked): AiSuggestionBadge
  reasons are hover-only (pre-existing tooltip pattern shared across badges — fold into a tap Popover in the
  motion/interaction phase), KpiCard delta color asymmetry (pre-existing, Aşama 1), FilterBar toolbar wrap on
  320px pushing content down (follow-up). dod-reviewer initially NO (missing `KpiCard`/`DashboardPage` bpXs
  regression-guard stories) → both added (KpiCard long-value truncate assertion; Dashboard 1-up Phone story) →
  now Ready.
- Stories: `MobileListCard.stories` (Default/WithActions/ReadOnly + play); `bpXs` PhoneCard play stories on all 9
  list pages (assert the curated card renders + no accessible `columnheader` below xl); `bpXs`/`bpSm` compact
  stories on DataTablePagination; `bpXs` Phone stories on Dashboard, Reports, RBAC (scroll hint), Dialog,
  KpiCard. Viewport-driven visibility is really applied in the browser test runner (verified).
- Decisions/assumptions:
  - Reorder on mobile cards is intentionally omitted (categories/locations show the order number as meta);
    reordering is a desktop power-feature with a keyboard alternative — the card stays simple.
  - Resize handle / reorder grip target 24–38px (WCAG 2.5.8 AA), not a full 44px: a 44px target would swallow
    the adjacent sort button / neighbor column; both are desktop-only with keyboard alternatives.
  - MobileListCard checkbox uses the primitive's built-in 44px pseudo hit-area; `gap-4` (16px) ≥ the 14px inset
    so the hit-area no longer overlaps the title link.
- Suggested commit message:
  `feat(mobile): MobileListCard on all 9 lists, compact pagination, 1-up KPI, mobile dialog + a11y 44px/aria fixes`

## 2026-07-25 Task 021 — Aşama 6: Floating Command Dock + Launcher
- Built: A THIRD layout mode `dock` (behind a live feature flag), a chrome-light command-driven nav — no persistent
  sidebar/topnav; a floating **rich-glass** command dock top-center + a ⌘K **card-grid launcher**. Fed by the SAME
  `config/nav-schema.ts` as the other shells (Golden Rule 8). Pieces:
  - **Mode plumbing:** `LayoutMode` gains `'dock'` (`config/layout.ts` type + guard + settings `layoutModeEnum`).
    `AppShell` renders `DockShell` when the effective mode is `dock`, with a **flag fallback**: `dock` selected but
    `dockLayout` off ⇒ falls back to `sidebar` (existing modes never affected). `LayoutSwitcher` gains a flag-gated
    "Komut dock" option (hidden when `dockLayout` off) + a `LayoutGrid` trigger icon; `LayoutDefaultsForm` mode map
    gains `dock`. `.storybook/preview` layout toolbar gains a Dock item.
  - **DockShell** (`components/shell`): full-width content; floating `CommandDock` (xl+); below xl converges to a
    top command bar (drawer + Brand + search + notification bell + user menu) + the shared `MobileBottomNav`
    (Golden Rule 3). `main` gets `xl:pt-20` clearance under the floating dock.
  - **CommandDock:** top-center rich-glass pill (`max-w-[min(92vw,44rem)]`) — Arsam launcher (opens ⌘K,
    `aria-keyshortcuts`) + `ContextPill` + notification bell (flag-gated) + `UserMenu`. Desktop only; the mobile bar
    covers phones.
  - **ContextPill:** "Şu an: [üst ›] <aktif sayfa>" (mini-breadcrumb — parent renders as an up-a-level `Link` md+)
    + a live clock via injectable `useNow(injected?)` (`lib/shell/useNow.ts`; no timer when injected → deterministic
    tests) + pure `formatClock`.
  - **NotificationBell:** bell + count badge (aria-hidden; count folded into the button `aria-label`) + a Popover
    list (moderation summary + recent audit, deep-linked), with the mandatory skeleton/empty/error/populated states.
  - **CommandCardLauncher** (dock ⌘K): permitted module CARDS (icon + label + blurb + nested quick-action chips) +
    a module search + an **NL box** (FieldHelp + `aria-describedby`) that PROPOSES a navigate/filter intent applied
    only on confirm (guardrail); write-class (bulk) intents hand off to the AI assistant's confirm flow. Quick
    actions grouped (Genel / Görünüm / Tema). `CommandLauncher` is the shared entry: `variant='cards'` (dock) vs
    `'list'` (the unchanged `CommandPalette` for sidebar/topnav — zero regression).
  - **Notifications feature** (`features/notifications`): PURE `deriveNotifications(listings, audit)` (moderation
    summary item with badge = pending count + recent audit deep links via `auditResourceRoute` + Turkish
    `formatAuditTitle`), `GET /notifications` MSW handler reading the EXISTING mock DB (`getListingsSnapshot()` +
    `getAuditLog()`) — no new source of truth, `useNotifications` query, registered in the MSW registry.
  - **Rich-glass tokens:** `--glass` / `--glass-foreground` / `--glass-border` (`:root` + `.dark`, 0.9-opacity base
    so opaque foreground keeps AA over blur) + `@theme` `--color-glass*`; documented in `DESIGN_SYSTEM.md`. Used as
    `bg-glass text-glass-foreground border-glass-border` + `backdrop-blur` — chrome only, never on content cards.
  - **Feature flags:** `dockLayout` + `notificationCenter` added to the 015 catalog (defaults true); live on/off via
    the settings screen; when off the dock/bell disappear and sidebar/topnav are untouched.
  - **nav-schema:** each of the 10 top-level modules gains a short Turkish `description` (surfaced on the launcher
    cards) — single source of truth.
- Stories/tests: full-DoD stories for DockShell (Desktop/Tablet/Phone/SmallPhone), CommandDock (Default +
  NotificationsOff), ContextPill (Default/Nested/Mobile), NotificationBell (Default/Empty/Loading/Error/Mobile),
  CommandCardLauncher (Default/NaturalLanguage/Search/EmptySearch/Mobile), CommandLauncher (List/Cards); AppShell
  gains Dock + DockFlagOff (proves the sidebar fallback); LayoutSwitcher gains Dock + DockFlagOff (proves the option
  vanishes). Pure `deriveNotifications`/`auditResourceRoute`/`formatAuditTitle` unit tests + a `/notifications`
  handler test (payload derived from the live mock DB). Deterministic clock injected everywhere.
- Verification: lint PASS (0 errors; 13 pre-existing warnings) · typecheck PASS · test PASS (923/923, 153 files) ·
  build PASS · build-storybook PASS. (One full-suite run showed transient timeout flakes in UNRELATED pre-existing
  `Error` stories under heavy concurrent agent load; a calm re-run is 923/923 green.)
- DoD self-check: ran all four Tier-1 agents. **design-token-guardian:** CLEAN. **a11y-sentinel:** 1 BLOCKER
  (CommandCardLauncher chips/buttons `min-h-8/9` < 44px) → all bumped to `min-h-11`; 1 WARN (`--glass-border` < 3:1
  vs near-white bg, SC 1.4.11) → darkened/denser border (light 0.82L/0.9α, dark 0.42L/0.85α), shadow-lg documented
  as the primary edge cue. **ux-design-critic:** 2 High (no `UserMenu` reachable in dock → added to dock + mobile
  bar; `ContextPill` lost breadcrumb up-nav → parent now a `Link`) + Mediums (quick-actions grouped; dock pill
  `max-w` guard; added ContextPill story) + Lows (kbd `bg-background/40`; lighter first separator) — all applied.
  **dod-reviewer:** initially NO (no story proved flag-OFF behavior; LayoutSwitcher stories not updated;
  ContextPill unchecked `as` cast) → added DockFlagOff/NotificationsOff/EmptySearch/CommandLauncher stories,
  replaced the cast with a `hasRouteMeta` guard at the use site → **re-verified Ready to commit: YES**.
- Decisions/assumptions:
  - Notifications go through an MSW endpoint + TanStack Query (app convention) rather than reading the in-memory
    snapshot directly from the hook — the derivation stays PURE + unit-testable, the endpoint just feeds it the live
    mock DB (task's "no new source of truth" honored).
  - The launcher NL box intentionally handles only navigate/filter (non-write) inline; bulk/write intents are handed
    to the existing AssistantPanel confirm flow rather than duplicating the queue+ConfirmDialog wiring.
  - `useNow` uses `new Date()` in app code (allowed; only workflow scripts ban argless `new Date()`); stories/tests
    inject a fixed clock so the dock time is deterministic.
  - Both dock/notification flags default ON (consistent with the other catalog flags) — the flag-OFF path is proven
    by dedicated stories, not left to code reading.
  - Rich glass is CHROME ONLY (dock/launcher/notification/mobile bar); content cards stay opaque per DESIGN_SYSTEM.
- Suggested commit message:
  `feat(dock): third `dock` layout — floating rich-glass command dock + card-grid launcher + notification center (flag-gated)`
- Follow-up (same task, post-review, user request): the dock's MOBILE chrome was a full-width sticky command bar;
  the user wanted it to read like the reference's floating capsule. Reworked `DockShell` so below `xl` it renders a
  **floating rounded rich-glass command pill** (`fixed inset-x-4 top-3 rounded-full bg-glass backdrop-blur`) — Arsam
  launcher (opens the ⌘K card grid) + notification bell (flag) + `UserMenu`. Dropped the mobile hamburger drawer in
  dock mode (full nav is already reachable via the card-grid launcher + bottom nav, so the drawer was redundant);
  `main` now clears the floating pill with `pt-20` at all sizes. Interaction/interpretation only — still OUR tokens,
  no reference clone (no serif/cream/liquid-glass). Story: DockShell `Phone` now asserts the pill launcher + bottom
  nav. Re-verified: lint·typecheck·test(923/923)·build·build-storybook green. NOTE: the reference's richer feel
  (serif greeting, bento sparkline cards, personalized header) is deliberately deferred to **Task 022 (Motion &
  Bento)** and/or excluded by Golden Rule 1 (serif/cream/liquid-glass never cloned).

## 2026-07-25 Task 022 — Aşama 6: Motion & Bento (SON faz)
- Built: brought the dormant motion tokens to life + gave the dashboard a bento layout, all token-driven and
  reduced-motion-safe.
  - **Motion primitives** (`src/styles/theme.css`): `@keyframes fade-in / fade-in-up / scale-in` (transform+opacity
    only, GPU-cheap) + `--animate-fade-in* / --animate-scale-in` tokens (composed from `--duration-*`/`--ease-*`,
    `both` fill so start-state paints before the frame — no flash); `.card-interactive` hover-lift class
    (`transform: translateY(var(--lift-y)) + var(--shadow-md)`, `var(--duration-fast)`/`var(--ease-standard)`);
    `.stagger-children` utility (per-child `animation-delay: calc(var(--stagger-step) * n)`, capped at 8). New
    `--lift-y` / `--stagger-step` tokens. Base-layer reduced-motion rule EXTENDED to also zero `animation-delay` /
    `transition-delay` (so staggered children don't sit invisible during a delay under reduced motion) and
    `.card-interactive:hover { transform: none }` under reduced-motion (shadow still deepens, no positional motion).
  - **`Card interactive` variant** (cva, `src/components/ui/card.tsx`): hover-lift + `focus-within` ring + cursor;
    scoped ONLY to clickable cards. Applied to the dashboard quick-access tiles (stretched-link `after:absolute
    inset-0` pattern; `min-h-11` 44px targets).
  - **`KpiCard` sparkline + delta** (`src/components/data/KpiCard.tsx`): optional `trend` → ~40px recharts area
    sparkline (chart-1 token, no axes, `isAnimationActive={false}`, `aria-hidden`); delta is a symmetric tinted pill
    (tint + arrow icon + explicit `+`/`−` sign → color never the sole signal). `DashboardStats` gained a deterministic
    `trends` series via a pure `makeTrend()` (no Date/random).
  - **Bento dashboard** (`DashboardPage.tsx`): ONE responsive grid — mobile 1-up / `lg` (768) 2-up / `xl` (1024) 4-up
    with span-1/span-2 tiles that pack gap-free into rows of 2 and 4 (KPI band, category chart span-2, donut span-2,
    pending queue span-2, recent decisions span-1, quick-access span-1). Entrance via `.stagger-children` + header
    `animate-fade-in`. Grid bumped to `gap-4` (heavier chart tiles). Deltas intentionally DROPPED from the live KPIs
    (a signed % needs a real prior-period baseline the mock lacks; the sparkline carries the direction-neutral trend).
  - **Shape-matched skeletons** (`src/components/data/ChartSkeleton.tsx` new): `ChartSkeleton` (bar silhouette) +
    `DonutSkeleton` (ring + legend lines); `ChartCard`/`DonutChartCard` gained a `loading` prop.
  - **`AiSuggestionBadge`** (020 tracked): hover-only Tooltip → tap/keyboard `Popover` (real `<button>` via Badge
    `asChild`, `aria-label`, no `title`), with an invisible `after:-inset-3` hit-area expander to clear 44px.
- Verification: lint PASS (0 errors; 13 pre-existing warnings) · typecheck PASS · test PASS (926/926, 153 files) ·
  build PASS · build-storybook PASS.
- **4 review agents run, all blockers closed before checkpoint:**
  - `design-token-guardian`: CLEAN (token-only motion/shadow/color enforced).
  - `ux-design-critic`: 2 High (no dashboard error state → confident zero-state on fetch failure; hardcoded deltas
    disconnected from the shown trend) + 3 Medium (empty-state inconsistency, gap rhythm, KPI-reflow comment) — ALL
    FIXED: added real `isError`→`ErrorState` branch, dropped the fake deltas, unified `EmptyState`, bumped to `gap-4`,
    added the reflow rationale comment. Follow-ups (extend motion vocab app-wide; KPI-tile density) noted below.
  - `a11y-sentinel`: 1 BLOCKER (negative delta pill `text-destructive` on `bg-destructive/10` = 4.07:1 light /
    3.76:1 dark, fails AA — the pos/neg asymmetry persisted) + 2 WARN (touch targets) — ALL FIXED: added a dedicated
    `--destructive-tint-foreground` on-tint token (light `oklch(0.45 0.18 27)` / dark `oklch(0.8 0.14 27)`), verified
    6.99:1 light / 7.17:1 dark via OKLCH→sRGB WCAG math (symmetric with the positive branch's 7.15:1); added the badge
    hit-area expander + quick-tile `min-h-11`.
  - `dod-reviewer`: 1 BLOCKER (badge hit area still ~42px at `-inset-2.5`) — FIXED (`-inset-3` → ~46px) + added a
    `getBoundingClientRect` touch-target assertion to the `TapReasons` play so the inset can't silently regress.
    Re-verified green. Ready to commit: YES.
- **Stories**: real result-state (not motion-duration) play tests — Card `Interactive`, KpiCard `Sparkline`,
  ChartCard/DonutChartCard `Loading` (assert real skeleton slots), AiSuggestionBadge `TapReasons` (portal-aware +
  touch-target), DashboardPage `Loading`/`Empty`/`Error` now drive the REAL query states via a new
  `seedQueryLoading` helper in `page-story-utils` (mirrors the existing `seedQueryError`).
- Decisions/assumptions:
  - Motion stays "enterprise-calm": durations `fast`/`base`/`slow` only, transform+opacity keyframes, sparkline
    animation off. `prefers-reduced-motion` is honored centrally (base layer) + the card transform override.
  - New `--destructive-tint-foreground` token deliberately mirrors the `--success-foreground`/`--warning-foreground`
    "on-tint readable text" family — `--destructive-foreground` stays the on-solid white and was NOT changed.
  - Live dashboard KPIs show sparkline + hint but NO delta pill (honest-data restraint); the delta pill feature +
    AA-symmetric colors are fully exercised by the KpiCard stories.
  - Reduced-motion base rule now also zeroes delays — a general correctness fix, not just for this task's stagger.
- Tracked non-blocking follow-ups (out of scope, for a later pass): (1) motion vocabulary (`animate-fade-in` on page
  headers, `card-interactive` on genuinely-clickable summary cards) is only on the dashboard so far — extend app-wide
  so it reads as a system decision; (2) KpiCard right-column stacks icon+sparkline+delta — consider dropping the icon
  when a sparkline is present, or a full-width sparkline strip, at a later visual polish pass; (3) bento is a true
  mosaic only at `xl` — at `lg` the three heavy tiles stack full-width (acceptable, documented).
- Suggested commit message:
  `feat(motion): entrance/hover motion tokens + bento dashboard, KpiCard sparkline, tap-accessible AI reasons`

## 2026-07-25 Task 023 — Aşama 6 sonrası: Motion follow-up polish
- Built: closed the three non-blocking follow-ups `ux-design-critic` raised on Task 022.
  - **Motion vocab app-wide**: `animate-fade-in` added to the `<header>` of all 14 top-level feature pages
    (reduced-motion-safe via the existing token + base-layer rule). `card-interactive` deliberately NOT spread
    beyond the dashboard quick-access tiles — the app is table-centric and the remaining card surfaces (moderation
    queue cards, mobile list cards) are MULTI-action (link + approve/reject / checkbox + actions), so a whole-card
    hover-lift implying a single click target would be misleading. (ux-critic confirmed no other genuine single-click
    navigational card exists; the one CommandCardLauncher inconsistency it found is a prior dock commit → Task 024.)
  - **KpiCard density**: sparkline moved from the cramped right column (icon+sparkline stack) to a full-width bottom
    strip (~32px, chart-1 token, aria-hidden) — reads cleaner. Added `reserveSparkline` prop: reserves the strip
    height while `loading` so a trend-bearing card doesn't jump ~32px when data lands (dashboard's 4 KPIs set it;
    Reports' trend-less KPIs don't).
  - **Bento `lg` mosaic**: `DonutChartCard` legend layout switched from viewport `md:flex-row` to a container-query
    (`@container` on CardContent + `@[26rem]:flex-row`) so the donut stacks (ring over legend) in a narrow column
    instead of overflowing. Dashboard bento: category chart + donut now span-1 at `lg` (side-by-side 2-col mosaic),
    span-2 half-width at `xl`. Added `items-start` to the grid so the fixed-height bar chart isn't force-stretched to
    the taller stacked-donut's height (top-aligned varied heights = intentional bento, no dead-space-in-card).
- Verification: lint PASS (0 errors; 13 pre-existing warnings) · typecheck PASS · test PASS (928/928, 153 files) ·
  build PASS · build-storybook PASS. (Note: full `npm run test` occasionally shows a transient first-run failure from
  Vite dep pre-bundle re-optimization when new recharts/container-query graph lands; the storybook project alone and
  the warm re-run are green — the documented cold-start optimizer race, not a real failure.)
- **4 review agents, all blockers closed:**
  - `a11y-sentinel`: PASS, 0 findings (header fade-in reduced-motion-safe + no flash-of-invisible-content; sparkline
    stays decorative; container-query is layout-only).
  - `design-token-guardian`: CLEAN (only new "magic" value is the intentional 26rem container-query threshold).
  - `ux-design-critic`: 1 High (bento height mismatch — donut stacks taller than the fixed-height bar chart, grid
    `stretch` left dead space) → FIXED with `items-start`; 1 Medium (KPI loading layout-shift) → FIXED with
    `reserveSparkline`; 1 Medium (CommandCardLauncher module-card affordance inconsistency) → OUT OF SCOPE (prior dock
    commit), deferred to Task 024.
  - `dod-reviewer`: Ready to commit YES, no blockers; 4 story-coverage recommendations (the Step-4 stories the plan
    promised) — ALL closed: KpiCard `LoadingReserved` (asserts the reserved placeholder via new
    `data-slot="kpi-sparkline-skeleton"`), DonutChartCard `NarrowColumn` (asserts stacked `flex-direction: column`
    below 26rem via new `data-slot="donut-layout"`), DashboardPage `Tablet` play + refreshed stale JSDoc.
- Decisions/assumptions:
  - `items-start` over shrinking the donut: keeps the ring readable; varied top-aligned heights are the point of a
    bento. The donut's container-query stacking is what makes the narrow-column pairing safe (no overflow).
  - `reserveSparkline` is opt-in (not automatic) because KpiCard can't know during `loading` whether a trend will
    arrive (trend is derived from not-yet-loaded stats); the caller declares intent.
  - Removed a stray arbitrary container-query class literal (an at-bracket variant with a placeholder length) from the
    new task markdown — Tailwind v4 scans `docs/`, and the
    invalid arbitrary value broke the lightningcss CSS minify step. (Root cause noted for Task 025's report HTML:
    scope Tailwind sources away from `docs/` there.)
- Suggested commit message:
  `polish(motion): fade-in page headers, KpiCard sparkline strip, lg bento mosaic (container-query donut)`

## 2026-07-25 Task 024 — Dock pulse (reference "heartbeat" launcher) + deferred 023 fix
- Built: integrated the reference dock's "living launcher" feel — a subtle breathing pulse on the Arsam command-launcher
  logo — with OUR tokens, scoped to `dock` mode, plus the CommandCardLauncher affordance-consistency fix deferred from 023.
  - **Motion** (`theme.css`): `pulse-soft` keyframe (0%/100% scale(1), 50% scale(1.06) — symmetric, no residual transform)
    + `--animate-pulse-soft` token (2.6s, new symmetric `--ease-in-out`). FINITE: `3` cycles then rests, NOT `infinite` —
    every other motion in the system is finite/state-triggered, and a forever-looping chrome element is both an
    enterprise-calm distraction and an SC 2.2.2 (pause/stop/hide) risk for users who haven't set OS reduced-motion.
  - **`DockLogo`** (new component + story): decorative round launcher logo (`animate-pulse-soft` +
    `motion-reduce:animate-none` + `aria-hidden`). Replaces the inline hexagon badge in `CommandDock` (desktop, size-7)
    and `DockShell` (mobile pill, size-8). The pulse is STRUCTURALLY dock-only (these components render only in dock mode)
    — no runtime flag needed. Golden Rule 1: our own subtle scale, NOT a clone of the reference glass/glow/palette.
  - **CommandCardLauncher affordance split** (023 deferral): leaf (childless) module cards now use the shared
    `Card interactive` hover-lift + stretched-link (`after:inset-0`) — same grammar as the dashboard quick-access tiles;
    parent cards (with child quick-action chips) stay plain color-hover, since a whole-card lift would falsely imply a
    single click target. Radius/border aligned (rounded-xl + border-border/60) so only the hover treatment differs.
  - **Build stability** (`theme.css`): `@source not "../../docs"` — Tailwind v4 auto-scans the repo including docs/, and a
    utility-like `@[…]` container-query example in a task note was compiling into invalid CSS and breaking the lightningcss
    minify step. Report/docs HTML carries its own styling, so scoping detection to app source is correct (unblocks Task 025).
- Verification: lint PASS (0 errors; 13 pre-existing warnings) · typecheck PASS · test PASS (931/931, 154 files) ·
  build PASS · build-storybook PASS.
- **4 review agents, all findings closed:**
  - `a11y-sentinel`: PASS, 0 blockers; 1 advisory WARN (infinite animation vs SC 2.2.2) → CLOSED by switching to finite
    3-cycle. Verified DockLogo aria-hidden + button accessible name intact + leaf stretched-link keyboard-safe.
  - `design-token-guardian`: CLEAN (Golden Rules 1 & 2; motion via tokens; no reference clone).
  - `ux-design-critic`: 1 Medium (infinite loop — only continuous animation in the system, calm/fatigue concern) → FIXED
    (finite settle); 3 Low → 2 FIXED (parent card rounded-xl + border-border/60 to match leaf/dashboard), 1 non-fix note
    (redundant-but-harmless motion-reduce class).
  - `dod-reviewer`: Ready to commit YES, no blockers; 1 minor strictness finding (`mod.children!` non-null assertion,
    banned by CLAUDE.md) → FIXED (destructure `children = mod.children ?? []`, TS narrows without `!`).
- Decisions/assumptions:
  - Finite 3-cycle over infinite: still delivers the "living launcher" on mount / mode-switch (the shell persists across
    route changes, so it pulses once when entering dock mode) without a session-long ambient loop. If the user wants a
    truly continuous heartbeat, it's a one-line token change (`3` → `infinite`) — surfaced to them.
  - DockLogo skips Loading/Empty/Error stub stories — it's a purely decorative atom with no data states, consistent with
    the ContextPill precedent; dod-reviewer confirmed coverage PASS.
- Suggested commit message:
  `feat(dock): breathing launcher pulse (dock-only, finite) + leaf-card interactive affordance; scope Tailwind off docs`

## 2026-07-25 Task 024 — Hotfix (CI build red + tsconfig deprecation)
- **CI build was failing on the committed Task 023 (acebf2c):** the Task-023 PROGRESS checkpoint text literally contained
  an `@`-bracket container-query class example, and Tailwind v4 auto-scans `docs/`, so it compiled that placeholder into
  an invalid `@container (width >= …)` rule that the lightningcss minify step rejected — but the `@source not "../../docs"`
  fix that resolves it only lived in the (then-uncommitted) Task-024 working tree. Two-layer fix, both now in the tree:
  (1) `@source not "../../docs"` in `theme.css` (scopes Tailwind class detection to app source), and (2) reworded the
  PROGRESS.md line so no `@`-bracket literal remains anywhere under `docs/` (belt-and-suspenders). `npm run build` green.
- **tsconfig deprecation (editor red on tsconfig.app.json):** `"baseUrl": "."` is deprecated and removed in TS 7. Dropped
  it from BOTH `tsconfig.app.json` and `tsconfig.node.json`; `paths` (`@/*` → `./src/*`) now resolves relative to each
  config's location (bundler moduleResolution). typecheck + build + 931/931 tests still green.
- Full CI parity re-run locally (mirrors quality.yml): lint 0-error · typecheck · test 931/931 · build · build-storybook
  — all green. Committing the current working tree makes the GitHub `Quality` workflow pass again.

## 2026-07-25 Task 024 — Pulse: finite → continuous heartbeat (user decision)
- The finite 3-cycle settle pulse was invisible in practice: it only played on mount and had already ended by the time
  the user looked at the live dock. The user explicitly wants a visible, continuous heartbeat (the reference's "living"
  launcher). Product-owner decision overrides the agents' "enterprise-calm / SC 2.2.2" preference for finite.
- Reworked `pulse-soft` into a real heartbeat (lub-dub): keyframe 12% scale(1.12) [strong beat], 26% scale(1.04) [lighter
  second beat], 0/40/100% scale(1) [rest] — over 1.8s, `infinite`. Clearly visible (1.12 peak) with a lifelike beat-then-
  pause rhythm. `--animate-pulse-soft: pulse-soft 1.8s var(--ease-in-out) infinite`.
- Accessibility is still fully preserved: `motion-reduce:animate-none` on DockLogo + the base-layer reduced-motion rule
  disable it entirely for users who set OS reduced-motion; the keyframe starts/ends at scale(1) so no residual transform.
  The SC 2.2.2 (pause/stop/hide) advisory is a conscious, documented risk-acceptance at the user's request.
- Verified: typecheck clean · DockLogo story green (asserts the animate-pulse-soft class, motion-independent) · build green.
- If a calmer feel is ever wanted again: lower the 1.12 peak and/or switch `infinite` → a finite count in the token.

## 2026-07-25 Task 025 — Edge nav dock (macOS-style magnifying dock, referans esinli)
- Built: the reference (sahibinden-v2 `GlassDock`/`GlassDockVertical`) macOS-style magnifying edge dock, reinterpreted
  in OUR `--glass*`/motion tokens (Golden Rule 1 — NOT the liquid-glass clone). `EdgeDock` renders up to 3× in DockShell
  (bottom/left/right), each independently flag-gated (`edgeDockBottom`/`edgeDockLeft`/`edgeDockRight`), desktop AND mobile,
  dock-layout only. (Heavily iterated with the user against the live reference.)
  - **Collapsed:** a 44px hit-box hint button (holds the focus ring, never fades) wrapping a slim glass bar that PULSES
    (heartbeat `animate-pulse-soft`, per-edge phase offset, `motion-reduce`-safe, origin puffs inward from the edge) and
    fades to `opacity-0` when open (no grey tab lingers). Insets 1 off the true edge to avoid OS edge-swipe zones.
  - **Open (hover / keyboard-focus / Enter / tap):** the stage (`inert` when closed) slides in. **Bottom** = magnifying
    dock — icons scale toward the cursor (cosine proximity falloff derived directly from the pointer; CSS-transition
    smoothed, no rAF loop); the glass pill stays STABLE (resting-width track + centered `offset`, magnified icons overflow).
    **Left/right** = vertical dock with a sliding highlight + hover scale.
  - **Module-name label** (aria-hidden decorative, `animate-fade-in`) driven by BOTH mouse-proximity AND keyboard focus.
  - Nav = permitted primary modules (`usePrimaryNav(5)`, RBAC) + ⌘K "all" (opens CommandCardLauncher); active route
    `aria-current` + `bg-primary/15`. Close: mouse-leave (focus outside) / Escape (restores focus) / focus-out / nav-pick.
  - **AppShell:** MobileBottomNav now renders ONLY in non-dock modes; dock mode navigates via the pill + edge docks + ⌘K.
- Verification: lint PASS (0 errors; 13 pre-existing warnings) · typecheck PASS · test PASS (938/938, 155 files) ·
  build PASS · build-storybook PASS. (Intermittent full-suite browser-test flake — 1–3 stories, different each run,
  all pass in isolation and on warm re-run; pre-existing env concurrency race, not a regression.)
- **4 review agents, all findings closed:**
  - `design-token-guardian`: CLEAN (our OKLCH glass + motion tokens; no liquid-glass/`--glass-tint`/SVG-distortion clone).
  - `a11y-sentinel`: 2 BLOCKER → FIXED — (1) hint faded to opacity-0 while focused, killing the focus ring → ring now
    lives on the never-fading 44px button, only the inner bar fades; (2) 40px/24px touch targets → BASE=44 + a 44px hint
    hit box. 1 WARN → FIXED — hover-only `role="tooltip"` labels → aria-hidden decorative + keyboard-focus-driven.
  - `ux-design-critic`: 2 High → FIXED — (1) the magnify pill's box breathed/recentered every mousemove → resting-width
    track + centered offset (only icons breathe, pill is stable); (2) hint flush on the device edge vs OS gestures →
    inset-1. 2 Medium → FIXED (label entrance `animate-fade-in`; bottom pulse phase de-synced from DockLogo). Lows: pulse
    origin fixed; separate quieter amplitude + label padding left as deliberate.
  - `dod-reviewer`: 2 BLOCKER → both FIXED — (1) the AppShell `MobileBottomNav` dock-mode gate had no coverage → added
    an `AppShell` `DockMobile` story (dock layout + phone viewport) asserting NO "Alt gezinme" bottom nav + the command
    pill launcher + edge-dock hints present; (2) `DockShell.stories` decorator force-mounted `MobileBottomNav` with a now-
    false comment and Tablet/Phone asserted the bottom nav → dropped the forced nav, fixed the comment, and Tablet/Phone
    now assert the pill + `queryByRole('Alt gezinme')` is null + edge docks present. Recommendations applied: task-file
    checklist synced to "desktop+mobile / per-edge flags", EdgeDock story `!`-assertion replaced with an instanceof guard.
    Re-verified green. Ready to commit: YES.
- Decisions/assumptions:
  - The reference effect is a macOS magnifying dock (proximity magnification), NOT a heartbeat — the heartbeat lives on
    the COLLAPSED hint tab (user's explicit request), the magnify on the OPEN dock.
  - Same nav on all three edges (one `usePrimaryNav` source); handle/stage `inert` + DOM order keep tab order correct.
  - Magnification is a mouse affordance; touch/reduced-motion render a calm static dock (no magnify, no pulse).
- Suggested commit message:
  `feat(dock): macOS-style magnifying edge nav docks (collapsed heartbeat tab → magnify on open, labels, per-edge flags)`

## 2026-07-25 Task 026 — Manager report (`docs/report.html`)
- Built: a single-file, self-contained, executive-summary-weighted report of the whole product at `docs/report.html`
  (+ task file `docs/tasks/026-manager-report.md`). Lives in the repo (NOT a Claude Artifact) so Task 027 can serve it
  at `/report`. Carries its OWN styling — an inline `<style>` re-deriving the Calm Signal palette via `oklch()` custom
  properties (indigo primary / teal accent / slate charts), NOT the app's Tailwind build. Tailwind already scopes class
  detection away from `docs/` (`@source not "../../docs"`, Task 024), so the report does not reintroduce app-CSS coupling.
  Theme-aware (light/dark via `prefers-color-scheme` + a manual toggle persisted in localStorage), responsive (sticky
  top bar, wrapping metric/module/card grids, mobile nav collapse), reduced-motion safe. Sections: hero + exec summary →
  at-a-glance metrics → capabilities → 12-module grid → 3 layout modes + edge dock/heartbeat → Calm Signal design system
  (live OKLCH swatches, typography, motion) → AI-first + RBAC/audit → quality process (5 review agents + verification
  pipeline + DoD) → tech stack → roadmap timeline.
- REAL data only (counted from the repo, no fabrication, no production-data claims): 12 feature modules · 938 tests /
  155 test files · 133 Storybook story files · 56 UI primitives · 5 roles / 15 permissions · 5 review agents · 3 layout
  modes · Calm Signal / 8-token breakpoints / WCAG 2.2 AA / 0 lint errors. No impersonation — our own work-product.
- Verification: `npm run build` PASS (typecheck + build green; docs/ not scanned by Tailwind, no regression). Rendered
  headless (playwright-core, real Chromium) in BOTH light and dark at desktop 1200px + mobile 390px → **0 console errors**,
  no external network requests, all four screenshots clean.
- Decisions/assumptions:
  - Fonts use a system stack (not the app's self-hosted Geist) to keep the file truly self-contained/offline; the report
    is a repo HTML artifact, not the app, so font parity is intentionally not required.
  - Numbers are capabilities/coverage facts only; mock/seed row counts (e.g. demo payments/reports) are deliberately NOT
    surfaced as marketplace figures to avoid implying production data.
  - Report is NOT published as a Claude Artifact (per the task): it is a plain repo file for the Pages deploy in Task 027.
- Suggested commit message:
  `docs(report): self-contained executive report (docs/report.html) — Calm Signal styling, real repo metrics`

## 2026-07-25 Task 027 — GitHub Pages deploy (app + Storybook + report)
- Built: one-site GitHub Pages deploy publishing all three surfaces under
  `https://aliiball.github.io/Arsam.net-admin-panel/`: `/` (the admin panel, mock-only demo), `/storybook/` (static
  Storybook), `/report.html` (Task 026 executive report). Deploy plumbing only — ZERO feature/component work.
- Runtime changes to make a `/`-assuming SPA work from a `/<repo>/` project-pages subpath:
  - `vite.config.ts` — `base: process.env.APP_BASE ?? '/'` (env-driven, NOT coupled to Vite `command`, so the Storybook
    build — which also runs Vite in build mode and merges our config — stays at `base:'/'` unless `APP_BASE` is exported;
    it is scoped to the app build step only).
  - `src/app/router.tsx` — `basename` derived from `import.meta.env.BASE_URL` (trailing slash stripped, `'/'` fallback
    for dev), passed to `createBrowserRouter` (DATA mode preserved — no HashRouter).
  - `src/main.tsx` — MSW now runs in dev AND in the static Pages build (mock-only demo, no backend); skipped only under
    `MODE==='test'` (unit tests never import this entry). The msw chunk is lazy `import()`-ed, so no initial-bundle bloat.
  - `src/lib/msw/browser.ts` — `serviceWorker.url = \`${import.meta.env.BASE_URL}mockServiceWorker.js\`` (dev BASE_URL is
    `/` → unchanged `/mockServiceWorker.js`; under Pages → base-prefixed so the SW resolves + scopes correctly).
  - `package.json` — added `"preview": "vite preview"` for local base-path verification.
- `.github/workflows/pages.yml` (NEW): checkout → setup-node 22 (npm cache) → `npm ci` → build app with
  `APP_BASE=/${{ github.event.repository.name }}/` (dynamic repo name, no hardcode/case-mismatch risk) → build Storybook
  into `dist/storybook` (NO APP_BASE — Storybook static output uses relative asset URLs, works under `/storybook/`) →
  `cp docs/report.html dist/report.html` + `cp dist/index.html dist/404.html` (SPA deep-link fallback; Vite emits
  absolute base-prefixed asset URLs so the copy boots at any path, browser URL preserved, React Router routes it — no
  redirect hack) + `touch dist/.nojekyll` → `configure-pages` → `upload-pages-artifact` → separate `deploy` job with
  `deploy-pages@v4`. Least-privilege `permissions` (contents:read, pages:write, id-token:write, OIDC, no PAT);
  `concurrency: pages` with `cancel-in-progress:false` (never abort an in-flight publish).
- Verification: lint 0-error (13 pre-existing warnings) · typecheck PASS · test 939/939 (155 files) on the WARM run —
  the first run showed the documented 5-fail cold browser dep-prebundle/instrumenter env-flake, green on warm re-run ·
  `npm run build` PASS for BOTH `base:'/'` (default) and `APP_BASE=/Arsam.net-admin-panel/` (verified index.html emits
  base-prefixed asset URLs) · `build-storybook -o dist/storybook` PASS (relative asset URLs confirmed) · assembled the
  full `dist/` (report + 404 + .nojekyll). Runtime-verified by serving the assembled `dist/` via `vite preview` at the
  base path and driving headless Chromium (Playwright): (1) app boots + dashboard renders, (2) deep-link `/listings`
  renders MSW-served rows — proving basename routing AND MSW-in-prod both work, (3) `/storybook/` loads, (4)
  `/report.html` loads — all 4 PASS, 0 console errors. `curl` confirmed 200 for `/…/`, `/…/storybook/`, `/…/report.html`,
  `/…/mockServiceWorker.js` (root `/` → 302 to base, expected under preview).
- DoD self-check: ran the `dod-reviewer` agent over the working-tree diff → NO blocking issues, "Ready to commit: YES"
  (token compliance PASS, no `any`/`@ts-ignore`, workflow security least-privilege, base/basename/MSW/SW-URL traced
  end-to-end, 404 fallback + build ordering correct). Non-blocking notes: MSW permanently ships in the prod bundle by
  design (revisit when a real FastAPI backend is wired) — tracked; PROGRESS/CURRENT bookkeeping updated here.
- Decisions/assumptions:
  - `base` is env-driven via `APP_BASE` rather than Vite's `command==='build'` so the Storybook build isn't accidentally
    given the app's subpath (Storybook is served at `/storybook/`, not `/`).
  - SPA fallback is `dist/index.html` copied to `dist/404.html` (done in the workflow, on the BUILT html with hashed
    asset refs) — not a `public/404.html` source copy (which would lack the build hashes) and not the redirect-query hack.
  - Storybook is NOT given a base; its relative asset URLs make it subpath-portable as-is.
- ONE-TIME MANUAL STEP (cannot be automated): repo Settings → Pages → Source = "GitHub Actions" before the first push to
  `main` publishes. Called out in the task file and the hand-off.
- Suggested commit message:
  `ci(pages): deploy app + Storybook + report to GitHub Pages (base path, SPA 404 fallback, MSW-in-prod demo)`

## Modernization arc COMPLETE
Tasks 000 → 027 done. Full product (12 modules), design system, AI-first layer, RBAC/audit, quality-agent tooling,
modernization (breakpoints/mobile/dock/motion/bento), executive report, and the Pages deploy pipeline are all in place.
Awaiting the user's manual commit of Task 027 and the one-time Pages "Source: GitHub Actions" switch.

## Enterprise İlanlar arc (ADR 0007) — Tasks 028 → 031 (MARATHON)
Approved from `docs/mockups/enterprise-listings.html` (Calm Signal tokens; no reference-palette clone).

- **028 — DataTable column header filters.** Funnel on the LEFT of each filterable column header
  (faceted/range/date/search), URL-synced via the same `setFilter` as the toolbar. Listings columns
  wired; MSW gains an `ai` filter param. dod-reviewer: Ready-to-commit YES. Verified in-app.
- **029 — KPI strip + inline status edit.** `/listings/stats` + `useListingStats`;
  `ListingsKpiStrip`; `useSetListingStatus` + `ListingStatusSelect` in the actions column
  (permission-gated). Verified in-app (KPI + 25 inline selects).
- **030 — Multi-view (Tablo/Kanban/Galeri/Harita).** `ListingsViewSwitch` (`?view=`),
  `ListingKanban`, `ListingGallery`, lazy `ListingsMap` (reuses `MapView`); `fitBounds` no-animate
  fix. Verified in-app (all 4 views switch; map deep-links `?view=map`).
- **031 — Create wizard rail + preview.** `Wizard` gains an optional `aside` rail; `ListingCreatePage`
  adds `CreateWizardRail` (EİDS checklist + quality score) and a final-step live `ListingPreviewCard`.
  Verified in-app (rail + score %25 on step 1).

Verification (all phases): `typecheck` clean · `lint` 0 errors · `build` OK · listings + data-table
story tests green (57+ tests) · real-app smoke 0 console errors. Full `npm run test` remains
environmentally flaky on this machine (heavy Storybook browser stories time out under parallel load,
count varies run-to-run; all touched files pass in isolation). Pre-existing unrelated red:
`CommandLauncher > Cards` (stems from uncommitted working-tree dock edits, not this arc).

Awaiting the user's manual commits (phase-by-phase; see final report).

## Auth arc (032 → 034) — MARATHON
Goal: real (MSW-simulated) authentication feeding the existing RBAC. Internal admin panel → no self-signup.
Login design = variant A ("centered minimal card"), chosen by the user from `docs/mockups/auth-login-variants.html`.

- **032 — Auth Core.** DONE.
  - Built: `lib/api/auth-token.ts` (bearer token store, localStorage + in-memory fallback, `UNAUTHORIZED_EVENT`);
    `lib/api/client.ts` (injects `Authorization: Bearer`; emits unauthorized on a tokened 401);
    `lib/auth/auth-context.tsx` (`AuthProvider`/`useAuth`/`useAuthOptional`, `SessionUser`, boot via `GET /auth/me`,
    401-event listener; `initialState` escape hatch for stories/tests); `features/auth/` (schemas, seed admins [one
    per role, shared demo password `arsam1234` — MOCK plaintext], MSW `login`/`me`/`logout` + audit + `resetAuthDb`,
    `useLogin`/`useLogout`, presentational `LoginForm` [RHF+Zod, FieldHelp, password reveal, remember], `AuthGate`
    [boot spinner / redirect-to-login with `?returnTo` / children], `LoginPage` [variant A]).
  - Wired: `permission-context` now derives the RBAC user from `AuthProvider` (removed hardcoded `DEFAULT_USER` as the
    source; kept as an isolated-render fallback) — `useSession`/`Can`/`RouteGuard`/nav/command surfaces UNCHANGED;
    `providers.tsx` adds `AuthProvider` (with `initialAuth` for stories/tests); `router.tsx` adds public `/login`
    OUTSIDE AppShell and wraps the protected tree in `<AuthGate>` (auth precedes RBAC `RouteGuard`); `UserMenu` wires
    the (previously dead) "Çıkış yap" to `useLogout`, shows email, and gates the role-preview switcher to DEV only;
    auth handlers registered in `lib/msw/handlers.ts`.
  - Decisions/assumptions:
    - AuthProvider owns state only (renders above the router); redirects are declarative via `AuthGate` off `status`,
      so an expired-session 401 (→ `UNAUTHORIZED_EVENT` → `clearSession`) auto-bounces to `/login`. No imperative nav
      from the provider (avoids a router↔context cycle).
    - `useSession` contract kept non-null so all existing consumers/stories/tests work untouched; `AuthGate` guarantees
      the only real consumers (protected tree) mount only when authenticated.
    - Token store needs an in-memory fallback: this machine's jsdom exposes a partial `localStorage` (missing
      `removeItem`); real browsers use `localStorage`.
    - `LoginForm` is presentational (`onSubmit`/`pending`/`errorMessage`) so Storybook can exercise validation/toggle/
      submit with NO network (Storybook has no MSW); the full login↔me↔logout↔audit flow is covered by Node-MSW unit
      tests + the `AuthProvider` boot test.
    - `requires2fa` is declared in the login response schema as a phase-033 extension point but never set in 032.
  - Verification: `typecheck` clean · `lint` 0 errors (19 warnings, all pre-existing patterns: `form.watch`
    incompatible-library + context-file react-refresh) · full `npm run test` **1025/1025 green** (169 unit + 856
    storybook) · `npm run build` OK · `npm run build-storybook` OK.
  - Suggested commit message:
    `feat(auth): add authentication core — login (variant A), MSW backend, AuthGate + session/RBAC bridge`

- **033 — Recovery, invite & 2FA.** DONE.
  - Pages (all public, variant-A via shared `AuthShell`): `/forgot-password` (neutral "sent" confirmation, no account
    enumeration; demo surfaces the reset link inline since no real email), `/reset-password?token=` (SetPasswordForm +
    strength meter; handles missing/invalid/expired token + success), `/accept-invite?token=` (validates invite →
    shows invitee → set first password → auto sign-in), `/login/2fa` (TOTP step reached only from LoginPage via nav
    state; direct visit bounces to /login).
  - Components: shared `AuthShell` + `BrandMark` (extracted so login/recovery/invite/2fa are visually identical);
    presentational `SetPasswordForm` (password+confirm, reveal, `scorePassword` strength meter), `TwoFactorForm`,
    `ForgotPasswordForm`.
  - MSW (extends `features/auth/api/handlers.ts`): login now branches — 2FA accounts get `{ requires2fa, challengeToken }`
    (no session) → `/auth/2fa/verify` mints the session; `+ /auth/forgot-password`, `/auth/reset-password` (password
    override store, so the new password actually works and the old fails), `GET /auth/invite`, `/auth/accept-invite`
    (creates a runtime admin, single-use token). New audit actions: `2fa_required/2fa_failed/reset_requested/
    password_reset/invite_accepted`. `resetAuthDb` resets all new state.
  - Hooks: `useLogin` is now a pure mutation (LoginPage branches on `requires2fa`); `+ useVerify2fa`, `useForgotPassword`,
    `useResetPassword`, `useInvite` (query), `useAcceptInvite`. `authErrorMessage` takes an optional fallback.
  - Seed: super-admin is 2FA-enabled (so the step is reachable); `DEMO_TOTP_CODE = '123456'`; one pending invite
    (`invite-demo`). Router: 4 new public routes added outside AppShell.
  - Decisions/assumptions:
    - `LoginResponse` widened (all fields optional) to carry both the completed-signin and 2FA-challenge shapes; caller
      branches on `requires2fa`. The 032 `requires2fa` reservation is now implemented.
    - Challenge token is carried to `/login/2fa` via router navigation state (no global store); direct visits redirect.
    - `super-admin` login now returns a 2FA challenge (not a token) — the 032 unit/boot tests were updated to use
      `moderator` for the direct-login path; a dedicated 2FA test covers super-admin.
    - No real TOTP/email/crypto — mock verifier accepts a single demo code; reset/invite links are surfaced in-UI
      instead of emailed. Swap-ready for FastAPI.
  - Verification: `typecheck` clean · `lint` 0 errors (21 warnings, same pre-existing patterns) · full `npm run test`
    **1066/1066 green** · `npm run build` OK · `npm run build-storybook` OK.
  - Suggested commit message:
    `feat(auth): add password recovery, admin invite acceptance, and 2FA step (MSW-simulated)`

- **034 — Account security & session hardening.** DONE.
  - Page: `/account/security` (protected, inside AppShell, no RBAC gate — every admin manages their own). Four cards:
    change password (`ChangePasswordForm`), 2FA manage (status + enable dialog with secret/QR-ish + code, disable via
    ConfirmDialog), active sessions (current + seeded other devices; revoke one / "diğer oturumları kapat"), and recent
    security activity (reuses `AuditTimeline` over the current user's `auth.*` events). Reached from a new UserMenu item.
  - Session hardening: `useIdleTimer` + presentational `SessionTimeoutModal` (non-dismissible re-auth) wired by
    `SessionGuard` (mounted in AppShell → active only while signed in; 15-min default idle → password re-auth or logout).
    Token refresh: `AuthProvider.refreshSession` + rotate-on-tab-focus; `POST /auth/refresh` rotates the mock token.
  - MSW (extends handlers): `GET /auth/security`, `POST /auth/change-password` (verifies current), `GET /auth/2fa/setup`,
    `POST /auth/2fa/enable` (code-gated) / `disable` (runtime `twoFactorOverrides` → also flips whether login demands
    2FA), `DELETE /auth/sessions/:id`, `POST /auth/sessions/revoke-others`, `POST /auth/refresh`, `POST /auth/reauth`.
    New audit actions: `password_changed/2fa_enabled/2fa_disabled/session_revoked/sessions_revoked_others`. `resetAuthDb`
    resets the new state; other-device sessions are lazily seeded per user.
  - Hooks: `useSecurity`, `useChangePassword`, `use2faSetup`, `useEnable2fa`, `useDisable2fa`, `useRevokeSession`,
    `useRevokeOtherSessions`, `useReauth` (+ `securityKeys`).
  - Decisions/assumptions:
    - Account-security page is personal (no `permission` on the route); all authenticated roles reach it.
    - Sessions are mock: one real "current" (from the token) + two seeded fake devices with human-readable `lastActive`
      labels (no real timestamps/geo). Revoking removes them from the per-user list.
    - Idle default 15 min (prop-overridable); the timer never fires in tests (no activity + fake timers unit-tested).
    - Token rotates on tab focus; a failed refresh just surfaces as the next-request 401 → existing UNAUTHORIZED path.
    - `use-idle-timer` writes its callback ref inside an effect (React Compiler forbids ref writes during render).
  - Verification: `typecheck` clean · `lint` 0 errors (21 warnings, same pre-existing patterns) · full `npm run test`
    **1093/1093 green** · `npm run build` OK · `npm run build-storybook` OK.
  - Suggested commit message:
    `feat(auth): add account security page (password/2FA/sessions) + idle re-auth lock & token refresh`

## Auth arc COMPLETE (032 → 034)
Full authentication layer feeding the existing RBAC, entirely MSW-simulated and swap-ready for FastAPI. Login (variant
A) · session boot/persist · AuthGate · logout · 401 handling · password recovery · admin invite · 2FA · account security
· active sessions · idle lock · token refresh · auth audit. Final full run: **1093/1093 tests green**, typecheck/lint/
build/build-storybook all green. Awaiting the user's phase-by-phase manual commits (see final report).

### Auth arc — live smoke + reload-persistence fix
- Real-app smoke (headless Chromium/Playwright over `vite preview`, MSW-in-prod): 6/6 flows green — deep-link
  `/listings` while signed out → `/login?returnTo`; invalid creds → error; valid (moderator) → into app; **reload →
  session persists**; super-admin → `/login/2fa`; code `123456` → into app. Only console noise is the deliberate 401
  from the invalid-credentials step.
- Fix surfaced by the smoke: the mock session map is per-page-load, so a persisted token was unknown after reload →
  bounced to /login. `userIdForToken` now falls back to parsing the id out of the opaque `mock-<userId>-<seq>` token
  (self-contained, like a real JWT would be), so seed-admin sessions survive reloads; logout/refresh still invalidate
  via a `revokedTokens` set (invalidation tests stay green).
- Live browser smoke via the chrome-devtools MCP was unavailable (Google Chrome not installed in this environment);
  Playwright/Chromium (already used by the Storybook test project) was used instead.
