import type { ColumnDef } from '@tanstack/react-table';
import { Link } from 'react-router-dom';
import { ArrowDown, ArrowUp } from 'lucide-react';

import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { statusFilter } from '../data/filters';
import type { Category } from '../schemas/category';
import { CategoryStatusBadge } from './CategoryStatusBadge';

/** Table meta the list page passes so rows can trigger reorder. */
export interface CategoryTableMeta {
  canReorder: boolean;
  reordering: boolean;
  onMove: (row: Category, dir: -1 | 1) => void;
  isFirst: (row: Category) => boolean;
  isLast: (row: Category) => boolean;
}

export const categoryColumns: ColumnDef<Category>[] = [
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
        aria-label={`${row.original.label} satırını seç`}
      />
    ),
  },
  {
    id: 'reorder',
    header: 'Sıra',
    enableSorting: false,
    enableHiding: false,
    cell: ({ row, table }) => {
      const meta = table.options.meta as CategoryTableMeta | undefined;
      if (!meta?.canReorder) {
        return <span className="text-muted-foreground tabular-nums">{row.original.order + 1}</span>;
      }
      return (
        <div className="flex items-center">
          <Button
            size="icon"
            variant="ghost"
            disabled={meta.reordering || meta.isFirst(row.original)}
            onClick={() => meta.onMove(row.original, -1)}
            aria-label={`${row.original.label} yukarı taşı`}
            data-action="move-up"
            data-entity="category"
          >
            <ArrowUp className="size-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            disabled={meta.reordering || meta.isLast(row.original)}
            onClick={() => meta.onMove(row.original, 1)}
            aria-label={`${row.original.label} aşağı taşı`}
            data-action="move-down"
            data-entity="category"
          >
            <ArrowDown className="size-4" />
          </Button>
        </div>
      );
    },
  },
  {
    accessorKey: 'label',
    header: 'Kategori',
    cell: ({ row }) => (
      <Link
        to={`/categories/${row.original.id}`}
        className="font-medium hover:underline"
        data-action="open-detail"
        data-entity="category"
      >
        {row.original.label}
      </Link>
    ),
  },
  {
    accessorKey: 'key',
    header: 'Anahtar',
    cell: ({ getValue }) => <code className="text-muted-foreground text-xs">{getValue<string>()}</code>,
  },
  {
    id: 'attributeCount',
    accessorFn: (row) => row.attributes.length,
    header: 'Nitelik',
    enableSorting: false,
    cell: ({ row }) => <span className="tabular-nums">{row.original.attributes.length}</span>,
  },
  {
    accessorKey: 'status',
    header: 'Durum',
    meta: { filter: statusFilter },
    cell: ({ getValue }) => <CategoryStatusBadge status={getValue<Category['status']>()} />,
  },
  {
    id: 'actions',
    enableSorting: false,
    enableHiding: false,
    header: () => null,
    cell: ({ row }) => (
      <Button asChild variant="ghost" size="sm">
        <Link to={`/categories/${row.original.id}`} data-action="open-detail" data-entity="category">
          Düzenle
        </Link>
      </Button>
    ),
  },
];
