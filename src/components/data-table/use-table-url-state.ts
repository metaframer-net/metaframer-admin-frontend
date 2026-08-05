import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { SortingState } from '@tanstack/react-table';

import type { SortSpec } from '@/lib/api/types';
import type { TableQuery } from './types';

const RESERVED = new Set(['page', 'pageSize', 'sort', 'q', 'view']);

export interface UseTableUrlStateOptions {
  defaultPageSize?: number;
}

export interface TableUrlState {
  /** TanStack pagination state (0-based index). */
  pagination: { pageIndex: number; pageSize: number };
  /** TanStack sorting state. */
  sorting: SortingState;
  /** Free-text search. */
  q: string;
  /** Active saved view id. */
  view: string;
  /** Flat filter params (everything not reserved). */
  filters: Record<string, string | string[]>;
  /** API query per the resource contract. */
  query: TableQuery;
  /** Current search string (without '?') for saving views. */
  search: string;

  setPage: (pageIndex: number) => void;
  setPageSize: (size: number) => void;
  setSorting: (updater: SortingState | ((prev: SortingState) => SortingState)) => void;
  setQuery: (q: string) => void;
  setFilter: (key: string, value: string | string[] | null) => void;
  /** Set multiple filters atomically in one URL update. */
  setFilters: (entries: Record<string, string | string[] | null>) => void;
  clearFilter: (key: string) => void;
  clearAll: () => void;
  setView: (view: string | null) => void;
  applySearch: (search: string) => void;
}

function parseSort(raw: string | null): SortingState {
  if (!raw) return [];
  return raw
    .split(',')
    .map((part) => {
      const [id, dir] = part.split(':');
      if (!id) return null;
      return { id, desc: dir === 'desc' };
    })
    .filter((s): s is { id: string; desc: boolean } => s !== null);
}

function encodeSort(sorting: SortingState): string {
  return sorting.map((s) => `${s.id}:${s.desc ? 'desc' : 'asc'}`).join(',');
}

/**
 * URL is the single source of truth for table state (page/pageSize/sort/
 * filters/view/q). Deep-linkable and shareable; back/forward works.
 */
export function useTableUrlState(options: UseTableUrlStateOptions = {}): TableUrlState {
  const { defaultPageSize = 25 } = options;
  const [searchParams, setSearchParams] = useSearchParams();

  const page = Number(searchParams.get('page') ?? '1');
  const pageSize = Number(searchParams.get('pageSize') ?? String(defaultPageSize));
  const sorting = parseSort(searchParams.get('sort'));
  const q = searchParams.get('q') ?? '';
  const view = searchParams.get('view') ?? '';

  const filters = useMemo(() => {
    const out: Record<string, string | string[]> = {};
    for (const key of new Set(searchParams.keys())) {
      if (RESERVED.has(key)) continue;
      const all = searchParams.getAll(key);
      out[key] = all.length > 1 ? all : (all[0] ?? '');
    }
    return out;
  }, [searchParams]);

  const mutate = useCallback(
    (fn: (params: URLSearchParams) => void) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          fn(next);
          return next;
        },
        { replace: false },
      );
    },
    [setSearchParams],
  );

  const setPage = useCallback((pageIndex: number) => mutate((p) => p.set('page', String(pageIndex + 1))), [mutate]);

  const setPageSize = useCallback(
    (size: number) =>
      mutate((p) => {
        p.set('pageSize', String(size));
        p.set('page', '1');
      }),
    [mutate],
  );

  const setSorting = useCallback(
    (updater: SortingState | ((prev: SortingState) => SortingState)) =>
      mutate((p) => {
        const nextSorting = typeof updater === 'function' ? updater(parseSort(p.get('sort'))) : updater;
        if (nextSorting.length === 0) p.delete('sort');
        else p.set('sort', encodeSort(nextSorting));
        p.set('page', '1');
      }),
    [mutate],
  );

  const setQuery = useCallback(
    (value: string) =>
      mutate((p) => {
        if (value) p.set('q', value);
        else p.delete('q');
        p.set('page', '1');
      }),
    [mutate],
  );

  const setFilter = useCallback(
    (key: string, value: string | string[] | null) =>
      mutate((p) => {
        p.delete(key);
        if (Array.isArray(value)) value.forEach((v) => v && p.append(key, v));
        else if (value) p.set(key, value);
        p.set('page', '1');
      }),
    [mutate],
  );

  /** Set multiple filters in a single URL update (prevents race conditions). */
  const setFilters = useCallback(
    (entries: Record<string, string | string[] | null>) =>
      mutate((p) => {
        for (const [key, value] of Object.entries(entries)) {
          p.delete(key);
          if (Array.isArray(value)) value.forEach((v) => v && p.append(key, v));
          else if (value) p.set(key, value);
        }
        p.set('page', '1');
      }),
    [mutate],
  );

  const clearFilter = useCallback((key: string) => setFilter(key, null), [setFilter]);

  const clearAll = useCallback(
    () =>
      mutate((p) => {
        for (const key of [...new Set(p.keys())]) {
          if (!RESERVED.has(key)) p.delete(key);
        }
        p.delete('q');
        p.delete('sort');
        p.delete('view');
        p.set('page', '1');
      }),
    [mutate],
  );

  const setView = useCallback(
    (value: string | null) =>
      mutate((p) => {
        if (value) p.set('view', value);
        else p.delete('view');
      }),
    [mutate],
  );

  const applySearch = useCallback(
    (search: string) => setSearchParams(new URLSearchParams(search), { replace: false }),
    [setSearchParams],
  );

  const sortSpec: SortSpec[] = sorting.map((s) => ({ id: s.id, desc: s.desc }));

  const query: TableQuery = {
    page,
    pageSize,
    sort: sortSpec,
    filters,
    q,
  };

  return {
    pagination: { pageIndex: page - 1, pageSize },
    sorting,
    q,
    view,
    filters,
    query,
    search: searchParams.toString(),
    setPage,
    setPageSize,
    setSorting,
    setQuery,
    setFilter,
    setFilters,
    clearFilter,
    clearAll,
    setView,
    applySearch,
  };
}
