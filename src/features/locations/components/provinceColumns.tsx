import type { ColumnDef } from '@tanstack/react-table';
import { Link } from 'react-router-dom';
import { ArrowDown, ArrowUp } from 'lucide-react';

import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { statusFilter } from '../data/filters';
import type { Province } from '../schemas/location';
import { LocationStatusBadge } from './LocationStatusBadge';

/** Table meta the list page passes so rows can trigger reorder. */
export interface ProvinceTableMeta {
  canReorder: boolean;
  reordering: boolean;
  onMove: (row: Province, dir: -1 | 1) => void;
  isFirst: (row: Province) => boolean;
  isLast: (row: Province) => boolean;
}

export const provinceColumns: ColumnDef<Province>[] = [
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
      const meta = table.options.meta as ProvinceTableMeta | undefined;
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
            data-entity="province"
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
            data-entity="province"
          >
            <ArrowDown className="size-4" />
          </Button>
        </div>
      );
    },
  },
  {
    accessorKey: 'code',
    header: 'Plaka',
    cell: ({ getValue }) => <span className="tabular-nums font-medium">{getValue<string>()}</span>,
  },
  {
    accessorKey: 'label',
    header: 'İl',
    cell: ({ row }) => (
      <Link
        to={`/locations/${row.original.id}`}
        className="font-medium hover:underline"
        data-action="open-detail"
        data-entity="province"
      >
        {row.original.label}
      </Link>
    ),
  },
  {
    id: 'districtCount',
    accessorFn: (row) => row.districts.length,
    header: 'İlçe',
    enableSorting: false,
    cell: ({ row }) => <span className="tabular-nums">{row.original.districts.length}</span>,
  },
  {
    accessorKey: 'status',
    header: 'Durum',
    meta: { filter: statusFilter },
    cell: ({ getValue }) => <LocationStatusBadge status={getValue<Province['status']>()} />,
  },
  {
    id: 'actions',
    enableSorting: false,
    enableHiding: false,
    header: () => null,
    cell: ({ row }) => (
      <Button asChild variant="ghost" size="sm">
        <Link to={`/locations/${row.original.id}`} data-action="open-detail" data-entity="province">
          Düzenle
        </Link>
      </Button>
    ),
  },
];
