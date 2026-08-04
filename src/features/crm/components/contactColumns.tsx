import { Link } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import { Phone, Mail } from 'lucide-react';

import { Checkbox } from '@/components/ui/checkbox';
import type { Contact } from '../schemas/contact';
import { CONTACT_TYPE_LABELS, CONTACT_SOURCE_LABELS } from '../data/crm';
import { contactStatusFilter, contactTypeFilter, contactSourceFilter } from '../data/filters';
import { ContactStatusBadge } from './ContactStatusBadge';

export interface ContactsTableMeta {
  onDelete?: (id: string) => void;
  canEdit?: boolean;
}

export const contactColumns: ColumnDef<Contact>[] = [
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
        aria-label={`Seç: ${row.original.fullName}`}
      />
    ),
  },
  {
    accessorKey: 'fullName',
    header: 'Ad Soyad',
    size: 200,
    cell: ({ row }) => (
      <Link
        to={`/crm/${row.original.id}`}
        className="text-foreground hover:text-primary font-medium underline-offset-4 hover:underline"
        data-action="open-detail"
        data-entity="contact"
      >
        {row.original.fullName}
      </Link>
    ),
  },
  {
    accessorKey: 'type',
    header: 'Tip',
    size: 120,
    meta: { filter: contactTypeFilter },
    cell: ({ row }) => CONTACT_TYPE_LABELS[row.original.type],
  },
  {
    accessorKey: 'status',
    header: 'Durum',
    size: 120,
    meta: { filter: contactStatusFilter },
    cell: ({ row }) => <ContactStatusBadge status={row.original.status} />,
  },
  {
    accessorKey: 'source',
    header: 'Kaynak',
    size: 120,
    meta: { filter: contactSourceFilter },
    cell: ({ row }) => CONTACT_SOURCE_LABELS[row.original.source],
  },
  {
    accessorKey: 'totalListings',
    header: 'İlan',
    size: 80,
    cell: ({ row }) => (
      <span className="tabular-nums">
        {row.original.activeListings}/{row.original.totalListings}
      </span>
    ),
  },
  {
    accessorKey: 'totalRevenue',
    header: 'Gelir (₺)',
    size: 120,
    cell: ({ row }) => (
      <span className="tabular-nums">
        {row.original.totalRevenue.toLocaleString('tr-TR')}
      </span>
    ),
  },
  {
    accessorKey: 'lastContactedAt',
    header: 'Son İletişim',
    size: 130,
    cell: ({ row }) =>
      row.original.lastContactedAt
        ? new Date(row.original.lastContactedAt).toLocaleDateString('tr-TR')
        : <span className="text-muted-foreground">—</span>,
  },
  {
    accessorKey: 'nextFollowUpAt',
    header: 'Takip',
    size: 130,
    cell: ({ row }) => {
      if (!row.original.nextFollowUpAt) return <span className="text-muted-foreground">—</span>;
      const d = new Date(row.original.nextFollowUpAt);
      const overdue = d < new Date();
      return (
        <span className={overdue ? 'text-destructive font-medium' : 'tabular-nums'}>
          {d.toLocaleDateString('tr-TR')}
        </span>
      );
    },
  },
  {
    id: 'contact-info',
    header: 'İletişim',
    size: 80,
    enableSorting: false,
    cell: ({ row }) => (
      <div className="flex items-center gap-1">
        <a href={`tel:${row.original.phone}`} className="text-muted-foreground hover:text-foreground" aria-label="Ara" data-action="call" data-entity="contact">
          <Phone className="size-4" />
        </a>
        <a href={`mailto:${row.original.email}`} className="text-muted-foreground hover:text-foreground" aria-label="E-posta" data-action="email" data-entity="contact">
          <Mail className="size-4" />
        </a>
      </div>
    ),
  },
];
