import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

import { DataTable } from '@/components/data-table/DataTable';
import { MobileListCard } from '@/components/data-table/MobileListCard';
import { FilterBar } from '@/components/data-table/FilterBar';
import { ViewSwitch, parseDataView, type DataView } from '@/components/data-table/ViewSwitch';
import { ViewPlaceholder } from '@/components/data-table/ViewPlaceholder';
import { DataGallery } from '@/components/data-table/DataGallery';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Skeleton } from '@/components/ui/skeleton';
import { DataTablePagination } from '@/components/data-table/DataTablePagination';
import { useTableUrlState } from '@/components/data-table/use-table-url-state';
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { exportCsv, exportXls } from '@/lib/export';
import { api } from '@/lib/api/client';
import { Can } from '@/lib/permissions/permission-context';
import { LOCATION_STATUS_LABELS } from '../data/locations';
import { provinceFilters } from '../data/filters';
import { provinceColumns, type ProvinceTableMeta } from '../components/provinceColumns';
import { LocationStatusBadge } from '../components/LocationStatusBadge';
import { ProvinceFormDialog } from '../components/ProvinceFormDialog';
import { useProvinces, provinceKeys } from '../api/queries';
import { useReorderProvinces, useUpsertProvince } from '../api/mutations';
import { sortByOrder, type Province } from '../schemas/location';

function parseNaturalLanguage(text: string): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};
  const lower = text.toLocaleLowerCase('tr');
  if (lower.includes('arşiv') || lower.includes('arsiv')) out.status = 'archived';
  if (lower.includes('aktif')) out.status = 'active';
  return out;
}

const LOCATION_VIEWS = ['table', 'gallery', 'map'] as const satisfies readonly DataView[];

export function LocationsListPage() {
  const state = useTableUrlState({ defaultPageSize: 25 });
  const view = parseDataView(state.view, LOCATION_VIEWS);
  const { data, isLoading, isError, refetch } = useProvinces(state.query);
  const upsert = useUpsertProvince();
  const reorder = useReorderProvinces(state.query);
  const navigate = useNavigate();

  const items = data?.items ?? [];
  const ordered = sortByOrder(items);
  // Reordering only makes sense on the unfiltered, unsorted natural-order view.
  const canReorder =
    state.query.sort.length === 0 &&
    Object.keys(state.query.filters).length === 0 &&
    state.query.q === '' &&
    ordered.length === (data?.total ?? 0);

  const meta: ProvinceTableMeta = {
    canReorder,
    reordering: reorder.isPending,
    isFirst: (row) => ordered[0]?.id === row.id,
    isLast: (row) => ordered[ordered.length - 1]?.id === row.id,
    onMove: (row, dir) => {
      const index = ordered.findIndex((p) => p.id === row.id);
      const target = index + dir;
      if (target < 0 || target >= ordered.length) return;
      const ids = ordered.map((p) => p.id);
      [ids[index], ids[target]] = [ids[target]!, ids[index]!];
      reorder.mutate(ids);
    },
  };

  return (
    <div className="space-y-4">
      <header className="animate-fade-in flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Lokasyonlar</h1>
          <p className="text-muted-foreground text-sm">
            İl → ilçe → mahalle coğrafi taksonomisi. İlan formu ve şehir filtreleri bu tek kaynaktan beslenir.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ViewSwitch value={view} onChange={(v) => state.setView(v === 'table' ? null : v)} views={LOCATION_VIEWS} entity="location" />
          <Can permission="location.manage">
            <ProvinceFormDialog
            onSubmit={async (values) => {
              const created = await upsert.mutateAsync({ values });
              navigate(`/locations/${created.id}`);
            }}
          />
          </Can>
        </div>
      </header>

      {view === 'table' ? (
        <DataTable
          columns={provinceColumns}
          data={ordered}
          total={data?.total ?? 0}
          state={state}
          meta={meta}
          getRowId={(r) => r.id}
          isLoading={isLoading}
          isError={isError}
          onRetry={() => void refetch()}
          emptyTitle="İl bulunamadı"
          emptyDescription="Filtreleri değiştirin ya da yeni bir il oluşturun."
          filterBar={
            <FilterBar
              tableKey="locations"
              filters={provinceFilters}
              state={state}
              searchPlaceholder="İl adı veya plaka ara…"
              onNaturalLanguage={parseNaturalLanguage}
            />
          }
          bulkActions={(ids, _all, clear) => (
          <BulkProvinceActions provinces={ordered.filter((p) => ids.includes(p.id))} clear={clear} />
        )}
        renderSubRow={(row) => (
          <div className="text-sm">
            {row.districts.length > 0 ? (
              <p>
                <span className="text-muted-foreground text-xs">İlçeler: </span>
                {sortByOrder(row.districts)
                  .map((d) => d.label)
                  .join(', ')}
              </p>
            ) : (
              <p className="text-muted-foreground">Bu ile bağlı ilçe yok.</p>
            )}
          </div>
        )}
        renderMobileCard={(row, selected, toggle) => (
          <MobileListCard
            title={row.label}
            to={`/locations/${row.id}`}
            entity="province"
            selected={selected}
            onToggleSelect={toggle}
            selectLabel={`${row.label} satırını seç`}
            badges={<LocationStatusBadge status={row.status} />}
            meta={[
              { label: 'Plaka', value: <span className="tabular-nums">{row.code}</span> },
              { label: 'İlçe', value: <span className="tabular-nums">{row.districts.length}</span> },
              { label: 'Sıra', value: <span className="tabular-nums">{row.order + 1}</span> },
            ]}
          />
        )}
        onExport={(format) => {
          try {
            const headers = ['Sıra', 'Plaka', 'İl', 'İlçe Sayısı', 'Durum'];
            const rows = ordered.map((p: Province) => [
              String(p.order + 1),
              p.code,
              p.label,
              String(p.districts.length),
              LOCATION_STATUS_LABELS[p.status],
            ]);
            const exporter = format === 'xls' ? exportXls : exportCsv;
            exporter('lokasyonlar', headers, rows);
            toast.success(`${rows.length} il ${format.toUpperCase()} olarak dışa aktarıldı.`);
          } catch {
            toast.error('Dışa aktarma başarısız.');
          }
        }}
      />
      ) : (
        <div className="space-y-3">
          <FilterBar
            tableKey="locations"
            filters={provinceFilters}
            state={state}
            searchPlaceholder="İl adı veya plaka ara…"
            onNaturalLanguage={parseNaturalLanguage}
          />
          {isError ? (
            <ErrorState onRetry={() => void refetch()} />
          ) : isLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" role="status" aria-label="Lokasyonlar yükleniyor">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-36 w-full rounded-xl" />
              ))}
            </div>
          ) : view === 'gallery' ? (
            <DataGallery
              data={ordered}
              getKey={(p) => p.id}
              renderCard={(p) => (
                <div className="bg-card overflow-hidden rounded-xl border border-border shadow-xs transition-shadow hover:shadow-md">
                  <div className="p-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold">
                        <span className="text-muted-foreground tabular-nums">{p.code}</span>{' '}
                        {p.label}
                      </h3>
                      <LocationStatusBadge status={p.status} />
                    </div>
                    <div className="mt-2 flex items-center justify-between border-t border-dashed border-border pt-2 text-xs">
                      <span className="text-muted-foreground tabular-nums">{p.districts.length} ilçe</span>
                      <span className="text-muted-foreground tabular-nums">Sıra: {p.order + 1}</span>
                    </div>
                  </div>
                </div>
              )}
            />
          ) : (
            <ViewPlaceholder view={view} entityLabel="Lokasyonlar" />
          )}
          <DataTablePagination
            page={state.pagination.pageIndex + 1}
            pageSize={state.pagination.pageSize}
            total={data?.total ?? 0}
            selectedCount={0}
            onPageChange={state.setPage}
            onPageSizeChange={state.setPageSize}
          />
        </div>
      )}
    </div>
  );
}

/** Bulk-archive the selected provinces (each write emits a location.archive audit entry). */
function BulkProvinceActions({ provinces, clear }: { provinces: Province[]; clear: () => void }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const archivable = provinces.filter((p) => p.status !== 'archived');

  const run = async () => {
    try {
      await Promise.all(
        archivable.map((p) =>
          api.patch(`/provinces/${p.id}`, { code: p.code, label: p.label, status: 'archived' }),
        ),
      );
      toast.success(`${archivable.length} il arşivlendi.`);
      void qc.invalidateQueries({ queryKey: provinceKeys.all });
      clear();
    } catch {
      toast.error('Toplu arşivleme başarısız.');
    }
  };

  return (
    <Can permission="location.manage">
      <Button
        variant="outline"
        size="sm"
        disabled={archivable.length === 0}
        onClick={() => setOpen(true)}
        data-action="bulk-archive"
        data-entity="province"
      >
        {archivable.length > 0 ? `${archivable.length} ili arşivle` : 'Zaten arşivli'}
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="İlleri arşivle"
        description={`Seçili ${archivable.length} il arşivlenecek ve yeni ilanlarda gizlenecek. Bu işlem denetim kaydına yazılır.`}
        confirmLabel="Arşivle"
        onConfirm={run}
      />
    </Can>
  );
}
