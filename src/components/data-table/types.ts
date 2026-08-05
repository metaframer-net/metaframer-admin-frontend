import type { RowData } from '@tanstack/react-table';

import type { SortSpec } from '@/lib/api/types';

/** A faceted filter option with an optional live count from the API. */
export interface FacetOption {
  value: string;
  label: string;
  count?: number;
}

export type FilterKind = 'faceted' | 'numberRange' | 'dateRange' | 'search';

/** Declarative filter definition consumed by the FilterBar. */
export interface FilterConfig {
  id: string;
  label: string;
  kind: FilterKind;
  /** For faceted filters. */
  options?: FacetOption[];
  /** Unit suffix for numberRange (₺, m²). */
  unit?: string;
  /** Allow multiple selections (faceted). */
  multiple?: boolean;
  /** Slider lower bound for numberRange — enables dual-thumb slider when set with sliderMax. */
  sliderMin?: number | undefined;
  /** Slider upper bound for numberRange. */
  sliderMax?: number | undefined;
  /** Slider step size (default 1). */
  sliderStep?: number | undefined;
}

/** A named preset of filters + sort + column visibility. */
export interface SavedView {
  id: string;
  name: string;
  /** Serialized URL search string (without the leading '?'). */
  query: string;
}

/** The API query derived from URL state (resource contract). */
export interface TableQuery {
  page: number;
  pageSize: number;
  sort: SortSpec[];
  filters: Record<string, string | string[]>;
  q: string;
}

declare module '@tanstack/react-table' {
  /**
   * Column-level opt-in for a header filter (funnel popover). When set, the
   * DataTable renders a filter affordance on the LEFT of the column header that
   * writes to the same URL-synced filter state as the toolbar FilterBar.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    filter?: FilterConfig;
  }
}
