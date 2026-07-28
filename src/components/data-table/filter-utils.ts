import type { FilterConfig } from './types';
import type { TableUrlState } from './use-table-url-state';

/** Normalize a URL filter value (string | string[] | undefined) to an array. */
export function asArray(v: string | string[] | undefined): string[] {
  if (v === undefined) return [];
  return Array.isArray(v) ? v : v ? [v] : [];
}

/**
 * How many active values a filter currently has, for the header/toolbar active
 * indicator. Ranges count as 1 when either bound is set (a filled/empty state,
 * never color-only).
 */
export function filterActiveCount(filter: FilterConfig, state: TableUrlState): number {
  switch (filter.kind) {
    case 'faceted':
      return asArray(state.filters[filter.id]).length;
    case 'search':
      return state.filters[filter.id] ? 1 : 0;
    case 'numberRange':
      return state.filters[`${filter.id}Min`] || state.filters[`${filter.id}Max`] ? 1 : 0;
    case 'dateRange':
      return state.filters[`${filter.id}From`] || state.filters[`${filter.id}To`] ? 1 : 0;
    default:
      return 0;
  }
}
