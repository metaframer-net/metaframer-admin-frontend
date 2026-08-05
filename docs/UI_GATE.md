# Pre-commit UI Gate

Catch mobile breakage, layout shifts, and UI problems **before commit**, not
after — so fixing them doesn't cost a second round of work. THREE enforcement
layers plus the visual-regression suite (`docs/VISUAL_TESTING.md`).

## Automation — who runs it, when (nobody has to remember)

| When | What runs | How |
| --- | --- | --- |
| End of a UI task | Full audit + screenshot review | **Claude, automatically** — `CLAUDE.md` Golden Rule #9. You don't ask each time. |
| Every `git commit` | lint + typecheck + tests | **git pre-commit hook** (`.githooks/pre-commit`) |
| Every push / PR to `main` | Audit over routes discovered from the nav schema + full test suite | **GitHub Actions** (`.github/workflows/quality.yml`) — fully mechanical |

So: in our sessions I run the audit myself at the end of a UI task; and even if a
step is ever missed, CI re-runs it on the PR. You neither have to tell me nor run
it manually.

## Layer 1 — Agent gate (thorough, per UI task)

Run at the END of any UI task (new component, page, or visual change), before
proposing a commit. Drives the REAL running app (or a Storybook story) across the
DESIGN_SYSTEM breakpoints (320 · 768 · 1023 · 1024 · 1280) and:

- **checks, baseline-free:** page horizontal overflow, in-flow elements bleeding
  off-screen (only when the page actually overflows — off-canvas drawers/docks
  are ignored), and < 44px touch targets on phone/tablet widths;
- **captures a screenshot per breakpoint** into `.ui-audit/` so the result can be
  eyeballed (Claude reads them + reviews with the `ux-design-critic` agent).

```bash
# real app (self-boots dev, logs in, drives the route)
npm run ui:audit -- --route /listings

# reuse an already-running dev server
npm run ui:audit -- --route / --base http://localhost:5173

# a Storybook story (start Storybook first: npm run storybook)
npm run ui:audit -- --story listings-listingstable--default --base http://localhost:6006
```

Exit code is non-zero on a HARD finding (overflow / off-screen / console error);
touch-target issues are warnings. `.ui-audit/report.json` holds the full result.

**Screenshot lifecycle:** the shots are throwaway REVIEW artifacts, not a record.
`.ui-audit/` is **gitignored** (never reaches the repo) and is **wiped at the
start of every run**, so it only ever holds the current audit and never
accumulates on disk. Once a task is reviewed and clean, nothing needs to be kept;
if you want to archive a specific audit for a report, copy it out manually.

**The workflow (what "done" means for a UI task):**
1. implement →
2. `npm run ui:audit -- --route <path>` →
3. read the screenshots + `ux-design-critic` review →
4. fix any shift / overflow / mobile / ergonomic issue →
5. re-audit until clean →
6. THEN report ready-to-commit.

This is a standing rule in `CLAUDE.md` (Golden Rules).

## Layer 2 — Fast git hook (deterministic backstop, every commit)

`.githooks/pre-commit` runs `lint` + `typecheck` + `vitest run` (the Storybook
browser project renders every component in real Chromium). It is intentionally
fast and static — the heavy browser drive is Layer 1. Enable once:

```bash
git config core.hooksPath .githooks
```

## Layer 3 — CI (fully automatic, every push/PR)

The `ui-audit` job in `.github/workflows/quality.yml` runs the audit on every
push/PR over the routes **discovered dynamically from the nav schema** (`--nav`
reads `to: '/...'` paths from `src/config/nav-schema.ts`), and uploads the
screenshots as a build artifact (inspectable from the Actions run). A new page
added to the nav is covered automatically — there is no manifest to maintain.
Param routes (`/x/:id`) are skipped since they need data.

```bash
npm run ui:audit -- --nav        # what CI runs (routes from the nav schema)
npm run ui:audit -- --route /listings   # or audit one/comma-separated paths
```

The job is **non-blocking during rollout** (`continue-on-error: true`). Once you
trust it, remove that line (or make `ui-audit` a required check in branch
protection) so a hard finding blocks the PR.

## Scope & honesty

- Layer 1 covers whatever route/story you point it at — it does not crawl the
  whole app. Coverage grows as you audit each surface you touch.
- A full real-browser overflow/console scan is too slow for every commit, so it
  lives in Layer 1 (per task) + CI, not the hook. The hook is the fast backstop.
- Screenshots are the human/agent review surface; the automated checks catch the
  common hard bugs but not subjective spacing/hierarchy — that's the eyeball step.
