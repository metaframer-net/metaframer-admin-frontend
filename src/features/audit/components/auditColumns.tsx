import type { ColumnDef } from '@tanstack/react-table';

import { Checkbox } from '@/components/ui/checkbox';
import type { AuditEntry } from '@/lib/audit';
import { AuditActorBadge } from './AuditActorBadge';
import { actorKindFilter, familyFilter, tsFilter } from '../data/filters';
import { auditReason } from '../lib/audit-utils';

export const auditColumns: ColumnDef<AuditEntry>[] = [
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
        aria-label={`${row.original.action} kaydını seç`}
      />
    ),
  },
  {
    accessorKey: 'ts',
    header: 'Zaman',
    meta: { filter: tsFilter },
    cell: ({ getValue }) => (
      <span className="text-muted-foreground font-mono text-xs tabular-nums">
        {getValue<string>().slice(0, 16).replace('T', ' ')}
      </span>
    ),
  },
  {
    accessorKey: 'actor',
    header: 'Aktör',
    meta: { filter: actorKindFilter },
    cell: ({ getValue }) => <AuditActorBadge actor={getValue<string>()} />,
  },
  {
    accessorKey: 'action',
    header: 'İşlem',
    meta: { filter: familyFilter },
    cell: ({ getValue }) => <span className="font-medium">{getValue<string>()}</span>,
  },
  {
    accessorKey: 'resource',
    header: 'Kaynak',
    cell: ({ getValue }) => <span className="font-mono text-xs">{getValue<string>()}</span>,
  },
  {
    id: 'reason',
    header: 'Gerekçe',
    enableSorting: false,
    accessorFn: (row) => auditReason(row) ?? '',
    cell: ({ getValue }) => {
      const reason = getValue<string>();
      return reason ? <span className="text-sm">{reason}</span> : <span className="text-muted-foreground">—</span>;
    },
  },
];
