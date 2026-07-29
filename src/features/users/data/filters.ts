import type { FilterConfig } from '@/components/data-table/types';
import { ilOptions } from '@/features/listings/data/taxonomy';

import {
  USER_STATUSES,
  USER_STATUS_LABELS,
  USER_TYPES,
  USER_TYPE_LABELS,
  VERIFICATION_LABELS,
  VERIFICATION_LEVELS,
} from './users';

/*
 * Named filter configs — consumed BOTH by the toolbar `FilterBar` and by the
 * per-column header funnels (via column `meta.filter`), so the two surfaces
 * always write to the same URL params. Named exports (not an index map) keep
 * the type `FilterConfig` (not `FilterConfig | undefined`) under
 * `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes`.
 */
export const statusFilter: FilterConfig = {
  id: 'status',
  label: 'Durum',
  kind: 'faceted',
  multiple: true,
  options: USER_STATUSES.map((s) => ({ value: s, label: USER_STATUS_LABELS[s] })),
};
export const typeFilter: FilterConfig = {
  id: 'type',
  label: 'Tip',
  kind: 'faceted',
  multiple: true,
  options: USER_TYPES.map((t) => ({ value: t, label: USER_TYPE_LABELS[t] })),
};
export const verificationFilter: FilterConfig = {
  id: 'verification',
  label: 'Kimlik doğrulama',
  kind: 'faceted',
  multiple: true,
  options: VERIFICATION_LEVELS.map((v) => ({ value: v, label: VERIFICATION_LABELS[v] })),
};
/** Same param as `verificationFilter`; only the label differs on the offices list. */
export const officeDocumentFilter: FilterConfig = { ...verificationFilter, label: 'Ofis belgesi' };
export const trustFilter: FilterConfig = { id: 'trust', label: 'Güven skoru', kind: 'numberRange' };
export const ilFilter: FilterConfig = {
  id: 'il',
  label: 'Şehir',
  kind: 'faceted',
  multiple: false,
  options: ilOptions(),
};

/** Toolbar FilterBar order — users list. */
export const userFilters: FilterConfig[] = [statusFilter, typeFilter, verificationFilter, trustFilter, ilFilter];

/**
 * Toolbar FilterBar order — offices sub-list (type is locked to `office`).
 * Mirrors the columns that carry a header funnel so every active filter also
 * gets a chip, no matter which surface set it.
 */
export const officeFilters: FilterConfig[] = [statusFilter, officeDocumentFilter, trustFilter, ilFilter];
