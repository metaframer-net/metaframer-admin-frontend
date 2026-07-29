# Task 032 — Auth Core (Kimlik doğrulama temeli)

> **Auth arc (032 → 034).** Proje bugün eksiksiz bir **RBAC/yetkilendirme** katmanına sahip
> (`lib/permissions`, `/rbac`, `RouteGuard`, `Can`) ama **kimlik doğrulama (authentication)
> tamamen sahte**: `permission-context.tsx` sabit bir `DEFAULT_USER` ("Ahmet Yönetici",
> super-admin) döndürüyor ("_Mock signed-in user until real auth lands._"), AppShell korumasız
> mount ediliyor, `UserMenu`'daki "Çıkış yap" ölü buton. Bu arc o boşluğu **simüle backend'li
> (MSW)** gerçek auth ile kapatır. **032 = temel**: onsuz 033/034 olmaz.

## Bağlam (kritik ayrım)
Bu bir **iç (internal) admin panel** — roller (`super-admin/moderator/support/finance/analyst`)
kurum personelidir, dış kullanıcı değil. Dolayısıyla:
- ❌ Herkese açık kayıt (self-signup) YOK. Adminler super-admin tarafından davetle oluşturulur (→ 033).
- ✅ Authentication (kim olduğun) ile authorization (ne yapabildiğin) AYRI katmanlardır. RBAC = ikincisi,
  ZATEN var ve **dokunulmaz**. Bu görev yalnızca BİRİNCİYİ ekler ve mevcut RBAC'ı besler.

## Objective
Sahte oturumu, MSW arkalı gerçek bir auth akışıyla değiştir:
1. **`/login`** sayfası (e-posta + şifre) — public, AppShell **dışında**.
2. **Oturum önyükleme** — app boot'ta token varsa `GET /auth/me` ile kullanıcıyı+rolü yükle; yoksa `/login`.
3. **Auth kapısı (gate)** — kimliği doğrulanmamış kullanıcı korumalı ağaca giremez; `?returnTo=` ile geri döner.
   (RBAC `RouteGuard`'dan AYRI ve ONDAN ÖNCE çalışır: önce "kimsin?", sonra "iznin var mı?".)
4. **Çıkış** — `UserMenu`'daki ölü "Çıkış yap" butonunu bağla → oturumu temizle → `/login`.
5. **401 işleme** — `lib/api/client.ts`'te merkezî: 401 → oturumu düşür → login (returnTo ile).
6. **Auth denetim kaydı** — `auth.login` / `auth.logout` / `auth.login_failed` girdileri mevcut `lib/audit`'e.

## Şablon / yeniden kullanım
- Mevcut **feature deseni**: `src/features/auth/` → `schemas/` (Zod-first) → `api/handlers.ts` (MSW) +
  `api/hooks.ts` (TanStack Query) → `components/` → `pages/` → `data/` (seed). RBAC (014) ve Settings (015)
  yazma-dikeyi ritmini örnek al.
- **Session state:** bugün `SessionProvider` (`lib/permissions/permission-context.tsx`) sabit kullanıcı tutuyor
  ve `useSession()`/`usePermission()`/`Can`/`RouteGuard`/nav-filtreleme/`UserMenu`/`CommandPalette`/
  `CommandCenter` HEPSİ ondan besleniyor. **Kritik kısıt:** `useSession()` API'sini (özellikle `user` +
  `setRole` dev switcher) BOZMA — sadece iç kaynağını sabit `DEFAULT_USER`'dan gerçek auth state'e çevir.
  En az invaziv yol: `permission-context.tsx`'i yeni `AuthProvider`'ın üstüne kur ya da `SessionProvider`'ı
  auth store'dan besle. Var olan tüm tüketicilerin çalışmaya devam etmesi ŞART.
- **MSW registry:** `src/lib/msw/handlers.ts` feature handler'larını topluyor — auth handler'larını oraya kaydet.
  Test izolasyonu için `resetAuthDb()` (RBAC'taki `resetRbacDb()` gibi).
- **403 zaten var** (`src/app/pages/ForbiddenPage.tsx`); bu görev **401/oturum-yok** ekseninde çalışır, karıştırma.
- **Token simülasyonu:** gerçek JWT gerekmiyor. Opak bir mock token yeter (örn. `mock-<userId>-<ts>` — ama
  `Date.now()`/`Math.random()` script kısıtı YOK; bu app runtime, serbest). Token'ı `localStorage`'da tut
  (RBAC/layout persist deseniyle uyumlu). `client.ts` her isteğe `Authorization: Bearer <token>` ekler.

## Steps
1. **Şema/tip** (`features/auth/schemas`): `loginSchema` (email: geçerli e-posta, password: min uzunluk),
   `sessionUserSchema` (id/name/email/role — RBAC `Role` tipini yeniden kullan), `loginResponseSchema`
   (`{ token, user }`). Mevcut `SessionUser` (permission-context) ile alanları hizala; e-posta ekle.
2. **Seed data** (`features/auth/data`): 5 rolü kapsayan mock admin kullanıcı listesi (email + şifre +
   name + role). Örn. `super@arsam.net` / vb. Şifreler seed'de düz metin OK (mock backend). En az her rolden 1.
3. **MSW handlers** (`features/auth/api/handlers`):
   - `POST /auth/login` → geçerli kimlikte `{ token, user }`; geçersizde **401** (`{ message }`);
     art arda başarısızlıkta basit kilit mesajı (opsiyonel, küçük tut). Her denemede audit yaz
     (`auth.login` / `auth.login_failed`, resource `user:<id|email>`).
   - `GET /auth/me` → `Authorization` header'daki token'ı doğrula → `user` veya **401**.
   - `POST /auth/logout` → 204; audit `auth.logout`.
   - Runtime state modül içinde (token→user eşlemesi), `resetAuthDb()`.
4. **Auth store/context** (`features/auth` veya `lib/auth`): token persist (localStorage), `login()`/`logout()`,
   `status: 'loading' | 'authenticated' | 'unauthenticated'`, `user`. Boot'ta token varsa `GET /auth/me`.
   `permission-context`'i buna bağla (sabit `DEFAULT_USER` KALDIRILIR; `useSession` yüzeyi korunur).
   `setRole` dev switcher'ı: gerçek auth'ta anlamı değişir → **dev/Storybook-only** yap veya kaldır (PROGRESS'e yaz).
5. **hooks** (`features/auth/api/hooks`): `useLogin()` (mutation → token persist → `me` invalidate → returnTo'ya
   navigate + sonner), `useLogout()`, `useCurrentUser()` (`GET /auth/me`, boot query).
6. **client.ts** (`lib/api`): her isteğe `Authorization: Bearer <token>` ekle (token okuyucu enjekte et,
   döngüsel bağımlılık yapma); **401** yanıtında oturumu düşür + `/login?returnTo=`e yönlendir (tek noktadan).
7. **Login sayfası** (`features/auth/pages/LoginPage`): RHF + `zodResolver` + `loginSchema`; `FormField` +
   **FieldHelp zorunlu** (Golden Rule 6); "Beni hatırla"; hata durumu (401 → alan-üstü hata mesajı);
   loading/submitting; markanın OKLCH token'larıyla ortalanmış kart düzeni (verbatim klon YOK).
8. **Router refactor** (`app/router.tsx`): `/login` (+ ileride 033'ün public route'ları) AppShell **DIŞINDA**
   public ağaçta. Korumalı ağaç `<AuthGate>` (yeni) ile sarılır → `status==='unauthenticated'` ise
   `/login?returnTo`; `'loading'` ise boot iskeleti. `AuthGate` içinde mevcut `RouteGuard` (RBAC) aynen kalır.
   Basename/GitHub-Pages davranışını koru.
9. **UserMenu** (`components/shell/UserMenu`): "Çıkış yap" (`data-action="sign-out"`) → `useLogout()`;
   e-posta göster; rol-önizleme switcher'ı dev-only'e indir (üretimde gizle) — a11y/data-action koru.
10. **providers.tsx**: `AuthProvider`'ı doğru sıraya koy (Query içinde, Session/Layout dışında ya da uyumlu sıra).
    Storybook/test için `initialUser`/authenticated-mock enjeksiyonu (mevcut `SessionProvider` prop deseni gibi).
11. **Stories + testler** (tam DoD): `LoginPage` (Default/Loading/Empty/Error/Mobile + play: geçersiz kimlik →
    hata, geçerli → yönlendirme) + `AuthGate` davranış testi (unauth → redirect, auth → children) + handler
    unit testleri (login 200/401, `me` token doğrulama, logout + audit yazımı). `resetAuthDb()` ile izole et.
    Not: MSW app boot'ta prod'da da açık (`main.tsx` mock-only demo) — login gerçek MSW'ye gider, uyumu doğrula.

## Acceptance criteria
- [ ] `/login` çalışır: geçerli seed kimlikle giriş → korumalı app'e (returnTo'ya) yönlendirir; geçersizde 401 + hata.
- [ ] App boot: token yoksa `/login`; token varsa `GET /auth/me` ile oturum geri yüklenir (sayfa yenilemede kalıcı).
- [ ] `<AuthGate>` kimliksiz kullanıcıyı korumalı route'lardan tutar; `RouteGuard` (RBAC) ondan sonra çalışır.
- [ ] "Çıkış yap" gerçekten çıkış yapar (token temizlenir, `/login`); UserMenu e-posta gösterir.
- [ ] `client.ts` her isteğe Bearer token ekler; 401 → merkezî oturum düşürme + login redirect.
- [ ] Sabit `DEFAULT_USER` KALDIRILDI; `useSession()` yüzeyi ve tüm tüketiciler (nav/Can/RouteGuard/Command*) çalışır.
- [ ] Auth audit girdileri (`auth.login`/`auth.login_failed`/`auth.logout`) `lib/audit`'e yazılır ve `/audit`'te görünür.
- [ ] `LoginPage` FieldHelp zorunlu (GR6); tam story seti + play; page Error gerçek isError; touch target ≥44px.
- [ ] Nav schema'ya auth-domain route'ları (login) eklenmez (public, nav dışı); RBAC izin gerektirmez.
- [ ] Strict TS; `any`/`@ts-ignore` yok; token-only styling (GR2); verbatim referans-klon yok (GR1).
- [ ] Verify green (lint + typecheck + test + build) + build-storybook.
- [ ] DoD öz denetimi (`dod-reviewer`) PASS → PROGRESS checkpoint → **033 görev dosyasını yaz** → CURRENT'ı ilerlet
      → DUR → kullanıcı commit → `/clear`.

## Riskler / notlar
- **En büyük risk — `useSession` köprüsü:** `useSession`/`usePermission`/`Can`/`RouteGuard`/nav-utils/UserMenu/
  CommandPalette/CommandCenter HEPSİ mevcut context'e bağlı. İç kaynağı değiştirirken yüzeyi (özellikle `user`
  ve `setRole`) BOZMA. Tek bir yerde kes, geri kalan her şey çalışmaya devam etsin — en az invaziv yolu seç,
  seçimi PROGRESS'e yaz.
- **Router — public vs korumalı ayrımı:** bugün `/` doğrudan AppShell. `/login` AppShell dışına çıkmalı; app
  içi tüm route'lar `AuthGate` arkasına. GitHub Pages basename + SPA 404 fallback + MSW-in-prod davranışını bozma.
- **Boot flash:** `status==='loading'` sırasında korumalı içeriği ya da login'i erken gösterme (yanıp sönme).
  PageSkeleton/boot iskeleti kullan.
- **Kapsam sınırı:** 2FA, şifre sıfırlama, davet/ilk-şifre → **033**. Hesap-güvenlik sayfası, aktif oturumlar,
  idle-timeout, token refresh → **034**. Bu görevde onları YAPMA; sadece temiz uzatma noktaları bırak
  (örn. login response'ta ileride `requires2fa` alanına yer aç ama implemente etme).
- **Güvenlik gerçekçiliği:** mock backend; düz-metin seed şifre ve opak token KABUL. Amaç frontend akışı + doğru
  UX/guardrail iskeletidir, gerçek kripto değil. Yorumla açıkça "mock" olduğunu belirt.
- **AI-first (GR4):** login formu ve çıkış aksiyonları `data-action`/`data-entity` taşımalı; login route public
  olduğu için `routeMeta.aiEntity` gerekmez ama tutarlıysa ekle.

## Auth arc — sonraki görevler (just-in-time; detay sırası gelince yazılır)
- **033 — Auth recovery & invite & 2FA:** `/forgot-password` (sıfırlama iste) · `/reset-password?token=` ·
  `/accept-invite?token=` (super-admin'in Users/RBAC'ta oluşturduğu admin ilk şifresini kurar) · şifreden sonra
  **2FA/TOTP** adımı (`/login/2fa`, simüle 6-hane). 032'nin bıraktığı `requires2fa` uzatma noktasını kullanır.
- **034 — Account security & session hardening:** `/account/security` (şifre değiştir · aktif oturumlar/cihazlar ·
  "her yerden çık" · 2FA yönet) · idle/oturum zaman aşımı re-auth modalı · token refresh · auth denetim geçmişi paneli.
