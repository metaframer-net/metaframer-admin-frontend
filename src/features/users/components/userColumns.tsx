import type { ColumnDef } from '@tanstack/react-table';
import { Link } from 'react-router-dom';

import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { LOCATIONS } from '@/features/listings/data/taxonomy';
import { USER_TYPE_LABELS } from '../data/users';
import { ilFilter, statusFilter, trustFilter, typeFilter, verificationFilter } from '../data/filters';
import type { User } from '../schemas/user';
import { UserStatusBadge } from './UserStatusBadge';
import { TrustScoreMeter } from './TrustScoreMeter';
import { VerificationBadges } from './VerificationBadges';

export const userColumns: ColumnDef<User>[] = [
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
    header: 'Ad / Unvan',
    cell: ({ row }) => (
      <Link to={`/users/${row.original.id}`} className="font-medium hover:underline" data-action="open-detail" data-entity="user">
        {row.original.name}
      </Link>
    ),
  },
  {
    accessorKey: 'type',
    header: 'Tip',
    meta: { filter: typeFilter },
    cell: ({ getValue }) => USER_TYPE_LABELS[getValue<User['type']>()],
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
    accessorKey: 'verification',
    header: 'Doğrulama',
    enableSorting: false,
    meta: { filter: verificationFilter },
    cell: ({ row }) => <VerificationBadges verification={row.original.verification} hideNone />,
  },
  {
    accessorKey: 'listingsCount',
    header: 'İlan',
    cell: ({ getValue }) => <span className="tabular-nums">{getValue<number>()}</span>,
  },
  {
    accessorKey: 'il',
    header: 'Şehir',
    meta: { filter: ilFilter },
    cell: ({ getValue }) => LOCATIONS[getValue<string>()]?.label ?? getValue<string>(),
  },
  {
    accessorKey: 'joinedAt',
    header: 'Kayıt',
    cell: ({ getValue }) => (
      <span className="tabular-nums">{new Date(getValue<string>()).toLocaleDateString('tr-TR')}</span>
    ),
  },
  {
    id: 'actions',
    enableSorting: false,
    enableHiding: false,
    header: () => null,
    cell: ({ row }) => (
      <Button asChild variant="ghost" size="sm">
        <Link to={`/users/${row.original.id}`} data-action="open-detail" data-entity="user">
          Detay
        </Link>
      </Button>
    ),
  },
];
