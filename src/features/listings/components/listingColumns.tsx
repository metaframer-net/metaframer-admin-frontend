import type { ColumnDef } from '@tanstack/react-table';
import { Link } from 'react-router-dom';

import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { CATEGORY_LABELS, LOCATIONS } from '../data/taxonomy';
import { aiFilter, categoryFilter, ilFilter, priceFilter, statusFilter } from '../data/filters';
import type { Listing } from '../schemas/listing';
import { ListingStatusBadge } from './ListingStatusBadge';
import { AiSuggestionBadge } from './AiSuggestionBadge';
import { ListingStatusSelect } from './ListingStatusSelect';

/** Table `meta` contract for the listings table (inline row actions). */
export interface ListingsTableMeta {
  /** Wired to the optimistic status PATCH; omit to render read-only rows. */
  onStatusChange?: (id: string, status: Listing['status']) => void;
  canEditStatus?: boolean;
}

export const listingColumns: ColumnDef<Listing>[] = [
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
    accessorKey: 'title',
    header: 'Başlık',
    cell: ({ row }) => (
      <Link to={`/listings/${row.original.id}`} className="font-medium hover:underline" data-action="open-detail" data-entity="listing">
        {row.original.title}
      </Link>
    ),
  },
  {
    accessorKey: 'category',
    header: 'Kategori',
    meta: { filter: categoryFilter },
    cell: ({ getValue }) => CATEGORY_LABELS[getValue<Listing['category']>()],
  },
  {
    accessorKey: 'status',
    header: 'Durum',
    meta: { filter: statusFilter },
    cell: ({ getValue }) => <ListingStatusBadge status={getValue<Listing['status']>()} />,
  },
  {
    accessorKey: 'aiSuggestion',
    header: 'AI',
    enableSorting: false,
    meta: { filter: aiFilter },
    cell: ({ row }) => <AiSuggestionBadge suggestion={row.original.aiSuggestion} reasons={row.original.aiReasons} />,
  },
  {
    accessorKey: 'il',
    header: 'Şehir',
    meta: { filter: ilFilter },
    cell: ({ getValue }) => LOCATIONS[getValue<string>()]?.label ?? getValue<string>(),
  },
  {
    accessorKey: 'price',
    header: 'Fiyat',
    meta: { filter: priceFilter },
    cell: ({ getValue }) => <span className="tabular-nums">{getValue<number>().toLocaleString('tr-TR')} ₺</span>,
  },
  {
    id: 'actions',
    header: () => <span className="sr-only">İşlem</span>,
    enableSorting: false,
    enableHiding: false,
    cell: ({ row, table }) => {
      const meta = table.options.meta as ListingsTableMeta | undefined;
      return (
        <div className="flex items-center justify-end gap-1">
          {meta?.onStatusChange && (
            <ListingStatusSelect
              value={row.original.status}
              onChange={(status) => meta.onStatusChange?.(row.original.id, status)}
              disabled={!meta.canEditStatus}
            />
          )}
          <Button asChild variant="ghost" size="sm">
            <Link to={`/listings/${row.original.id}`} data-action="open-detail" data-entity="listing">
              Detay
            </Link>
          </Button>
        </div>
      );
    },
  },
];
