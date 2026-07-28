import { useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { ChevronRight } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DataTable } from './DataTable';
import { FilterBar } from './FilterBar';
import { useTableUrlState } from './use-table-url-state';
import { exportCsv } from '@/lib/export';
import type { FilterConfig } from './types';

export interface DemoRow {
  id: string;
  title: string;
  category: string;
  status: 'active' | 'pending' | 'rejected';
  price: number;
  area: number;
  city: string;
}

const CATEGORIES = ['Konut', 'İşyeri', 'Arsa', 'Devremülk', 'Turistik'];
const CITIES = ['İstanbul', 'Ankara', 'İzmir', 'Bursa', 'Antalya'];
const STATUSES: DemoRow['status'][] = ['active', 'pending', 'rejected'];

// Deterministic dataset (no Math.random — stable across test runs).
export const DEMO_ROWS: DemoRow[] = Array.from({ length: 120 }, (_, i) => ({
  id: `L-${1000 + i}`,
  title: `İlan ${i + 1} — ${CATEGORIES[i % CATEGORIES.length]}`,
  category: CATEGORIES[i % CATEGORIES.length]!,
  status: STATUSES[i % STATUSES.length]!,
  price: 500_000 + (i % 40) * 125_000,
  area: 60 + (i % 25) * 12,
  city: CITIES[i % CITIES.length]!,
}));

const STATUS_LABEL: Record<DemoRow['status'], string> = {
  active: 'Yayında',
  pending: 'Beklemede',
  rejected: 'Reddedildi',
};
const STATUS_VARIANT: Record<DemoRow['status'], 'success' | 'warning' | 'destructive'> = {
  active: 'success',
  pending: 'warning',
  rejected: 'destructive',
};

const statusFilter: FilterConfig = {
  id: 'status',
  label: 'Durum',
  kind: 'faceted',
  multiple: true,
  options: STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s], count: DEMO_ROWS.filter((r) => r.status === s).length })),
};
const categoryFilter: FilterConfig = {
  id: 'category',
  label: 'Kategori',
  kind: 'faceted',
  multiple: true,
  options: CATEGORIES.map((c) => ({ value: c, label: c, count: DEMO_ROWS.filter((r) => r.category === c).length })),
};
const priceFilter: FilterConfig = { id: 'price', label: 'Fiyat', kind: 'numberRange', unit: '₺' };
const filters: FilterConfig[] = [statusFilter, categoryFilter, priceFilter];

export const demoColumns: ColumnDef<DemoRow>[] = [
  {
    id: 'select',
    enableSorting: false,
    enableHiding: false,
    size: 44,
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllRowsSelected() ? true : table.getIsSomeRowsSelected() ? 'indeterminate' : false}
        onCheckedChange={(v) => table.toggleAllRowsSelected(!!v)}
        aria-label="Tümünü seç"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(v) => row.toggleSelected(!!v)}
        aria-label={`${row.original.title} satırını seç`}
      />
    ),
  },
  {
    id: 'expand',
    enableSorting: false,
    enableHiding: false,
    size: 40,
    header: () => null,
    cell: ({ row }) => (
      <button
        type="button"
        onClick={() => row.toggleExpanded()}
        aria-label={row.getIsExpanded() ? 'Detayı kapat' : 'Detayı aç'}
        className="hover:bg-accent inline-flex size-6 items-center justify-center rounded"
      >
        <ChevronRight className={`size-4 transition-transform ${row.getIsExpanded() ? 'rotate-90' : ''}`} />
      </button>
    ),
  },
  { accessorKey: 'title', header: 'Başlık', cell: ({ getValue }) => <span className="font-medium">{getValue<string>()}</span> },
  { accessorKey: 'category', header: 'Kategori', meta: { filter: categoryFilter } },
  {
    accessorKey: 'status',
    header: 'Durum',
    meta: { filter: statusFilter },
    cell: ({ getValue }) => {
      const s = getValue<DemoRow['status']>();
      return <Badge variant={STATUS_VARIANT[s]}>{STATUS_LABEL[s]}</Badge>;
    },
  },
  { accessorKey: 'city', header: 'Şehir' },
  {
    accessorKey: 'price',
    header: 'Fiyat',
    meta: { filter: priceFilter },
    cell: ({ getValue }) => <span className="tabular-nums">{getValue<number>().toLocaleString('tr-TR')} ₺</span>,
  },
  {
    accessorKey: 'area',
    header: 'm²',
    cell: ({ getValue }) => <span className="tabular-nums">{getValue<number>()}</span>,
  },
];

/** Client-side stand-in for the server: filters/sorts/paginates DEMO_ROWS. */
function query(rows: DemoRow[], q: ReturnType<typeof useTableUrlState>['query']): DemoRow[] {
  let out = rows;
  if (q.q) out = out.filter((r) => r.title.toLocaleLowerCase('tr').includes(q.q.toLocaleLowerCase('tr')));
  const status = q.filters.status;
  if (status) {
    const set = Array.isArray(status) ? status : [status];
    out = out.filter((r) => set.includes(r.status));
  }
  const category = q.filters.category;
  if (category) {
    const set = Array.isArray(category) ? category : [category];
    out = out.filter((r) => set.includes(r.category));
  }
  const priceMin = q.filters.priceMin;
  const priceMax = q.filters.priceMax;
  if (typeof priceMin === 'string' && priceMin) out = out.filter((r) => r.price >= Number(priceMin));
  if (typeof priceMax === 'string' && priceMax) out = out.filter((r) => r.price <= Number(priceMax));
  const sort = q.sort[0];
  if (sort) {
    out = [...out].sort((a, b) => {
      const av = a[sort.id as keyof DemoRow];
      const bv = b[sort.id as keyof DemoRow];
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sort.desc ? -cmp : cmp;
    });
  }
  return out;
}

/** Full DataTable demo wired to URL state — used across stories. */
export function DataTableDemo({ columnControls = false }: { columnControls?: boolean } = {}) {
  const state = useTableUrlState({ defaultPageSize: 10 });
  const filtered = useMemo(() => query(DEMO_ROWS, state.query), [state.query]);
  const page = state.pagination.pageIndex;
  const paged = filtered.slice(page * state.pagination.pageSize, (page + 1) * state.pagination.pageSize);

  return (
    <div className="p-4">
      <DataTable
        columns={demoColumns}
        data={paged}
        total={filtered.length}
        state={state}
        getRowId={(r) => r.id}
        columnControls={columnControls}
        filterBar={<FilterBar tableKey="demo" filters={filters} state={state} searchPlaceholder="İlan ara…" />}
        renderSubRow={(row) => (
          <div className="text-sm">
            <span className="text-muted-foreground">Detay:</span> {row.id} · {row.city} · {row.area} m²
          </div>
        )}
        bulkActions={(ids, _all, clear) => (
          <>
            <Button size="sm" variant="outline" onClick={clear}>
              {ids.length} kaydı onayla
            </Button>
          </>
        )}
        onExport={(format, _scope, ctx) => {
          if (format === 'csv') {
            exportCsv(
              'ilanlar',
              ['ID', 'Başlık', 'Durum'],
              ctx.pageRows.map((r) => [r.id, r.title, STATUS_LABEL[r.status]]),
            );
          }
        }}
      />
    </div>
  );
}
