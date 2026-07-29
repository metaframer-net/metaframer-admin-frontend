import type { ColumnDef } from '@tanstack/react-table';
import { Link } from 'react-router-dom';

import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { REPORT_SUBJECT_TYPE_LABELS } from '../data/reports';
import { priorityFilter, reasonCategoryFilter, statusFilter, subjectTypeFilter } from '../data/filters';
import type { Report } from '../schemas/report';
import { ReportStatusBadge } from './ReportStatusBadge';
import { ReportPriorityBadge } from './ReportPriorityBadge';
import { ReasonCategoryBadge } from './ReasonCategoryBadge';

export const reportColumns: ColumnDef<Report>[] = [
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
        aria-label={`${row.original.subjectLabel} şikayetini seç`}
      />
    ),
  },
  {
    accessorKey: 'subjectLabel',
    header: 'Konu',
    cell: ({ row }) => (
      <Link
        to={`/messages/${row.original.id}`}
        className="font-medium hover:underline"
        data-action="open-detail"
        data-entity="report"
      >
        {row.original.subjectLabel}
      </Link>
    ),
  },
  {
    accessorKey: 'subjectType',
    header: 'Tür',
    meta: { filter: subjectTypeFilter },
    cell: ({ getValue }) => REPORT_SUBJECT_TYPE_LABELS[getValue<Report['subjectType']>()],
  },
  {
    accessorKey: 'reasonCategory',
    header: 'Sebep',
    meta: { filter: reasonCategoryFilter },
    cell: ({ getValue }) => <ReasonCategoryBadge category={getValue<Report['reasonCategory']>()} />,
  },
  {
    accessorKey: 'priority',
    header: 'Öncelik',
    meta: { filter: priorityFilter },
    cell: ({ getValue }) => <ReportPriorityBadge priority={getValue<Report['priority']>()} />,
  },
  {
    accessorKey: 'status',
    header: 'Durum',
    meta: { filter: statusFilter },
    cell: ({ getValue }) => <ReportStatusBadge status={getValue<Report['status']>()} />,
  },
  {
    accessorKey: 'reporterName',
    header: 'Şikayet eden',
  },
  {
    accessorKey: 'createdAt',
    header: 'Tarih',
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
        <Link to={`/messages/${row.original.id}`} data-action="open-detail" data-entity="report">
          Detay
        </Link>
      </Button>
    ),
  },
];
