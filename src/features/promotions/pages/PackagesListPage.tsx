import { useState } from 'react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

import { DataTable } from '@/components/data-table/DataTable';
import { MobileListCard } from '@/components/data-table/MobileListCard';
import { FilterBar } from '@/components/data-table/FilterBar';
import { useTableUrlState } from '@/components/data-table/use-table-url-state';
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { exportCsv, exportXls } from '@/lib/export';
import { Can } from '@/lib/permissions/permission-context';
import { PACKAGE_KIND_LABELS, PACKAGE_STATUS_LABELS } from '../data/promotions';
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

export function PackagesListPage() {
  const state = useTableUrlState({ defaultPageSize: 25 });
  const { data, isLoading, isError, refetch } = usePackages(state.query);
  const upsert = useUpsertPackage();

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
          <h1 className="text-2xl font-semibold">Doping Paketleri</h1>
          <p className="text-muted-foreground text-sm">
            İlanları öne çıkaran doping paketleri; oluştur, düzenle ve arşivle. Değişiklikler denetim kaydına yazılır.
          </p>
        </div>
        <Can permission="promotion.sell">
          <PackageFormDialog
            onSubmit={async (values) => {
              await upsert.mutateAsync({ values: packageFormToPayload(values) });
            }}
          />
        </Can>
      </header>

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
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm md:grid-cols-4">
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
