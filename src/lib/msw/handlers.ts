import { http, HttpResponse } from 'msw';

import { API_BASE_URL } from '@/lib/api/client';
import type { Paginated } from '@/lib/api/types';
import { listingsHandlers } from '@/features/listings/api/handlers';
import { usersHandlers } from '@/features/users/api/handlers';
import { categoriesHandlers } from '@/features/categories/api/handlers';
import { locationsHandlers } from '@/features/locations/api/handlers';
import { reportsHandlers } from '@/features/messages/api/handlers';
import { promotionsHandlers } from '@/features/promotions/api/handlers';
import { dashboardHandlers } from '@/features/dashboard/api/handlers';
import { notificationsHandlers } from '@/features/notifications/api/handlers';
import { reportsHandlers as analyticsHandlers } from '@/features/reports/api/handlers';
import { auditHandlers } from '@/features/audit/api/handlers';
import { rbacHandlers } from '@/features/rbac/api/handlers';
import { settingsHandlers } from '@/features/settings/api/handlers';
import { authHandlers } from '@/features/auth/api/handlers';

/**
 * Demo endpoint proving the resource contract:
 * GET /{resource}?page&pageSize -> { items, total, page, pageSize }
 * Feature modules append their own handlers to this array (see create-feature).
 */
export interface PingItem {
  id: string;
  label: string;
  value: number;
}

const demoItems: PingItem[] = Array.from({ length: 42 }, (_, i) => ({
  id: `demo-${i + 1}`,
  label: `Öğe ${i + 1}`,
  value: (i + 1) * 3,
}));

export const demoHandlers = [
  http.get(`${API_BASE_URL}/ping`, ({ request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') ?? '1');
    const pageSize = Number(url.searchParams.get('pageSize') ?? '10');
    const start = (page - 1) * pageSize;
    const items = demoItems.slice(start, start + pageSize);
    const body: Paginated<PingItem> = {
      items,
      total: demoItems.length,
      page,
      pageSize,
    };
    return HttpResponse.json(body);
  }),
];

/** Aggregated handler registry. Features register here as they land. */
export const handlers = [
  ...demoHandlers,
  // Exact `/auth/*` routes (login/me/logout); no param-route prefix collision.
  ...authHandlers,
  ...listingsHandlers,
  ...usersHandlers,
  ...categoriesHandlers,
  ...locationsHandlers,
  // Exact `/reports/overview` must precede the messages `/reports/:id` param route.
  ...analyticsHandlers,
  ...reportsHandlers,
  ...promotionsHandlers,
  ...dashboardHandlers,
  ...notificationsHandlers,
  // Exact `/audit` route; no param-route prefix collision (audit is read-only).
  ...auditHandlers,
  // Exact `/rbac/matrix` routes; no param-route prefix collision.
  ...rbacHandlers,
  // Exact `/settings` route; no param-route prefix collision.
  ...settingsHandlers,
];
