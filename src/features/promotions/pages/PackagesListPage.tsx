import { useState } from 'react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

import { DataTable } from '@/components/data-table/DataTable';
import { MobileListCard } from '@/components/data-table/MobileListCard';
import { FilterBar } from '@/components/data-table/FilterBar';
import { ViewSwitch, parseDataView, type DataView } from '@/components/data-table/ViewSwitch';
import { DataKanban, type KanbanColumn } from '@/components/data-table/DataKanban';
import { DataGallery } from '@/components/data-table/DataGallery';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Skeleton } from '@/components/ui/skeleton';
import { DataTablePagination } from '@/components/data-table/DataTablePagination';
import { useTableUrlState } from '@/components/data-table/use-table-url-state';
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { exportCsv, exportXls } from '@/lib/export';
import { Can } from '@/lib/permissions/permission-context';
import { PACKAGE_KIND_LABELS, PACKAGE_STATUS_LABELS, PACKAGE_STATUSES } from '../data/promotions';
import { packageFilters } from '../data/filters';
import { packageColumns, type PackageTableMeta } from '../components/packageColumns';
import { PackageFormDialog } from '../components/PackageFormDialog';
import { PackageStatusBadge } from '../components/PackageStatusBadge';
import { PackageKindBadge } from '../components/PackageKindBadge';
import { usePackages, packageKeys } from '../api/queries';
import { useArchivePackage, useUpsertPackage } from '../api/mutations';
import { formatTry, packageFormToPayload, sortByOrder, type DopingPackage } from '../schemas/promotion';

function parseNaturalLanguage(text: string): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};
  const lower = text.toLocaleLowerCase('tr');
  if (lower.includes('arşiv') || lower.includes('arsiv')) out.status = 'archived';
  if (lower.includes('aktif')) out.status = 'active';
  if (lower.includes('öne çık') || lower.includes('one cik')) out.kind = 'featured';
  if (lower.includes('vitrin')) out.kind = 'showcase';
  if (lower.includes('acil')) out.kind = 'urgent';
  if (lower.includes('üst sıra') || lower.includes('ust sira')) out.kind = 'top';
  return out;
}

const STATUS_DOT: Record<DopingPackage['status'], string> = {
  active: 'bg-success',
  archived: 'bg-muted-foreground',
};

const KANBAN_COLUMNS: KanbanColumn<DopingPackage['status']>[] = PACKAGE_STATUSES.map((s) => ({
  key: s,
  label: PACKAGE_STATUS_LABELS[s],
  dot: STATUS_DOT[s],
}));

const PACKAGE_VIEWS = ['table', 'kanban', 'gallery'] as const satisfies readonly DataView[];

export function PackagesListPage() {
  const state = useTableUrlState({ defaultPageSize: 25 });
  const { data, isLoading, isError, refetch } = usePackages(state.query);
  const upsert = useUpsertPackage();
  const view = parseDataView(state.view, PACKAGE_VIEWS);

  const items = data?.items ?? [];
  const ordered = sortByOrder(items);

  const meta: PackageTableMeta = {
    canEdit: true,
    onEdit: async (pkg, values) => {
      await upsert.mutateAsync({ id: pkg.id, values: packageFormToPayload(values) });
    },
  };

  return (
    <div className="space-y-4">
      <header className="animate-fade-in flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold sm:text-2xl">Doping Paketleri</h1>
          <p className="text-muted-foreground text-sm">
            İlanları öne çıkaran doping paketleri; oluştur, düzenle ve arşivle. Değişiklikler denetim kaydına yazılır.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ViewSwitch value={view} onChange={(v) => state.setView(v === 'table' ? null : v)} views={PACKAGE_VIEWS} entity="package" />
          <Can permission="promotion.sell">
            <PackageFormDialog
            onSubmit={async (values) => {
              await upsert.mutateAsync({ values: packageFormToPayload(values) });
            }}
          />
        </Can>
        </div>
      </header>

      {view === 'table' ? (
        <DataTable
          columns={packageColumns}
          data={ordered}
          total={data?.total ?? 0}
          state={state}
          meta={meta}
          getRowId={(r) => r.id}
          isLoading={isLoading}
          isError={isError}
          onRetry={() => void refetch()}
          emptyTitle="Paket bulunamadı"
          emptyDescription="Filtreleri değiştirin ya da yeni bir paket oluşturun."
          filterBar={
            <FilterBar
              tableKey="packages"
              filters={packageFilters}
              state={state}
              searchPlaceholder="Paket adı ara…"
              onNaturalLanguage={parseNaturalLanguage}
            />
          }
          renderSubRow={(row) => (
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm xl:grid-cols-4">
            <Detail label="Paket No" value={row.id} />
            <Detail label="Tür" value={PACKAGE_KIND_LABELS[row.kind]} />
            <Detail label="Süre" value={`${row.durationDays} gün`} />
            <Detail label="Sıra" value={String(row.order + 1)} />
          </div>
        )}
        renderMobileCard={(row, selected, toggle) => (
          <MobileListCard
            title={row.name}
            entity="package"
            selected={selected}
            onToggleSelect={toggle}
            selectLabel={`${row.name} paketini seç`}
            badges={
              <>
                <PackageStatusBadge status={row.status} />
                <PackageKindBadge kind={row.kind} />
              </>
            }
            meta={[
              { label: 'Süre', value: <span className="tabular-nums">{row.durationDays} gün</span> },
              { label: 'Fiyat', value: <span className="tabular-nums">{formatTry(row.price)}</span> },
            ]}
            actions={
              <Can permission="promotion.sell">
                <PackageFormDialog
                  pkg={row}
                  onSubmit={(values) => meta.onEdit(row, values)}
                  trigger={
                    <Button variant="outline" size="sm" data-action="edit" data-entity="package">
                      Düzenle
                    </Button>
                  }
                />
              </Can>
            }
          />
        )}
        bulkActions={(ids, _all, clear) => (
          <BulkPackageActions packages={ordered.filter((p) => ids.includes(p.id))} clear={clear} />
        )}
        onExport={(format) => {
          try {
            const headers = ['Paket', 'Tür', 'Süre (gün)', 'Fiyat', 'Durum'];
            const rows = ordered.map((p: DopingPackage) => [
              p.name,
              PACKAGE_KIND_LABELS[p.kind],
              String(p.durationDays),
              String(p.price),
              PACKAGE_STATUS_LABELS[p.status],
            ]);
            const exporter = format === 'xls' ? exportXls : exportCsv;
            exporter('doping-paketleri', headers, rows);
            toast.success(`${rows.length} paket ${format.toUpperCase()} olarak dışa aktarıldı.`);
          } catch {
            toast.error('Dışa aktarma başarısız.');
          }
        }}
      />
      ) : (
        <div className="space-y-3">
          <FilterBar
            tableKey="packages"
            filters={packageFilters}
            state={state}
            searchPlaceholder="Paket adı ara…"
            onNaturalLanguage={parseNaturalLanguage}
          />
          {isError ? (
            <ErrorState onRetry={() => void refetch()} />
          ) : isLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" role="status" aria-label="Paketler yükleniyor">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-36 w-full rounded-xl" />
              ))}
            </div>
          ) : view === 'kanban' ? (
            <DataKanban
              data={ordered}
              columns={KANBAN_COLUMNS}
              getStatus={(p) => p.status}
              getKey={(p) => p.id}
              entity="package"
              renderCard={(p) => (
                <div className="bg-card hover:border-primary/40 rounded-lg border border-border p-3 shadow-xs transition-colors">
                  <p className="text-sm font-semibold">{p.name}</p>
                  <div className="mt-1">
                    <PackageKindBadge kind={p.kind} />
                  </div>
                  <div className="mt-2 flex items-center justify-between border-t border-dashed border-border pt-2 text-xs">
                    <span className="tabular-nums font-medium">{formatTry(p.price)}</span>
                    <span className="text-muted-foreground tabular-nums">{p.durationDays} gün</span>
                  </div>
                </div>
              )}
            />
          ) : (
            <DataGallery
              data={ordered}
              getKey={(p) => p.id}
              renderCard={(p) => (
                <div className="bg-card overflow-hidden rounded-xl border border-border shadow-xs transition-shadow hover:shadow-md">
                  <div className="p-3">
                    <div className="flex items-center justify-between">
                      <h3 className="truncate text-sm font-semibold">{p.name}</h3>
                      <PackageStatusBadge status={p.status} />
                    </div>
                    <div className="mt-1">
                      <PackageKindBadge kind={p.kind} />
                    </div>
                    <div className="mt-2 flex items-center justify-between border-t border-dashed border-border pt-2 text-xs">
                      <span className="tabular-nums font-medium">{formatTry(p.price)}</span>
                      <span className="text-muted-foreground tabular-nums">{p.durationDays} gün</span>
                    </div>
                    <p className="text-muted-foreground mt-1 text-xs tabular-nums">Sıra: {p.order + 1}</p>
                  </div>
                </div>
              )}
            />
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

/** Bulk-archive the selected packages (each write emits a package.archive audit entry). */
function BulkPackageActions({ packages, clear }: { packages: DopingPackage[]; clear: () => void }) {
  const qc = useQueryClient();
  const archive = useArchivePackage();
  const [open, setOpen] = useState(false);
  const archivable = packages.filter((p) => p.status !== 'archived');

  const run = async () => {
    try {
      await Promise.all(archivable.map((p) => archive.mutateAsync(p)));
      toast.success(`${archivable.length} paket arşivlendi.`);
      void qc.invalidateQueries({ queryKey: packageKeys.all });
      clear();
    } catch {
      toast.error('Toplu arşivleme başarısız.');
    }
  };

  return (
    <Can permission="promotion.sell">
      <Button
        variant="outline"
        size="sm"
        disabled={archivable.length === 0}
        onClick={() => setOpen(true)}
        data-action="bulk-archive"
        data-entity="package"
      >
        {archivable.length > 0 ? `${archivable.length} paketi arşivle` : 'Zaten arşivli'}
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Paketleri arşivle"
        description={`Seçili ${archivable.length} paket arşivlenecek ve yeni satın almalarda gizlenecek. Bu işlem denetim kaydına yazılır.`}
        confirmLabel="Arşivle"
        onConfirm={run}
      />
    </Can>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="break-all tabular-nums">{value}</dd>
    </div>
  );
}
