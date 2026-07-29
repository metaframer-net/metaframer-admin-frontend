import type { ColumnDef } from '@tanstack/react-table';

import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { packageKindFilter, packageStatusFilter } from '../data/filters';
import { formatTry, type DopingPackage, type PackageFormValues } from '../schemas/promotion';
import { PackageKindBadge } from './PackageKindBadge';
import { PackageStatusBadge } from './PackageStatusBadge';
import { PackageFormDialog } from './PackageFormDialog';

/** Table meta so a row can open the edit dialog (wired by the list page). */
export interface PackageTableMeta {
  canEdit: boolean;
  onEdit: (pkg: DopingPackage, values: PackageFormValues) => void | Promise<void>;
}

export const packageColumns: ColumnDef<DopingPackage>[] = [
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
        aria-label={`${row.original.name} paketini seç`}
      />
    ),
  },
  {
    accessorKey: 'name',
    header: 'Paket',
    cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
  },
  {
    accessorKey: 'kind',
    header: 'Tür',
    meta: { filter: packageKindFilter },
    cell: ({ getValue }) => <PackageKindBadge kind={getValue<DopingPackage['kind']>()} />,
  },
  {
    accessorKey: 'durationDays',
    header: 'Süre',
    cell: ({ getValue }) => <span className="tabular-nums">{getValue<number>()} gün</span>,
  },
  {
    accessorKey: 'price',
    header: 'Fiyat',
    cell: ({ getValue }) => <span className="tabular-nums">{formatTry(getValue<number>())}</span>,
  },
  {
    accessorKey: 'status',
    header: 'Durum',
    meta: { filter: packageStatusFilter },
    cell: ({ getValue }) => <PackageStatusBadge status={getValue<DopingPackage['status']>()} />,
  },
  {
    id: 'actions',
    enableSorting: false,
    enableHiding: false,
    header: () => null,
    cell: ({ row, table }) => {
      const meta = table.options.meta as PackageTableMeta | undefined;
      if (!meta?.canEdit) return null;
      return (
        <PackageFormDialog
          pkg={row.original}
          onSubmit={(values) => meta.onEdit(row.original, values)}
          trigger={
            <Button variant="ghost" size="sm" data-action="edit" data-entity="package">
              Düzenle
            </Button>
          }
        />
      );
    },
  },
];
