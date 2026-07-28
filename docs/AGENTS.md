# Review Agents — arsam.net Admin

Project-specific **read-only** review agents live in `.claude/agents/*.md`. They encode OUR rules
(Golden Rules, `docs/DESIGN_SYSTEM.md`, `docs/DATA_TABLE_SPEC.md`, `docs/FORMS_UX.md`, WCAG 2.2 AA) so
each pre-commit / phase-boundary review is consistent instead of re-derived from memory each time.

**Hard invariant: every agent here is read-only.** None edits files, none runs git write commands. They
report severity-tagged `file:line` findings; the USER fixes and commits manually (Git Policy in `CLAUDE.md`).

> New `.claude/agents/*.md` files are picked up at the **start of a session**. After adding or editing one,
> `/clear` (or restart) before invoking it by type via the Task tool.

## Roster

### Tier-0 — gate (existed pre-Aşama 6)
| Agent | Model | Use when | What it checks |
|---|---|---|---|
| **dod-reviewer** | sonnet | After ANY component/feature/form/shell change, before the user commits. | The full Definition of Done: Storybook coverage (default/loading/empty/error/mobile + play + shell modes), a11y, token compliance, FieldHelp presence, TS strictness, DATA_TABLE_SPEC, verification (lint/typecheck/test/build). The broad final gate.

### Tier-1 — specialized pre-screens (Aşama 6 / Task 018)
These narrow, cheap agents **front-run** `dod-reviewer` so the recurring blocking categories (≥44px targets,
FieldHelp/aria binding, token leaks, dead weight, design drift) are caught earlier and don't reach the gate.

| Agent | Model | Use when | What it checks |
|---|---|---|---|
| **design-token-guardian** | haiku | Any component/style change; before touching `theme.css`. | Golden Rule 2 mechanically: hardcoded colors (hex/rgb/hsl/oklch) outside `src/styles/theme.css`, native `title=` help attribute (NOT component `title` props), hardcoded shadows, raw magic spacing, sahibinden-v2 palette/font/glass leaks. |
| **a11y-sentinel** | sonnet | Any component/form/shell change; before a mobile phase. | WCAG 2.2 AA against OUR conventions: ≥44px hit targets, `aria-describedby` field binding, "color never the sole signal", Tooltip-not-`title`, focus management, roles/names, `prefers-reduced-motion`. Can run a co-located Storybook a11y test on request. |
| **ux-design-critic** | sonnet | After building a page/feature; before a modernization phase. | Heuristic design review: visual hierarchy, spacing rhythm, motion-token consistency, empty/loading/error polish, mobile ergonomics (320/480/768), cross-feature consistency, DESIGN_SYSTEM adherence. Advisory (no PASS/FAIL). |
| **dead-code-hunter** | haiku | Phase boundaries; when pruning. | Unused exports/files/deps, unreachable code, orphan stories/tests via `npx knip`/`ts-prune`/`depcheck` on demand (adds NO permanent dependency). Verifies each candidate by grep; separates CONFIRMED from SUSPECTED (schema-first exports, shadcn sub-exports, MSW registries, CSF re-exports are known false positives). |

### Tier-1b — Golden-Rule & axis guardians (added post-Aşama 6)
Two additions past the original "four is the ceiling" line — each guards a surface that previously had **no
guardian at all**, so they are coverage, not noise: `ai-first-sentinel` is the missing enforcer for Golden Rule 4,
and `performance-sentinel` is the missing enforcer for the optimization/perf axis.

| Agent | Model | Use when | What it checks |
|---|---|---|---|
| **ai-first-sentinel** | haiku | Any component/feature/route change; before commit. | Golden Rule 4 (AI-first): `data-action`+`data-entity` on domain-intent interactive elements (pure-UI affordances exempted), route `routeMeta.aiEntity` coverage vs `nav-schema.ts`, the "AI proposes / human disposes" confirm-before-apply guardrail, and vocabulary consistency. |
| **performance-sentinel** | sonnet | Perf-sensitive changes; at a phase boundary. | React render cost + bundle weight: heavy deps (recharts/leaflet) staying `React.lazy`-split, barrel-import blowups, unstable hook deps / missing memo on hot paths, `key={index}`, virtualization on >100-row collections, TanStack Query hygiene, context-value churn, and the bundle budget (`node scripts/check-bundle-size.mjs`). HIGH-confidence findings only. |

### Tier-2 — deferred (add when needed)
- **security-sentinel** — input-validation gaps, unsafe `dangerouslySetInnerHTML`, secret/PII leakage, authz bypass.
- **code-standards-enforcer** — project idioms: Zod-first schemas, MSW contract shape, hook conventions, file colocation.

Deliberately not built yet — four Tier-1 agents is the ceiling before reviews turn to noise. Add a Tier-2
agent only when a real recurring miss justifies it.

## Mechanical layer (non-agent, zero review-token cost)
Cheap, deterministic gates that front-run the agents so token-spend goes to real judgment calls:
- **Stop hook** (`scripts/hooks/mechanical-check.sh`, wired in `.claude/settings.json`) — advisory grep on every
  turn-stop for hardcoded colors outside `theme.css` + native `title=` help. Never blocks (exit 0); just surfaces
  the #1 recurring leaks before they reach `design-token-guardian`/`a11y-sentinel`.
- **Bundle budget** (`scripts/check-bundle-size.mjs`) — no-dep gzipped-size gate over `dist/assets`, run in CI
  (`.github/workflows/quality.yml`) after Build. Budgets: initial ≤260KB, any async chunk ≤380KB, total ≤1200KB.
  Diagnose a breach with `ANALYZE=1 npm run build` → `dist/stats.html` treemap (rollup-plugin-visualizer, dev-only).
- **chrome-devtools MCP** (`.mcp.json`) — on-demand real Core Web Vitals / performance traces / network against the
  running app (`npx chrome-devtools-mcp`, headless+isolated). Complements the `performance-sentinel` static review
  with runtime measurement. No permanent dependency.

## How they compose
- **During a task:** run the relevant Tier-1 agent(s) as you build (token-guardian + a11y-sentinel on a form
  change; ux-design-critic after a page; dead-code-hunter at a phase boundary). Fix findings inline.
- **Before commit:** run **dod-reviewer** as the final gate. With Tier-1 already applied, it should find little.
- **Relationship to built-ins:** `/code-review` and `/security-review` are general-purpose and provider-agnostic;
  these agents are the arsam.net-specific specializations that bake in our rules and docs. Use both — the built-ins
  for generic correctness/security, these for our conventions. Don't run overlapping agents just to run them.
- **Scope discipline:** these agents are read-only advisors. A finding is not an instruction to fix *now* — during
  a config-only phase (e.g. Task 018) their findings are recorded as input for the phase that owns that surface
  (a11y/mobile findings → 019/020), not fixed on the spot.

## Future — "release-readiness" Workflow
Once the roster is stable, a single Workflow can fan all Tier-1 agents (+ dod-reviewer) out in parallel over the
current diff and synthesize ONE ranked, de-duplicated summary (blocking vs advisory), so a pre-release check is one
command instead of five sequential reviews. Opt-in / billed (multi-agent) — author it when the review cadence
justifies the cost, not before.
