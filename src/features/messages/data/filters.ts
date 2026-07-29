import type { FilterConfig } from '@/components/data-table/types';

import {
  REASON_CATEGORIES,
  REASON_CATEGORY_LABELS,
  REPORT_PRIORITIES,
  REPORT_PRIORITY_LABELS,
  REPORT_STATUS_LABELS,
  REPORT_STATUSES,
  REPORT_SUBJECT_TYPE_LABELS,
  REPORT_SUBJECT_TYPES,
} from './reports';

/*
 * Named filter configs — consumed BOTH by the toolbar `FilterBar` and by the
 * per-column header funnels (via column `meta.filter`), so the two surfaces
 * always write to the same URL params.
 */
export const statusFilter: FilterConfig = {
  id: 'status',
  label: 'Durum',
  kind: 'faceted',
  multiple: true,
  options: REPORT_STATUSES.map((s) => ({ value: s, label: REPORT_STATUS_LABELS[s] })),
};
export const subjectTypeFilter: FilterConfig = {
  id: 'subjectType',
  label: 'Tür',
  kind: 'faceted',
  multiple: true,
  options: REPORT_SUBJECT_TYPES.map((t) => ({ value: t, label: REPORT_SUBJECT_TYPE_LABELS[t] })),
};
export const reasonCategoryFilter: FilterConfig = {
  id: 'reasonCategory',
  label: 'Sebep',
  kind: 'faceted',
  multiple: true,
  options: REASON_CATEGORIES.map((r) => ({ value: r, label: REASON_CATEGORY_LABELS[r] })),
};
export const priorityFilter: FilterConfig = {
  id: 'priority',
  label: 'Öncelik',
  kind: 'faceted',
  multiple: true,
  options: REPORT_PRIORITIES.map((p) => ({ value: p, label: REPORT_PRIORITY_LABELS[p] })),
};

/** Toolbar FilterBar order. */
export const reportFilters: FilterConfig[] = [
  statusFilter,
  subjectTypeFilter,
  reasonCategoryFilter,
  priorityFilter,
];
