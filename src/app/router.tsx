import { lazy } from 'react';
import { createBrowserRouter } from 'react-router-dom';

import { AppShell } from '@/components/shell/AppShell';
import { AuthGate } from '@/features/auth/components/AuthGate';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { TwoFactorPage } from '@/features/auth/pages/TwoFactorPage';
import { ForgotPasswordPage } from '@/features/auth/pages/ForgotPasswordPage';
import { ResetPasswordPage } from '@/features/auth/pages/ResetPasswordPage';
import { AcceptInvitePage } from '@/features/auth/pages/AcceptInvitePage';
import { PlaceholderPage } from './pages/PlaceholderPage';
import type { RouteHandle } from './route-meta';

/**
 * Route-level code-split: every page component is loaded on demand via
 * `React.lazy`, so the heavy verticals (recharts on Reports/Dashboard, Leaflet
 * on the listing detail + dashboard maps) leave the initial bundle. Each
 * `import('@/features/<x>')` specifier resolves to ONE shared chunk, so a
 * feature's pages travel together. `handle` (routeMeta) stays STATIC on the
 * routes so RouteGuard / breadcrumbs / RBAC resolve at the boundary BEFORE the
 * component chunk arrives; the Suspense fallback lives around <Outlet /> in
 * AppShell. `default` shims map the named page exports to lazy default exports.
 */
const named = <M, K extends keyof M>(loader: () => Promise<M>, key: K) =>
  lazy(async () => ({ default: (await loader())[key] as React.ComponentType }));

const DashboardPage = named(() => import('@/features/dashboard'), 'DashboardPage');
const ListingsListPage = named(() => import('@/features/listings'), 'ListingsListPage');
const ListingDetailPage = named(() => import('@/features/listings'), 'ListingDetailPage');
const ListingCreatePage = named(() => import('@/features/listings'), 'ListingCreatePage');
const ModerationQueuePage = named(() => import('@/features/listings'), 'ModerationQueuePage');
const UsersListPage = named(() => import('@/features/users'), 'UsersListPage');
const OfficesListPage = named(() => import('@/features/users'), 'OfficesListPage');
const UserDetailPage = named(() => import('@/features/users'), 'UserDetailPage');
const CategoriesListPage = named(() => import('@/features/categories'), 'CategoriesListPage');
const CategoryDetailPage = named(() => import('@/features/categories'), 'CategoryDetailPage');
const LocationsListPage = named(() => import('@/features/locations'), 'LocationsListPage');
const ProvinceDetailPage = named(() => import('@/features/locations'), 'ProvinceDetailPage');
const ReportsListPage = named(() => import('@/features/messages'), 'ReportsListPage');
const ReportDetailPage = named(() => import('@/features/messages'), 'ReportDetailPage');
const PackagesListPage = named(() => import('@/features/promotions'), 'PackagesListPage');
const PaymentsListPage = named(() => import('@/features/promotions'), 'PaymentsListPage');
const PaymentDetailPage = named(() => import('@/features/promotions'), 'PaymentDetailPage');
const ReportsPage = named(() => import('@/features/reports'), 'ReportsPage');
const AuditListPage = named(() => import('@/features/audit'), 'AuditListPage');
const RbacPage = named(() => import('@/features/rbac'), 'RbacPage');
const SettingsPage = named(() => import('@/features/settings'), 'SettingsPage');
const AccountSecurityPage = named(
  () => import('@/features/auth/pages/AccountSecurityPage'),
  'AccountSecurityPage',
);

const meta = (routeMeta: RouteHandle['routeMeta']): RouteHandle => ({ routeMeta });

/**
 * React Router v7 — DATA mode ONLY (createBrowserRouter). No framework mode,
 * no SSR/RSC. AppShell is the root layout; every route carries `handle.routeMeta`.
 */
/**
 * Under GitHub Pages the app is served from `/<repo>/`; strip that segment so
 * routes resolve. `import.meta.env.BASE_URL` is `/` in dev (→ `'/'`).
 */
const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/';

export const router = createBrowserRouter([
  // Public — outside AppShell and the auth gate (login is imported eagerly so
  // there is no code-split Suspense flash on the unauthenticated entry point).
  {
    path: '/login',
    Component: LoginPage,
    handle: meta({ title: 'Giriş yap', aiEntity: 'auth' }),
  },
  {
    path: '/login/2fa',
    Component: TwoFactorPage,
    handle: meta({ title: 'İki adımlı doğrulama', aiEntity: 'auth' }),
  },
  {
    path: '/forgot-password',
    Component: ForgotPasswordPage,
    handle: meta({ title: 'Şifremi unuttum', aiEntity: 'auth' }),
  },
  {
    path: '/reset-password',
    Component: ResetPasswordPage,
    handle: meta({ title: 'Şifre sıfırla', aiEntity: 'auth' }),
  },
  {
    path: '/accept-invite',
    Component: AcceptInvitePage,
    handle: meta({ title: 'Daveti tamamla', aiEntity: 'auth' }),
  },
  // Protected — the whole app tree behind the AuthGate (authentication), which
  // runs BEFORE AppShell's RouteGuard (authorization/RBAC).
  {
    path: '/',
    element: (
      <AuthGate>
        <AppShell />
      </AuthGate>
    ),
    children: [
      { index: true, Component: DashboardPage, handle: meta({ title: 'Genel Bakış', aiEntity: 'dashboard' }) },
      {
        path: 'listings',
        handle: meta({ title: 'İlanlar', permission: 'listing.view', aiEntity: 'listing' }),
        children: [
          { index: true, Component: ListingsListPage },
          {
            path: 'create',
            Component: ListingCreatePage,
            handle: meta({ title: 'Yeni İlan', permission: 'listing.edit', aiEntity: 'listing' }),
          },
          {
            path: 'moderation',
            Component: ModerationQueuePage,
            handle: meta({ title: 'Moderasyon Kuyruğu', permission: 'listing.approve', aiEntity: 'listing' }),
          },
          {
            path: ':id',
            Component: ListingDetailPage,
            handle: meta({ title: 'İlan Detayı', permission: 'listing.view', aiEntity: 'listing' }),
          },
        ],
      },
      {
        path: 'users',
        handle: meta({ title: 'Kullanıcılar & Ofisler', permission: 'user.view', aiEntity: 'user' }),
        children: [
          { index: true, Component: UsersListPage },
          {
            path: 'agents',
            Component: OfficesListPage,
            handle: meta({ title: 'Emlak Ofisleri', permission: 'agent.verify', aiEntity: 'agent' }),
          },
          {
            path: ':id',
            Component: UserDetailPage,
            handle: meta({ title: 'Kullanıcı Detayı', permission: 'user.view', aiEntity: 'user' }),
          },
        ],
      },
      {
        path: 'categories',
        handle: meta({ title: 'Kategoriler & Nitelikler', permission: 'category.manage', aiEntity: 'category' }),
        children: [
          { index: true, Component: CategoriesListPage },
          {
            path: ':id',
            Component: CategoryDetailPage,
            handle: meta({ title: 'Kategori Detayı', permission: 'category.manage', aiEntity: 'category' }),
          },
        ],
      },
      {
        path: 'locations',
        handle: meta({ title: 'Lokasyonlar', permission: 'location.manage', aiEntity: 'location' }),
        children: [
          { index: true, Component: LocationsListPage },
          {
            path: ':id',
            Component: ProvinceDetailPage,
            handle: meta({ title: 'İl Detayı', permission: 'location.manage', aiEntity: 'location' }),
          },
        ],
      },
      {
        path: 'promotions',
        handle: meta({ title: 'Doping & Ödemeler', permission: 'promotion.sell', aiEntity: 'promotion' }),
        children: [
          { index: true, Component: PackagesListPage },
          {
            path: 'payments',
            handle: meta({ title: 'Ödemeler & Faturalar', permission: 'payment.refund', aiEntity: 'payment' }),
            children: [
              { index: true, Component: PaymentsListPage },
              {
                path: ':id',
                Component: PaymentDetailPage,
                handle: meta({ title: 'Ödeme Detayı', permission: 'payment.refund', aiEntity: 'payment' }),
              },
            ],
          },
        ],
      },
      {
        path: 'messages',
        handle: meta({ title: 'Mesajlar & Şikayetler', permission: 'message.moderate', aiEntity: 'message' }),
        children: [
          { index: true, Component: ReportsListPage },
          {
            path: ':id',
            Component: ReportDetailPage,
            handle: meta({ title: 'Şikayet Detayı', permission: 'message.moderate', aiEntity: 'message' }),
          },
        ],
      },
      {
        path: 'reports',
        Component: ReportsPage,
        handle: meta({ title: 'Raporlar & Analitik', permission: 'report.view', aiEntity: 'report' }),
      },
      {
        path: 'audit',
        Component: AuditListPage,
        handle: meta({ title: 'Denetim Kaydı', permission: 'audit.view', aiEntity: 'audit' }),
      },
      {
        path: 'rbac',
        Component: RbacPage,
        handle: meta({ title: 'Roller & İzinler', permission: 'rbac.manage', aiEntity: 'rbac' }),
      },
      {
        path: 'settings',
        Component: SettingsPage,
        handle: meta({ title: 'Ayarlar', permission: 'settings.manage', aiEntity: 'settings' }),
      },
      {
        // Personal account security — every authenticated admin manages their own
        // (no RBAC permission gate).
        path: 'account/security',
        Component: AccountSecurityPage,
        handle: meta({ title: 'Hesap ve güvenlik', aiEntity: 'account' }),
      },
      { path: '*', Component: () => <PlaceholderPage title="Sayfa bulunamadı" description="Aradığınız sayfa mevcut değil." /> },
    ],
  },
], { basename });
