import type { FilterConfig } from '@/components/data-table/types';

import {
  PACKAGE_KINDS,
  PACKAGE_KIND_LABELS,
  PACKAGE_STATUSES,
  PACKAGE_STATUS_LABELS,
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUSES,
  PAYMENT_STATUS_LABELS,
} from './promotions';

/*
 * Named filter configs — consumed BOTH by the toolbar `FilterBar` and by the
 * per-column header funnels (via column `meta.filter`), so the two surfaces
 * always write to the same URL params.
 */
export const packageStatusFilter: FilterConfig = {
  id: 'status',
  label: 'Durum',
  kind: 'faceted',
  multiple: true,
  options: PACKAGE_STATUSES.map((s) => ({ value: s, label: PACKAGE_STATUS_LABELS[s] })),
};
export const packageKindFilter: FilterConfig = {
  id: 'kind',
  label: 'Tür',
  kind: 'faceted',
  multiple: true,
  options: PACKAGE_KINDS.map((k) => ({ value: k, label: PACKAGE_KIND_LABELS[k] })),
};
export const paymentStatusFilter: FilterConfig = {
  id: 'status',
  label: 'Durum',
  kind: 'faceted',
  multiple: true,
  options: PAYMENT_STATUSES.map((s) => ({ value: s, label: PAYMENT_STATUS_LABELS[s] })),
};
export const paymentMethodFilter: FilterConfig = {
  id: 'method',
  label: 'Yöntem',
  kind: 'faceted',
  multiple: true,
  options: PAYMENT_METHODS.map((m) => ({ value: m, label: PAYMENT_METHOD_LABELS[m] })),
};
export const paymentDateFilter: FilterConfig = { id: 'createdAt', label: 'Tarih', kind: 'dateRange' };

/** Toolbar FilterBar order — packages list. */
export const packageFilters: FilterConfig[] = [packageStatusFilter, packageKindFilter];

/** Toolbar FilterBar order — payments list. */
export const paymentFilters: FilterConfig[] = [paymentStatusFilter, paymentMethodFilter, paymentDateFilter];
