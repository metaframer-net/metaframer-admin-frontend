# Current Task
-> (none) — **Enterprise İlanlar arc COMPLETE** (Tasks 028 → 031 all done, ADR 0007).

Delivered from the (now-removed) `docs/mockups/enterprise-listings.html` mockup (Calm Signal; no
reference-palette clone): 028 column header filters (funnel, left of label) · 029 KPI strip + inline
status edit · 030 multi-view (table/kanban/gallery/map, `?view=`) · 031 create wizard rail +
final-step preview.
Verified: typecheck/lint/build green; listings+data-table story tests green; real-app smoke 0 errors.

**All of it is committed and pushed** — `main` == `origin/main` at `930b12b`, working tree clean
(re-verified 2026-07-29 after syncing 17 commits from origin: `npm ci`, lint 0 errors / 15 warnings,
`npm run build` green). Backlog empty until a new goal.

Also landed alongside the arc (same push): `ai-first-sentinel` + `performance-sentinel` agents,
the advisory mechanical Stop hook (`scripts/hooks/mechanical-check.sh`), the CI bundle-size budget
(`scripts/check-bundle-size.mjs`), the chrome-devtools MCP (`.mcp.json`), the EdgeDock magnify+lens
engine, the single-toggle command dock, and a dead-code/dependency prune.

---

## Archived: modernization arc COMPLETE (Tasks 000 → 027 all done).

Status: Task 027 (GitHub Pages deploy — app + Storybook + report) DONE — kullanıcı commit'ini bekliyor.
Sonrasında yeni bir hedef gelene kadar backlog boş.

Post-modernization sıra: 023 follow-up (DONE) → 024 dock pulse (DONE) → 025 edge nav dock (DONE) →
026 yönetici raporu (DONE) → **027 GitHub Pages deploy (DONE).**

## Task 027 — GitHub Pages deploy (DONE)
`.github/workflows/pages.yml` yazıldı: app + Storybook (`/storybook/`) + rapor (`/report.html`) tek Pages sitesine
(`https://aliiball.github.io/Arsam.net-admin-panel/`) dağıtılır. Runtime uyarlamaları: `vite.config.ts` env-driven
`base` (`APP_BASE`), `router.tsx` `basename = import.meta.env.BASE_URL`, `main.tsx` MSW artık prod'da da (mock-only
demo; sadece test hariç), `browser.ts` base-aware service worker URL. SPA deep-link fallback = built `index.html` →
`404.html`. `package.json`'a `preview` script. Doğrulandı: lint 0-error · typecheck · test 939/939 (warm) · build
(base=/ ve base=/Arsam.net-admin-panel/) · build-storybook · Playwright ile `vite preview` üzerinde 4/4 runtime
(app boot, deep-link /listings + MSW, storybook, report), 0 konsol hatası. dod-reviewer: NO blocking, "Ready to commit: YES".
Görev dosyası: `docs/tasks/027-github-pages-deploy.md`.

## ⚠️ TEK SEFERLİK MANUEL ADIM (otomatikleştirilemez)
İlk `main` push'unun yayınlanması için: repo **Settings → Pages → Source = "GitHub Actions"** seçilmeli.
Workflow bunu kendisi yapamaz.

Mode: TASK. Sıradaki adım: kullanıcı commit (027) + Pages "Source: GitHub Actions" ayarı → sonra ilk `main` push yayınlar.

Backlog / faz sırası: docs/tasks/BACKLOG.md
Resume: "docs/tasks/CURRENT.md ve PROGRESS.md'yi oku, devam et".
</content>
