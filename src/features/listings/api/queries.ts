import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { api, encodeListQuery } from '@/lib/api/client';
import type { Paginated } from '@/lib/api/types';
import type { TableQuery } from '@/components/data-table/types';
import type { Listing } from '../schemas/listing';

export const listingKeys = {
  all: ['listings'] as const,
  list: (query: TableQuery) => ['listings', 'list', query] as const,
  detail: (id: string) => ['listings', 'detail', id] as const,
};

function toParams(query: TableQuery): URLSearchParams {
  const params = encodeListQuery({
    page: query.page,
    pageSize: query.pageSize,
    sort: query.sort,
    filters: query.filters,
  });
  if (query.q) params.set('q', query.q);
  return params;
}

/** Server-driven listings list (paginated envelope). */
export function useListings(query: TableQuery) {
  return useQuery({
    queryKey: listingKeys.list(query),
    queryFn: () => api.get<Paginated<Listing>>('/listings', toParams(query)),
    placeholderData: keepPreviousData,
  });
}

/** Aggregate KPI counts for the listings header strip. */
export interface ListingStats {
  total: number;
  pending: number;
  aiNok: number;
  active: number;
}

export function useListingStats() {
  return useQuery({
    queryKey: [...listingKeys.all, 'stats'] as const,
    queryFn: () => api.get<ListingStats>('/listings/stats'),
  });
}

/** Single listing detail. */
export function useListing(id: string | undefined) {
  return useQuery({
    queryKey: listingKeys.detail(id ?? ''),
    queryFn: () => api.get<Listing>(`/listings/${id}`),
    enabled: Boolean(id),
  });
}
