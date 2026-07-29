import type { FilterConfig } from '@/components/data-table/types';

import { LOCATION_STATUSES, LOCATION_STATUS_LABELS } from './locations';

/** Shared by the toolbar `FilterBar` and the column header funnel (`meta.filter`). */
export const statusFilter: FilterConfig = {
  id: 'status',
  label: 'Durum',
  kind: 'faceted',
  multiple: true,
  options: LOCATION_STATUSES.map((s) => ({ value: s, label: LOCATION_STATUS_LABELS[s] })),
};

/** Toolbar FilterBar order. */
export const provinceFilters: FilterConfig[] = [statusFilter];
