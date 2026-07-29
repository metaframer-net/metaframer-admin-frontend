import type { FilterConfig } from '@/components/data-table/types';

import { ACTION_FAMILIES, ACTION_FAMILY_LABELS, ACTOR_KINDS, ACTOR_KIND_LABELS } from './audit';

/*
 * Named filter configs — consumed BOTH by the toolbar `FilterBar` and by the
 * per-column header funnels (via column `meta.filter`), so the two surfaces
 * always write to the same URL params.
 */
export const familyFilter: FilterConfig = {
  id: 'family',
  label: 'İşlem türü',
  kind: 'faceted',
  multiple: true,
  options: ACTION_FAMILIES.map((f) => ({ value: f, label: ACTION_FAMILY_LABELS[f] })),
};
export const actorKindFilter: FilterConfig = {
  id: 'actorKind',
  label: 'Aktör',
  kind: 'faceted',
  multiple: true,
  options: ACTOR_KINDS.map((k) => ({ value: k, label: ACTOR_KIND_LABELS[k] })),
};
export const tsFilter: FilterConfig = { id: 'ts', label: 'Tarih', kind: 'dateRange' };

/** Toolbar FilterBar order. */
export const auditFilters: FilterConfig[] = [familyFilter, actorKindFilter, tsFilter];
