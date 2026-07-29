import type { ColumnDef } from '@tanstack/react-table';
import { Link } from 'react-router-dom';

import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { LOCATIONS } from '@/features/listings/data/taxonomy';
import { ilFilter, officeDocumentFilter, statusFilter, trustFilter } from '../data/filters';
import type { User } from '../schemas/user';
import { UserStatusBadge } from './UserStatusBadge';
import { TrustScoreMeter } from './TrustScoreMeter';
import { VerificationBadges } from './VerificationBadges';

/** Columns for the offices sub-list (users with type='office'). */
export const officeColumns: ColumnDef<User>[] = [
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
        aria-label={`${row.original.name} satırını seç`}
      />
    ),
  },
  {
    accessorKey: 'name',
    header: 'Unvan',
    cell: ({ row }) => (
      <Link to={`/users/${row.original.id}`} className="font-medium hover:underline" data-action="open-detail" data-entity="agent">
        {row.original.name}
      </Link>
    ),
  },
  {
    id: 'taxId',
    header: 'Vergi No',
    enableSorting: false,
    cell: ({ row }) => <span className="tabular-nums">{row.original.office?.taxId ?? '—'}</span>,
  },
  {
    accessorKey: 'status',
    header: 'Durum',
    meta: { filter: statusFilter },
    cell: ({ getValue }) => <UserStatusBadge status={getValue<User['status']>()} />,
  },
  {
    accessorKey: 'trustScore',
    header: 'Güven',
    meta: { filter: trustFilter },
    cell: ({ getValue }) => (
      <div className="w-32">
        <TrustScoreMeter score={getValue<number>()} compact />
      </div>
    ),
  },
  {
    id: 'verification',
    header: 'Doğrulama',
    enableSorting: false,
    meta: { filter: officeDocumentFilter },
    cell: ({ row }) => <VerificationBadges verification={row.original.verification} hideNone />,
  },
  {
    id: 'agents',
    header: 'Üye Danışman',
    enableSorting: false,
    cell: ({ row }) => <span className="tabular-nums">{row.original.office?.memberAgents.length ?? 0}</span>,
  },
  {
    accessorKey: 'il',
    header: 'Şehir',
    meta: { filter: ilFilter },
    cell: ({ getValue }) => LOCATIONS[getValue<string>()]?.label ?? getValue<string>(),
  },
  {
    id: 'actions',
    enableSorting: false,
    enableHiding: false,
    header: () => null,
    cell: ({ row }) => (
      <Button asChild variant="ghost" size="sm">
        <Link to={`/users/${row.original.id}`} data-action="open-detail" data-entity="agent">
          Detay
        </Link>
      </Button>
    ),
  },
];
