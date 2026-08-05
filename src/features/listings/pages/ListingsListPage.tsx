import { lazy, Suspense, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { DataTable } from '@/components/data-table/DataTable';
import { DataTablePagination } from '@/components/data-table/DataTablePagination';
import { MobileListCard } from '@/components/data-table/MobileListCard';
import { FilterBar } from '@/components/data-table/FilterBar';
import { ErrorState } from '@/components/feedback/ErrorState';
import { useTableUrlState } from '@/components/data-table/use-table-url-state';
import { exportCsv, exportXls } from '@/lib/export';
import { api, encodeListQuery } from '@/lib/api/client';
import type { Paginated } from '@/lib/api/types';
import { Can, usePermission } from '@/lib/permissions/permission-context';
import { parseFilters } from '@/lib/ai';
import type { Listing } from '../schemas/listing';
import { CATEGORY_LABELS, LOCATIONS, STATUS_LABELS } from '../data/taxonomy';
import { listingFilters } from '../data/filters';
import { listingFilterContext } from '../lib/nl-context';
import { listingColumns, type ListingsTableMeta } from '../components/listingColumns';
import { ListingStatusBadge } from '../components/ListingStatusBadge';
import { AiSuggestionBadge } from '../components/AiSuggestionBadge';
import { ListingsKpiStrip } from '../components/ListingsKpiStrip';
import { ListingsViewSwitch, parseListingView } from '../components/ListingsViewSwitch';
import { ListingKanban } from '../components/ListingKanban';
import { ListingGallery } from '../components/ListingGallery';
import { useListings, useListingStats } from '../api/queries';
import { useSetListingStatus } from '../api/mutations';

// Leaflet is heavy — load the map view only when it is actually selected so it
// stays out of the main listings chunk (performance budget).
const ListingsMap = lazy(() => import('../components/ListingsMap').then((m) => ({ default: m.ListingsMap })));

/**
 * Parse Turkish free text into proposed listing filters via the shared,
 * deterministic `lib/ai` parser (single origin — the global assistant parses
 * through the same core). Behaviour is a superset of the old inline parser:
 * category / city / status plus price + m² ranges.
 */
function parseNaturalLanguage(text: string): Record<string, string | string[]> {
  return parseFilters(text, listingFilterContext()).filters;
}

export function ListingsListPage() {
  const state = useTableUrlState({ defaultPageSize: 25 });
  const { data, isLoading, isError, refetch } = useListings(state.query);
  const { data: stats, isLoading: statsLoading } = useListingStats();
  const setStatus = useSetListingStatus();
  const canEdit = usePermission('listing.edit');

  const view = parseListingView(state.view);
  const items = useMemo(() => data?.items ?? [], [data]);

  const tableMeta: ListingsTableMeta = {
    canEditStatus: canEdit,
    ...(canEdit ? { onStatusChange: (id, status) => setStatus.mutate({ id, status }) } : {}),
  };

  const filterBar = (
    <FilterBar
      tableKey="listings"
      filters={listingFilters}
      state={state}
      searchPlaceholder="İlan başlığı ara…"
      onNaturalLanguage={parseNaturalLanguage}
    />
  );

  const pagination = (
    <DataTablePagination
      page={state.pagination.pageIndex + 1}
      pageSize={state.pagination.pageSize}
      total={data?.total ?? 0}
      selectedCount={0}
      onPageChange={state.setPage}
      onPageSizeChange={state.setPageSize}
    />
  );

  return (
    <div className="space-y-4">
      <header className="animate-fade-in flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold sm:text-2xl">İlanlar</h1>
          <p className="text-muted-foreground text-sm">Konut, işyeri, arsa, devremülk ve turistik ilanları.</p>
        </div>
        <div className="flex items-center gap-2">
          <ListingsViewSwitch value={view} onChange={(v) => state.setView(v === 'table' ? null : v)} />
          <Button asChild variant="outline">
            <Link to="/listings/moderation" data-action="navigate" data-entity="listing">
              Moderasyon Kuyruğu
            </Link>
          </Button>
          <Can permission="listing.edit">
            <Button asChild>
              <Link to="/listings/create" data-action="create" data-entity="listing">
                <Plus className="size-4" /> Yeni ilan
              </Link>
            </Button>
          </Can>
        </div>
      </header>

      <ListingsKpiStrip {...(stats ? { stats } : {})} isLoading={statsLoading} />

      {view === 'table' ? (
        <DataTable
          columns={listingColumns}
          data={items}
          total={data?.total ?? 0}
          state={state}
          getRowId={(r) => r.id}
          meta={tableMeta}
          isLoading={isLoading}
          isError={isError}
          onRetry={() => void refetch()}
          filterBar={filterBar}
          renderSubRow={(row) => (
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm xl:grid-cols-4">
              <Detail label="İlan No" value={row.id} />
              <Detail label="Ofis" value={row.agentName} />
              <Detail label="Brüt m²" value={row.attributes.grossArea?.toString() ?? '—'} />
              <Detail label="Oda" value={row.attributes.rooms ?? '—'} />
            </div>
          )}
          renderMobileCard={(row, selected, toggle) => (
            <MobileListCard
              title={row.title}
              to={`/listings/${row.id}`}
              entity="listing"
              selected={selected}
              onToggleSelect={toggle}
              selectLabel={`${row.title} satırını seç`}
              badges={
                <>
                  <ListingStatusBadge status={row.status} />
                  <AiSuggestionBadge suggestion={row.aiSuggestion} reasons={row.aiReasons} />
                </>
              }
              meta={[
                { label: 'Kategori', value: CATEGORY_LABELS[row.category] },
                { label: 'Şehir', value: LOCATIONS[row.il]?.label ?? row.il },
                { label: 'Fiyat', value: `${row.price.toLocaleString('tr-TR')} ₺`, full: true },
              ]}
            />
          )}
          bulkActions={(ids, _all, clear) => (
            <Can permission="listing.approve">
              <Button size="sm" variant="outline" onClick={clear}>
                {ids.length} ilanı incele
              </Button>
            </Can>
          )}
          onExport={async (format, scope, ctx) => {
            try {
              let listings: Listing[];
              if (scope === 'selection') {
                const ids = new Set(ctx.selectedIds);
                listings = ctx.pageRows.filter((r) => ids.has(r.id));
              } else if (scope === 'all') {
                const params = encodeListQuery({
                  page: 1,
                  pageSize: Math.max(data?.total ?? 1000, 1),
                  sort: state.query.sort,
                  filters: state.query.filters,
                });
                if (state.query.q) params.set('q', state.query.q);
                const res = await api.get<Paginated<Listing>>('/listings', params);
                listings = res.items;
              } else {
                listings = ctx.pageRows;
              }
              const headers = ['İlan No', 'Başlık', 'Kategori', 'Durum', 'Fiyat'];
              const rows = listings.map((r) => [
                r.id,
                r.title,
                CATEGORY_LABELS[r.category],
                STATUS_LABELS[r.status],
                String(r.price),
              ]);
              const exporter = format === 'xls' ? exportXls : exportCsv;
              exporter('ilanlar', headers, rows);
              toast.success(`${rows.length} kayıt ${format.toUpperCase()} olarak dışa aktarıldı.`);
            } catch {
              toast.error('Dışa aktarma başarısız.');
            }
          }}
        />
      ) : (
        <div className="space-y-3">
          {filterBar}
          {isError ? (
            <ErrorState onRetry={() => void refetch()} />
          ) : isLoading ? (
            <div
              role="status"
              aria-label="İlanlar yükleniyor"
              className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
            >
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-44 w-full rounded-xl" />
              ))}
            </div>
          ) : (
            <>
              {view === 'kanban' && <ListingKanban listings={items} />}
              {view === 'gallery' && <ListingGallery listings={items} />}
              {view === 'map' && (
                <Suspense fallback={<Skeleton className="h-[520px] w-full rounded-lg" />}>
                  <ListingsMap listings={items} />
                </Suspense>
              )}
            </>
          )}
          {pagination}
        </div>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}
