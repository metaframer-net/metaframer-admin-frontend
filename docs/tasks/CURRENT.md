# Current Task
-> (none) — **Auth COMPLETE** (arc 032 → 034 + completeness arc 035 → 037 all done). Kullanıcının faz-faz commit'ini bekliyor.

## Auth completeness arc (035 → 037) — DONE (marathon, mevcut tasarımda; UI redesign sona bırakıldı)
- **035** — 2FA politika-tabanlı (opt-in + ayrıcalıklı rol zorunlu; süper-admin hardcode kaldırıldı; login'de zorunlu
  enrollment; kurtarma kodları; Settings → Güvenlik sekmesinden politika düzenlenir).
- **036** — Auth status/hata sayfaları: `/session-expired` (401-expiry AuthGate'ten yönlenir) · `/account/disabled`
  (askıya alınmış admin; login 403 → yönlenir) · `/unauthorized` (standalone 403) · `/auth/error`.
- **037** — Organizasyon/tenant: model + seed · `GET/POST /auth/organizations[/active]` · **OrgSwitcher** (Topbar,
  tek-org'da gizli) · `/select-organization` (AuthGate'li shell'siz picker). SSO YOK (karar).
- **Kapsam-dışı (bilerek):** `/register`, magic-link, `/login/password`, `/onboarding`, `/verify-email-change`, SSO.
- UI redesign: `docs/mockups/design-directions.html` (D1–D4) — sona bırakıldı.
- Nihai doğrulama (oturmuş ağaç): typecheck/lint(0 hata)/build/build-storybook yeşil · **`npm run test` 1214/1214**.
- ⚠️ Paralel bir oturum aynı ağaçta dashboard/sidebar/CRM işi yaptı; auth dosyalarını **açık `git add` listeleriyle**
  ayrı commit'le (final rapordaki listeler). Detay checkpoint'ler: `docs/tasks/PROGRESS.md`.

Mode: TASK. Sıradaki: kullanıcının faz-faz manuel commit'leri (mesajlar hazır) → sonra UI redesign veya yeni hedef.

---

## Archived: Auth arc COMPLETE (Tasks 032 → 034 all done). Marathon; kullanıcının faz-faz commit'ini bekliyor.

Teslim edilen (hepsi MSW-simüle, FastAPI'ye tak-çalıştır): Login (Variant A) · oturum boot/kalıcılık (`GET /auth/me`) ·
`AuthGate` (RBAC guard'dan önce) · çıkış · `client.ts` Bearer + merkezî 401 · şifre kurtarma (forgot/reset) · admin
daveti · 2FA (TOTP adımı) · hesap güvenliği (`/account/security`: şifre/2FA/oturumlar) · idle-lock re-auth · token
yenileme · auth denetim kaydı. Login tasarımı `docs/mockups/auth-login-variants.html`'den Variant A seçildi.
Doğrulama: typecheck/lint(0 hata)/build/build-storybook yeşil; **`npm run test` 1093/1093 yeşil**.
Görev dosyaları: `032-auth-core.md` (+ 033/034 PROGRESS.md'de özetli). Detay checkpoint'ler: `docs/tasks/PROGRESS.md`.

Mode: TASK. Sıradaki: kullanıcının faz-faz manuel commit'leri (mesajlar final raporda) → yeni hedef gelene kadar backlog boş.

---

## Archived: Auth arc başlangıcı (artık tamamlandı)
-> **032 — Auth Core** (`docs/tasks/032-auth-core.md`). Auth arc (032 → 034) başlıyor.

## Auth arc — neden ve ne
Proje bugün eksiksiz **RBAC/yetkilendirme** katmanına sahip (`lib/permissions`, `/rbac`, `RouteGuard`,
`Can`) ama **kimlik doğrulama (authentication) TAMAMEN SAHTE**: `permission-context.tsx` sabit bir
`DEFAULT_USER` ("Ahmet Yönetici", super-admin) döndürüyor, AppShell korumasız mount ediliyor,
`UserMenu`'daki "Çıkış yap" ölü buton, `client.ts`'te token/401 yok, MSW'de auth endpoint yok.
Bu arc o boşluğu **simüle backend'li (MSW)** gerçek auth ile kapatır. İç admin panel → self-signup YOK,
adminler davetle oluşturulur.

Arc planı (detay sırası gelince ilgili görev dosyasına yazılır):
- **032 — Auth Core** (AKTİF): `/login` · oturum önyükleme (`GET /auth/me`) · `AuthGate` (RBAC RouteGuard'dan
  ayrı ve önce) · çıkış (ölü butonu bağla) · `client.ts` Bearer+401 · `DEFAULT_USER` kaldır → gerçek auth store ·
  auth audit. **Temel — onsuz 033/034 olmaz.**
- **033 — Recovery & invite & 2FA:** `/forgot-password` · `/reset-password?token=` · `/accept-invite?token=` ·
  şifre sonrası 2FA/TOTP adımı (`/login/2fa`).
- **034 — Account security & session hardening:** `/account/security` (şifre değiştir · aktif oturumlar ·
  "her yerden çık" · 2FA yönet) · idle-timeout re-auth modalı · token refresh · auth denetim geçmişi.

Mode: TASK. Sıradaki adım: 032'yi uygula → verify (lint+typecheck+test+build) → `dod-reviewer` →
PROGRESS checkpoint → 033 görev dosyasını yaz → CURRENT ilerle → DUR → kullanıcı commit → `/clear`.

---

## Archived: Enterprise İlanlar arc COMPLETE (Tasks 028 → 031 all done, ADR 0007).

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
