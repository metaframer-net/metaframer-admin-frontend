import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

import { DataTable } from '@/components/data-table/DataTable';
import { MobileListCard } from '@/components/data-table/MobileListCard';
import { FilterBar } from '@/components/data-table/FilterBar';
import { useTableUrlState } from '@/components/data-table/use-table-url-state';
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { exportCsv, exportXls } from '@/lib/export';
import { api } from '@/lib/api/client';
import { Can } from '@/lib/permissions/permission-context';
import { CATEGORY_STATUS_LABELS } from '../data/categories';
import { categoryFilters } from '../data/filters';
import { categoryColumns, type CategoryTableMeta } from '../components/categoryColumns';
import { CategoryStatusBadge } from '../components/CategoryStatusBadge';
import { CategoryFormDialog } from '../components/CategoryFormDialog';
import { useCategories, categoryKeys } from '../api/queries';
import { useReorderCategories, useUpsertCategory } from '../api/mutations';
import { sortByOrder, type Category } from '../schemas/category';

function parseNaturalLanguage(text: string): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};
  const lower = text.toLocaleLowerCase('tr');
  if (lower.includes('arşiv') || lower.includes('arsiv')) out.status = 'archived';
  if (lower.includes('aktif')) out.status = 'active';
  return out;
}

export function CategoriesListPage() {
  const state = useTableUrlState({ defaultPageSize: 25 });
  const { data, isLoading, isError, refetch } = useCategories(state.query);
  const upsert = useUpsertCategory();
  const reorder = useReorderCategories(state.query);
  const navigate = useNavigate();

  const items = data?.items ?? [];
  const ordered = sortByOrder(items);
  // Reordering only makes sense on the unfiltered, unsorted natural-order view.
  const canReorder =
    state.query.sort.length === 0 &&
    Object.keys(state.query.filters).length === 0 &&
    state.query.q === '' &&
    ordered.length === (data?.total ?? 0);

  const meta: CategoryTableMeta = {
    canReorder,
    reordering: reorder.isPending,
    isFirst: (row) => ordered[0]?.id === row.id,
    isLast: (row) => ordered[ordered.length - 1]?.id === row.id,
    onMove: (row, dir) => {
      const index = ordered.findIndex((c) => c.id === row.id);
      const target = index + dir;
      if (target < 0 || target >= ordered.length) return;
      const ids = ordered.map((c) => c.id);
      [ids[index], ids[target]] = [ids[target]!, ids[index]!];
      reorder.mutate(ids);
    },
  };

  return (
    <div className="space-y-4">
      <header className="animate-fade-in flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Kategoriler &amp; Nitelikler</h1>
          <p className="text-muted-foreground text-sm">
            Emlak taksonomisi ve her kategoriye bağlı dinamik nitelik setleri. İlan formu bu tek kaynaktan beslenir.
          </p>
        </div>
        <Can permission="category.manage">
          <CategoryFormDialog
            onSubmit={async (values) => {
              const created = await upsert.mutateAsync({ values });
              navigate(`/categories/${created.id}`);
            }}
          />
        </Can>
      </header>

      <DataTable
        columns={categoryColumns}
        data={ordered}
        total={data?.total ?? 0}
        state={state}
        meta={meta}
        getRowId={(r) => r.id}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => void refetch()}
        emptyTitle="Kategori bulunamadı"
        emptyDescription="Filtreleri değiştirin ya da yeni bir kategori oluşturun."
        filterBar={
          <FilterBar
            tableKey="categories"
            filters={categoryFilters}
            state={state}
            searchPlaceholder="Kategori adı veya anahtar ara…"
            onNaturalLanguage={parseNaturalLanguage}
          />
        }
        bulkActions={(ids, _all, clear) => (
          <BulkCategoryActions
            categories={ordered.filter((c) => ids.includes(c.id))}
            clear={clear}
          />
        )}
        renderSubRow={(row) => (
          <div className="text-sm">
            <p className="text-muted-foreground">{row.description || '—'}</p>
            {row.attributes.length > 0 && (
              <p className="mt-1">
                <span className="text-muted-foreground text-xs">Nitelikler: </span>
                {sortByOrder(row.attributes)
                  .map((a) => a.label)
                  .join(', ')}
              </p>
            )}
          </div>
        )}
        renderMobileCard={(row, selected, toggle) => (
          <MobileListCard
            title={row.label}
            to={`/categories/${row.id}`}
            entity="category"
            selected={selected}
            onToggleSelect={toggle}
            selectLabel={`${row.label} satırını seç`}
            badges={<CategoryStatusBadge status={row.status} />}
            meta={[
              { label: 'Sıra', value: <span className="tabular-nums">{row.order + 1}</span> },
              { label: 'Nitelik', value: <span className="tabular-nums">{row.attributes.length}</span> },
              { label: 'Anahtar', value: <code className="text-muted-foreground text-xs">{row.key}</code>, full: true },
            ]}
          />
        )}
        onExport={(format) => {
          try {
            const headers = ['Sıra', 'Kategori', 'Anahtar', 'Nitelik Sayısı', 'Durum'];
            const rows = ordered.map((c: Category) => [
              String(c.order + 1),
              c.label,
              c.key,
              String(c.attributes.length),
              CATEGORY_STATUS_LABELS[c.status],
            ]);
            const exporter = format === 'xls' ? exportXls : exportCsv;
            exporter('kategoriler', headers, rows);
            toast.success(`${rows.length} kategori ${format.toUpperCase()} olarak dışa aktarıldı.`);
          } catch {
            toast.error('Dışa aktarma başarısız.');
          }
        }}
      />
    </div>
  );
}

/** Bulk-archive the selected categories (each write emits a category.archive audit entry). */
function BulkCategoryActions({ categories, clear }: { categories: Category[]; clear: () => void }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const archivable = categories.filter((c) => c.status !== 'archived');

  const run = async () => {
    try {
      await Promise.all(
        archivable.map((c) =>
          api.patch(`/categories/${c.id}`, {
            key: c.key,
            label: c.label,
            description: c.description,
            status: 'archived',
          }),
        ),
      );
      toast.success(`${archivable.length} kategori arşivlendi.`);
      void qc.invalidateQueries({ queryKey: categoryKeys.all });
      clear();
    } catch {
      toast.error('Toplu arşivleme başarısız.');
    }
  };

  return (
    <Can permission="category.manage">
      <Button
        variant="outline"
        size="sm"
        disabled={archivable.length === 0}
        onClick={() => setOpen(true)}
        data-action="bulk-archive"
        data-entity="category"
      >
        {archivable.length > 0 ? `${archivable.length} kategoriyi arşivle` : 'Zaten arşivli'}
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Kategorileri arşivle"
        description={`Seçili ${archivable.length} kategori arşivlenecek ve yeni ilanlarda gizlenecek. Bu işlem denetim kaydına yazılır.`}
        confirmLabel="Arşivle"
        onConfirm={run}
      />
    </Can>
  );
}
