# arsam.net — Admin Panel (CLAUDE.md)

Enterprise admin panel for **arsam.net**, a Turkish real-estate-only classifieds marketplace (Sahibinden-style emlak vertical: konut/işyeri/arsa/devremülk/turistik). Solo-developed with Claude Code via agentic "vibe coding". This file is auto-loaded every session — keep it LEAN. Detailed specs live in `docs/`.

## Locked Stack (do NOT relitigate)
- React 19 + TypeScript (strict, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`) + Vite (SPA).
- Tailwind CSS v4 (CSS-first `@theme`) + shadcn/ui (new-york, Radix/Base UI primitives).
- React Router v7 in DATA mode only (`createBrowserRouter`). Framework mode, SSR/RSC, Next.js are FORBIDDEN.
- TanStack Query v5, TanStack Table v8 (NOT v9 beta), TanStack Virtual v3.
- React Hook Form + Zod via `zodResolver`.
- Storybook 10 (`@storybook/react-vite`, CSF3, autodocs, `@storybook/addon-a11y`, `@storybook/addon-vitest` for interaction/play tests, mobile viewports).
- lucide-react, recharts, React Leaflet + leaflet.markercluster, sonner, cva + clsx + tailwind-merge (`cn`).
- Backend later: FastAPI REST. Now: MSW mocks. Contract: `GET /{resource}?page&pageSize&sort&filters` -> `{ items, total, page, pageSize }`.

## Commands
- `npm run dev` — Vite dev server
- `npm run build` — typecheck + production build
- `npm run typecheck` — `tsc --noEmit`
- `npm run lint` — ESLint
- `npm run test` — Vitest (unit + Storybook interaction/a11y)
- `npm run storybook` — Storybook dev
- `npm run build-storybook` — static Storybook

## Golden Rules
1. **Original design system — selective adaptation allowed, verbatim cloning forbidden.** Use ONLY tokens from `docs/DESIGN_SYSTEM.md`. Reference sources (sahibinden-v2) may inspire *interaction and layout ideas*, but every surface is always re-derived in OUR OKLCH tokens, OUR type scale, and OUR elevation. NEVER clone verbatim: the warm-paper cream/brown palette, the Inter/Lora/JetBrains font trio, the coffee-cream inversion, or the reference's liquid-glass chrome. Measured, token-based transparency/blur IS allowed when it passes WCAG contrast. sahibinden-v2 stays a COMPONENT-TYPE reference only, reinterpreted in our language.
2. **Token-only styling.** No hardcoded hex/rgb/oklch in components. Use semantic Tailwind tokens (`bg-background`, `text-foreground`, `border-border`, ...).
3. **Mobile-first.** Build the smallest breakpoint first. Both layout modes converge to drawer + bottom nav + command palette on mobile.
4. **AI-first.** Interactive elements carry `data-action`/`data-entity`; routes carry `routeMeta`. See `docs/AI_FIRST.md`.
5. **Storybook-first.** Every component ships stories (default/loading/empty/error/mobile). Shell components add `sidebar` + `topnav` stories.
6. **FieldHelp mandatory.** EVERY form field has an icon-only help affordance via `FieldHelp`, enforced by `FormField`. A field without help/helper text fails DoD.
7. **Advanced tables mandatory.** Data tables follow the 10-point contract in `docs/DATA_TABLE_SPEC.md`.
8. **Layout modes.** AppShell supports `sidebar` and `topnav`, driven by ONE nav schema, switchable at runtime, persisted per user.
9. **Pre-commit UI gate.** After ANY UI task (component/page/visual change), before proposing a commit: run `npm run ui:audit -- --route <path>` (or `--story <id>`), READ the per-breakpoint screenshots in `.ui-audit/`, review with `ux-design-critic`, fix shift/overflow/mobile/ergonomic issues, re-audit until clean, THEN report. See `docs/UI_GATE.md`.

## Git Policy (HARD)
- Claude Code MUST NEVER run git write operations: commit, push, tag, rebase, reset, merge, checkout, restore, clean, stash, cherry-pick, revert. Enforced as deny rules in `.claude/settings.json`.
- Read-only git (`status`, `diff`, `log`) is allowed.
- The USER performs ALL commits manually between tasks. After completing a task, STOP and report what to review + commit.

## Language
- ALWAYS respond to the user in TURKISH: explanations, plans, questions, progress reports, DoD reviews.
- Keep ALL code, identifiers, comments, file contents, docs, and commit-message suggestions in ENGLISH.
- App UI copy (labels, buttons, messages shown to end users) is TURKISH, per the PRD (Turkish market).

## Run Modes
- **TASK mode (default):** one task at a time. `docs/tasks/CURRENT.md` points at the active task. Plan -> implement -> run `lint` + `typecheck` + `test` + `build` -> DoD review via the `dod-reviewer` agent -> STOP for the user's manual commit. `/clear` between tasks. Resume with "read docs/tasks/CURRENT.md and continue".
- **MARATHON mode (ONLY when the user explicitly asks to run all tasks):** execute tasks 000 -> 005 sequentially WITHOUT stopping for commits, questions, or approvals between tasks.
  - Per task: implement -> verify (`lint` + `typecheck` + `test` + `build`) -> self-check the DoD from `docs/RULES.md` -> append a checkpoint entry to `docs/tasks/PROGRESS.md` (what was built, verification results, decisions/assumptions made, suggested commit message) -> update `docs/tasks/CURRENT.md` -> continue to the next task.
  - Make reasonable decisions autonomously instead of asking; record every assumption in PROGRESS.md.
  - If a verification fails, FIX it before moving to the next task — never skip a failing check.
  - The "STOP for user commit" lines in task files are interpreted as "write checkpoint, continue" in this mode.
  - At the very end: run full verification, run the `dod-reviewer` agent over the whole project, and produce a final report with per-task summaries, known gaps/risks, and suggested commit messages.
  - The Git Policy applies in ALL modes: NEVER run git write commands; the user commits manually at the end.

## Pointers
- Product `docs/PRD.md` · Architecture `docs/ARCHITECTURE.md` · Permissions `docs/PERMISSIONS.md`
- Design `docs/DESIGN_SYSTEM.md` · Components `docs/COMPONENTS.md` · Tables `docs/DATA_TABLE_SPEC.md`
- Forms `docs/FORMS_UX.md` · Storybook `docs/STORYBOOK_GUIDELINES.md` · AI `docs/AI_FIRST.md`
- Rules `docs/RULES.md` · Roadmap `docs/ROADMAP.md` · ADRs `docs/adr/` · Tasks `docs/tasks/`
