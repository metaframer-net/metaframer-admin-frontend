import type { FilterConfig } from '@/components/data-table/types';

import { CATEGORY_STATUSES, CATEGORY_STATUS_LABELS } from './categories';

/** Shared by the toolbar `FilterBar` and the column header funnel (`meta.filter`). */
export const statusFilter: FilterConfig = {
  id: 'status',
  label: 'Durum',
  kind: 'faceted',
  multiple: true,
  options: CATEGORY_STATUSES.map((s) => ({ value: s, label: CATEGORY_STATUS_LABELS[s] })),
};

/** Toolbar FilterBar order. */
export const categoryFilters: FilterConfig[] = [statusFilter];
