import type { ColumnDef } from '@tanstack/react-table';
import { Link } from 'react-router-dom';

import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { paymentDateFilter, paymentMethodFilter, paymentStatusFilter } from '../data/filters';
import { formatTry, type Payment } from '../schemas/promotion';
import { PaymentStatusBadge } from './PaymentStatusBadge';
import { PaymentMethodBadge } from './PaymentMethodBadge';

export const paymentColumns: ColumnDef<Payment>[] = [
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
        aria-label={`${row.original.invoiceNo} faturasını seç`}
      />
    ),
  },
  {
    accessorKey: 'invoiceNo',
    header: 'Fatura No',
    cell: ({ row }) => (
      <Link
        to={`/promotions/payments/${row.original.id}`}
        className="font-medium tabular-nums hover:underline"
        data-action="open-detail"
        data-entity="payment"
      >
        {row.original.invoiceNo}
      </Link>
    ),
  },
  {
    accessorKey: 'userName',
    header: 'Kullanıcı',
  },
  {
    accessorKey: 'packageName',
    header: 'Paket',
  },
  {
    accessorKey: 'amount',
    header: 'Tutar',
    cell: ({ getValue }) => <span className="tabular-nums">{formatTry(getValue<number>())}</span>,
  },
  {
    accessorKey: 'method',
    header: 'Yöntem',
    meta: { filter: paymentMethodFilter },
    cell: ({ getValue }) => <PaymentMethodBadge method={getValue<Payment['method']>()} />,
  },
  {
    accessorKey: 'status',
    header: 'Durum',
    meta: { filter: paymentStatusFilter },
    cell: ({ getValue }) => <PaymentStatusBadge status={getValue<Payment['status']>()} />,
  },
  {
    accessorKey: 'createdAt',
    header: 'Tarih',
    meta: { filter: paymentDateFilter },
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
        <Link to={`/promotions/payments/${row.original.id}`} data-action="open-detail" data-entity="payment">
          Detay
        </Link>
      </Button>
    ),
  },
];
