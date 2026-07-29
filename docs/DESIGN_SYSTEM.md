# Design System — arsam.net Admin (ORIGINAL)

> **sahibinden-v2 is NOT a visual source — selective adaptation allowed, verbatim cloning forbidden.** This design system is original. Reference sources may inspire *interaction and layout ideas*, but every surface is always re-derived in the OKLCH tokens, type scale, and elevation defined below. Do NOT clone verbatim: the old warm-paper cream/brown palette, the Inter/Lora/JetBrains Mono trio, the coffee-cream accent inversion, or the reference's liquid-glass chrome. Measured, token-based transparency/blur (a "rich glass" that reads in OUR palette) IS permitted when it passes WCAG contrast in both light and dark. sahibinden-v2 is referenced ONLY as an approved *component-type* library (see COMPONENTS.md); its component ideas are reinterpreted in the language below, never visually ported.

## Design direction (committed)
**"Calm Signal"** — a cool, low-fatigue slate-neutral canvas for all-day back-office use, with a confident indigo primary and a teal secondary signal accent. Restrained, dense, precise; charts and numbers are first-class. Modern and distinctive without decorative noise (no glassmorphism, no skeuomorphism). Rationale: neutral slate surfaces reduce eye strain over long sessions; a single saturated primary keeps calls-to-action unambiguous in dense screens; OKLCH lets us derive light/dark/high-contrast by moving L and C predictably.

## Color tokens (OKLCH, shadcn semantic conventions)
Defined in `src/styles/theme.css` via `:root` / `.dark` + exposed with `@theme inline`. Components use ONLY the semantic tokens.

```css
:root {
  --background: oklch(0.994 0.002 250);
  --foreground: oklch(0.205 0.02 265);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.205 0.02 265);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.205 0.02 265);
  --primary: oklch(0.52 0.18 264);            /* indigo */
  --primary-foreground: oklch(0.985 0.005 250);
  --secondary: oklch(0.955 0.01 250);
  --secondary-foreground: oklch(0.30 0.03 265);
  --muted: oklch(0.965 0.006 250);
  --muted-foreground: oklch(0.52 0.02 265);
  --accent: oklch(0.72 0.13 190);             /* teal signal */
  --accent-foreground: oklch(0.20 0.03 210);
  --destructive: oklch(0.58 0.22 27);
  --destructive-foreground: oklch(0.985 0.005 250);
  --success: oklch(0.62 0.15 150);
  --warning: oklch(0.80 0.16 84);
  --border: oklch(0.92 0.008 250);
  --input: oklch(0.92 0.008 250);
  --ring: oklch(0.52 0.18 264);
  --chart-1: oklch(0.52 0.18 264);
  --chart-2: oklch(0.72 0.13 190);
  --chart-3: oklch(0.68 0.16 145);
  --chart-4: oklch(0.80 0.16 84);
  --chart-5: oklch(0.62 0.20 20);
  --sidebar: oklch(0.985 0.004 250);
  --sidebar-foreground: oklch(0.30 0.02 265);
  --sidebar-primary: oklch(0.52 0.18 264);
  --sidebar-primary-foreground: oklch(0.985 0.005 250);
  --sidebar-accent: oklch(0.955 0.01 250);
  --sidebar-accent-foreground: oklch(0.30 0.03 265);
  --sidebar-border: oklch(0.92 0.008 250);
  --sidebar-ring: oklch(0.52 0.18 264);
  --glass: oklch(0.994 0.002 250 / 0.9);      /* chrome-only rich glass (task 021) */
  --glass-foreground: oklch(0.205 0.02 265);
  --glass-border: oklch(0.82 0.01 250 / 0.9); /* clears 1.4.11 3:1 vs near-white bg */
  --radius: 0.625rem;
}
.dark {
  --background: oklch(0.205 0.015 265);        /* soft near-black, not #000 */
  --foreground: oklch(0.96 0.006 250);
  --card: oklch(0.245 0.017 265);
  --card-foreground: oklch(0.96 0.006 250);
  --popover: oklch(0.245 0.017 265);
  --popover-foreground: oklch(0.96 0.006 250);
  --primary: oklch(0.70 0.15 264);
  --primary-foreground: oklch(0.18 0.02 265);
  --secondary: oklch(0.29 0.02 265);
  --secondary-foreground: oklch(0.96 0.006 250);
  --muted: oklch(0.29 0.02 265);
  --muted-foreground: oklch(0.72 0.02 260);
  --accent: oklch(0.75 0.12 190);
  --accent-foreground: oklch(0.18 0.02 210);
  --destructive: oklch(0.62 0.20 27);
  --destructive-foreground: oklch(0.985 0.005 250);
  --success: oklch(0.68 0.14 150);
  --warning: oklch(0.82 0.15 84);
  --border: oklch(0.31 0.02 265);
  --input: oklch(0.31 0.02 265);
  --ring: oklch(0.70 0.15 264);
  --chart-1: oklch(0.70 0.15 264);
  --chart-2: oklch(0.75 0.12 190);
  --chart-3: oklch(0.72 0.15 145);
  --chart-4: oklch(0.82 0.15 84);
  --chart-5: oklch(0.68 0.18 20);
  --sidebar: oklch(0.225 0.016 265);
  --sidebar-foreground: oklch(0.90 0.01 250);
  --sidebar-primary: oklch(0.70 0.15 264);
  --sidebar-primary-foreground: oklch(0.18 0.02 265);
  --sidebar-accent: oklch(0.29 0.02 265);
  --sidebar-accent-foreground: oklch(0.96 0.006 250);
  --sidebar-border: oklch(0.31 0.02 265);
  --sidebar-ring: oklch(0.70 0.15 264);
  --glass: oklch(0.245 0.017 265 / 0.9);      /* chrome-only rich glass (task 021) */
  --glass-foreground: oklch(0.96 0.006 250);
  --glass-border: oklch(0.42 0.02 265 / 0.85);
}
```
All text/background pairs are chosen for WCAG 2.2 AA (>= 4.5:1 body, >= 3:1 large/UI). Dark mode intentionally uses a soft near-black surface (approx oklch 0.205 L) rather than pure black to reduce halation and eye fatigue.

## Typography
- **Sans (UI + body):** `Geist` variable, fallback `Inter`, then `system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif`. Rationale: Geist is tuned for dense dashboards/tabular contexts; Inter is a proven data-dashboard UI face. Deliberately distinct from the old Inter/Lora/JetBrains trio: no serif anywhere, different mono.
- **Mono (data / numbers / IDs):** `Geist Mono` variable, fallback `ui-monospace, SFMono-Regular, Menlo, monospace`.
- **Tabular numerals everywhere data lives:** set `font-variant-numeric: tabular-nums` on tables, KPI cards, and any numeric column so columns align.
- **Type scale (rem):** xs .75/1rem, sm .8125/1.25, base .875/1.375, md 1/1.5, lg 1.125/1.6, xl 1.375/1.75, 2xl 1.75/2.1, 3xl 2.25/2.5. (Admin base is 14px for density.)
- **Weights:** 400 body, 500 emphasis, 600 headings/labels.

## Spacing scale
4px base: `0,1(4),2(8),3(12),4(16),5(20),6(24),8(32),10(40),12(48),16(64)`.

## Radii
`--radius: 0.625rem`; derive `sm = radius-4px`, `md = radius-2px`, `lg = radius`, `xl = radius+4px`. Inputs/cards use md/lg; pills use full.

## Elevation / shadows (subtle, token-driven)
- `shadow-xs`: 0 1px 2px oklch(0 0 0 / 0.05)
- `shadow-sm`: 0 1px 3px / 0 1px 2px oklch(0 0 0 / 0.08)
- `shadow-md`: 0 4px 8px oklch(0 0 0 / 0.08)
- `shadow-lg` (popovers/menus): 0 8px 24px oklch(0 0 0 / 0.12)
Dark mode uses borders + slightly stronger shadow alpha for separation.

## Rich glass (chrome-only surfaces)
Measured, token-based transparency/blur in OUR palette (task 021) — NOT the reference's white liquid-glass. Used ONLY on chrome: the floating command dock, the notification popover, and the dock's mobile command bar. Never on content cards.
- Tokens (`src/styles/theme.css`): `--glass` (semi-opaque surface base, **0.9 opacity** so opaque `--glass-foreground` text keeps AA contrast over blurred content), `--glass-foreground` (opaque text/icon color), `--glass-border` (denser/darker-than-plain-border hairline chosen to clear WCAG 1.4.11 3:1 vs the near-white background; `shadow-lg` is the primary edge cue). Exposed as `--color-glass` / `--color-glass-foreground` / `--color-glass-border`.
- Usage: `bg-glass text-glass-foreground border-glass-border` + a `backdrop-blur-*` utility. Light AND dark are contrast-verified. Hardcoded color/opacity hacks are forbidden — the glass effect is entirely token + `backdrop-blur`.

## Motion tokens
- Durations: `fast 120ms`, `base 180ms`, `slow 260ms`, `reveal 420ms`.
- Easings: `standard cubic-bezier(0.2,0,0,1)`, `emphasized cubic-bezier(0.2,0,0,1)`, `exit cubic-bezier(0.4,0,1,1)`, `spring cubic-bezier(0.34,1.15,0.5,1)`.
- `reveal` + `spring` are a matched pair, reserved for a surface flying in from OFF-SCREEN (today: the edge-dock stage). The overshoot needs the long travel to read as arrival rather than a wobble, and it applies to `transform` only — opacity on the same element stays on `base` + `standard`, so the surface is legible for the whole flight. In-page state changes keep using fast/base/slow.
- Respect `prefers-reduced-motion`: disable non-essential motion.

## Breakpoints
8-token named scale (defined in `src/styles/theme.css` `@theme` as `--breakpoint-*`; overrides Tailwind's defaults):
`xs 320 · sm 480 · md 640 · lg 768 · xl 1024 · 2xl 1280 · 3xl 1536 · 4xl 1920`.
Mobile-first. **Both shells + the data table converge to drawer + bottom nav / card view below `xl` (1024)** — the convergence lives at `xl`, not `lg`. When the scale was introduced (task 019) every pre-existing responsive prefix was shifted up one token (`sm`→`md`, `md`→`lg`, `lg`→`xl`, `xl`→`2xl`) so the original 640/768/1024/1280 thresholds are preserved exactly; the new `xs` (320) and `sm` (480) tokens are additive for future mobile refinement.

## Density modes
`comfortable` (default) and `compact`. Density changes row height, control padding, and font-size step on tables/forms via a `data-density` attribute on the shell root; tokens read it.

## Iconography
`lucide-react` only, 1.5px stroke, sized to the type scale, 20/24px in nav. Icons that carry meaning meet 3:1 contrast and pair with a label or `aria-label`.

## Prohibitions
No hardcoded colors in components; no sahibinden-v2 warm-paper visuals; no glassmorphism/liquid-glass; no serif typeface; no color-only status signaling; no `title`-attribute tooltips.
