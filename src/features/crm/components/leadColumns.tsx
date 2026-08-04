import { Link } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';

import { Checkbox } from '@/components/ui/checkbox';
import type { Lead } from '../schemas/lead';
import { leadStageFilter, leadPriorityFilter } from '../data/filters';
import { LeadStageBadge } from './LeadStageBadge';
import { LeadPriorityBadge } from './LeadPriorityBadge';

export const leadColumns: ColumnDef<Lead>[] = [
  {
    id: 'select',
    enableSorting: false,
    enableHiding: false,
    size: 44,
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
        aria-label="Tümünü seç"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(v) => row.toggleSelected(!!v)}
        aria-label={`Seç: ${row.original.title}`}
      />
    ),
  },
  {
    accessorKey: 'title',
    header: 'Başlık',
    size: 220,
    cell: ({ row }) => (
      <span className="font-medium">
        {row.original.title}
      </span>
    ),
  },
  {
    accessorKey: 'contactName',
    header: 'Kişi',
    size: 160,
    cell: ({ row }) => (
      <Link
        to={`/crm/${row.original.contactId}`}
        className="text-foreground hover:text-primary underline-offset-4 hover:underline"
        data-action="open-detail"
        data-entity="contact"
      >
        {row.original.contactName}
      </Link>
    ),
  },
  {
    accessorKey: 'stage',
    header: 'Aşama',
    size: 150,
    meta: { filter: leadStageFilter },
    cell: ({ row }) => <LeadStageBadge stage={row.original.stage} />,
  },
  {
    accessorKey: 'priority',
    header: 'Öncelik',
    size: 110,
    meta: { filter: leadPriorityFilter },
    cell: ({ row }) => <LeadPriorityBadge priority={row.original.priority} />,
  },
  {
    accessorKey: 'value',
    header: 'Değer (₺)',
    size: 130,
    cell: ({ row }) => (
      <span className="tabular-nums font-medium">
        {row.original.value.toLocaleString('tr-TR')}
      </span>
    ),
  },
  {
    accessorKey: 'probability',
    header: 'Olasılık',
    size: 100,
    cell: ({ row }) => (
      <span className="tabular-nums">{row.original.probability}%</span>
    ),
  },
  {
    accessorKey: 'expectedCloseDate',
    header: 'Kapanış Tarihi',
    size: 130,
    cell: ({ row }) =>
      row.original.expectedCloseDate
        ? new Date(row.original.expectedCloseDate).toLocaleDateString('tr-TR')
        : <span className="text-muted-foreground">—</span>,
  },
  {
    accessorKey: 'assigneeName',
    header: 'Sorumlu',
    size: 130,
    cell: ({ row }) => row.original.assigneeName ?? <span className="text-muted-foreground">—</span>,
  },
];
