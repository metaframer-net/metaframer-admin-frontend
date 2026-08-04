import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import type { DashboardInsights, DashboardStats, PeriodKpis } from './handlers';

export const dashboardKeys = {
  stats: ['dashboard', 'stats'] as const,
  insights: ['dashboard', 'insights'] as const,
};

export function useDashboardStats() {
  return useQuery({
    queryKey: dashboardKeys.stats,
    queryFn: () => api.get<DashboardStats>('/dashboard/stats'),
  });
}

export function useDashboardInsights() {
  return useQuery({
    queryKey: dashboardKeys.insights,
    queryFn: () => api.get<DashboardInsights>('/dashboard/insights'),
  });
}

export type { DashboardInsights, DashboardStats, PeriodKpis };
