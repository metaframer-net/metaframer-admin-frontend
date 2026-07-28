# Task 031 — Create wizard: dynamic rail + final-step live preview

Ref: ADR 0007 · mockup `docs/mockups/enterprise-listings.html` (combined form variant)

## Goal
Bring the İlan create wizard to the approved combined form: a dynamic helper rail beside the
steps (EİDS checklist + moving quality score) and a live preview on the final step.

## Delivered
- `components/form/Wizard.tsx` — optional `aside?: (ctx: { index, total }) => ReactNode`
  render-prop; content + aside laid out in a 2-col grid on `lg` (backward compatible — existing
  callers pass no aside and are unchanged).
- `components/form/Wizard.stories.tsx` — story exercising the `aside` rail.
- `features/listings/components/ListingPreviewCard.tsx` (+ stories) — token-only live preview
  card driven by the current form values (title/category/price/location/attribute pills).
- `pages/ListingCreatePage.tsx` — `CreateWizardRail` (EİDS checklist that ticks off per step +
  quality-score progress bar); final step renamed **"Önizleme & Yayın"** and now renders the
  live `ListingPreviewCard` beside the summary; container widened for the rail.

## DoD — met
Category-driven dynamic fields retained; FieldHelp on every field (existing FormField);
per-step Zod validation retained; stories + play test (create page); token-only; strict TS;
`lint`/`typecheck`/`build` green.

## Follow-up (031b) — added after review: vertical rail (the SELECTED F2 layout)
The first pass kept the shared Wizard's HORIZONTAL top stepper and only added the right rail —
this did NOT match the user's selected mockup (left vertical rail). Fixed:
- `components/form/Wizard.tsx` — `stepsVariant?: 'horizontal' | 'vertical'` (default horizontal,
  backward compatible) + `WizardStep.hint`; `VerticalStepper` (progress bar + numbered steps +
  connector line, clickable). 3-col layout when vertical + aside.
- `components/form/Wizard.stories.tsx` — `Vertical` story + play.
- `pages/ListingCreatePage.tsx` — `stepsVariant="vertical"`, step `hint`s, container widened.

## Follow-up (031c) — FULL mockup fidelity (5-step combined form)
Rebuilt the create wizard to match the approved mockup exactly:
- `Wizard.tsx` — `stepsVariant="vertical"` (left rail) + `WizardStep.hint` + `footerHint`.
- `components/form/RadioCards.tsx` (+ stories) — reusable radio-card group (label + hint).
- `features/listings/components/ListingPhotoStudio.tsx` (+ stories) — dropzone + cover-first
  photo grid with AI quality tags (presentational mock until media upload ships).
- `data/taxonomy.ts` — `PURPOSES`/`AUTHORITIES`/`AUTHORITY_META`/`SUBTYPES`.
- `schemas/listing.ts` — `purpose` / `subType` / `authority` / `adaParsel`.
- `pages/ListingCreatePage.tsx` — **5 steps**: 1 Mülk bilgileri (amaç radio + mülk türü/alt
  tür + yetki radio cards) · 2 Konum & taşınmaz (cascade + ada/parsel) · 3 Nitelikler ·
  4 Fotoğraf & metin (photo studio + başlık/açıklama/fiyat) · 5 Önizleme & Yayın (live preview +
  doğrulama + özet). Top draft/autosave chrome + "Çık"; dynamic EİDS/score rail; footer hint.

Verified in-app: vertical rail + top chrome + step-1 radio cards + dynamic rail (%20→…),
0 console errors; listings+form+data-table suite 183/183 green.
