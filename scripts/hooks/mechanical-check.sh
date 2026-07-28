#!/usr/bin/env bash
# Advisory mechanical gate — runs on Stop. Fast grep only (no tsc, no agent tokens):
# catches the #1 recurring blocker (hardcoded colors outside theme.css) and native
# `title=` help before it reaches a review agent. Always exits 0 (advisory, never
# blocks); the real gates are the review agents + CI. Deep checks stay in `npm run
# typecheck` / the design-token-guardian agent.
set -euo pipefail
cd "$(git rev-parse --show-toplevel 2>/dev/null || echo .)"

SRC="src"
[ -d "$SRC" ] || exit 0

# 1) Raw color literals outside the one allowed file (src/styles/theme.css).
colors=$(grep -rnE '#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(|oklch\(' \
  --include='*.ts' --include='*.tsx' --include='*.css' "$SRC" 2>/dev/null \
  | grep -v 'src/styles/theme.css' \
  | grep -vE '//|/\*|\*|https?:' || true)

# 2) Native title= help on intrinsic (lowercase) JSX elements — not component title props.
titles=$(grep -rnE '<[a-z][a-zA-Z]*[^>]*[[:space:]]title=' \
  --include='*.tsx' "$SRC" 2>/dev/null || true)

n_colors=$( [ -z "$colors" ] && echo 0 || printf '%s\n' "$colors" | wc -l | tr -d ' ' )
n_titles=$( [ -z "$titles" ] && echo 0 || printf '%s\n' "$titles" | wc -l | tr -d ' ' )

if [ "$n_colors" -eq 0 ] && [ "$n_titles" -eq 0 ]; then
  exit 0
fi

echo "── mechanical-check (advisory) ─────────────────────────────"
if [ "$n_colors" -gt 0 ]; then
  echo "⚠ $n_colors hardcoded color literal(s) outside theme.css (Golden Rule 2):"
  printf '%s\n' "$colors" | head -10 | sed 's/^/   /'
fi
if [ "$n_titles" -gt 0 ]; then
  echo "⚠ $n_titles native title= help on intrinsic element(s) — use FieldHelp/Tooltip:"
  printf '%s\n' "$titles" | head -10 | sed 's/^/   /'
fi
echo "Run the design-token-guardian / a11y-sentinel agent to triage. (advisory only)"
echo "────────────────────────────────────────────────────────────"
exit 0
