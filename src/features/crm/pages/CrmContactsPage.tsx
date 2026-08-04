import { useCallback, useMemo } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/data-table/DataTable';
import { MobileListCard } from '@/components/data-table/MobileListCard';
import { FilterBar } from '@/components/data-table/FilterBar';
import { useTableUrlState } from '@/components/data-table/use-table-url-state';
import { exportCsv, exportXls } from '@/lib/export';
import { api, encodeListQuery } from '@/lib/api/client';
import type { Paginated } from '@/lib/api/types';
import { Can } from '@/lib/permissions/permission-context';
import { useContacts, useCrmStats } from '../api/queries';
import { useCreateContact, useDeleteContact } from '../api/mutations';
import { contactColumns } from '../components/contactColumns';
import { contactFilters } from '../data/filters';
import { CrmKpiStrip } from '../components/CrmKpiStrip';
import { ContactFormDialog } from '../components/ContactFormDialog';
import { ContactStatusBadge } from '../components/ContactStatusBadge';
import { formToPayload } from '../schemas/contact';
import type { ContactFormValues, Contact } from '../schemas/contact';
import { CONTACT_TYPE_LABELS } from '../data/crm';

export function CrmContactsPage() {
  const state = useTableUrlState({ defaultPageSize: 25 });
  const { data, isLoading, isError, refetch } = useContacts(state.query);
  const { data: stats, isLoading: statsLoading } = useCrmStats();
  const createContact = useCreateContact();
  const deleteContact = useDeleteContact();
  const items = useMemo(() => data?.items ?? [], [data]);

  async function handleCreate(values: ContactFormValues) {
    const payload = formToPayload(values);
    await createContact.mutateAsync(payload as Partial<Contact>);
  }

  const getRowId = useCallback((r: Contact) => r.id, []);

  const renderSubRow = useCallback(
    (row: Contact) => (
      <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm md:grid-cols-4">
        <Detail label="E-posta" value={row.email} />
        <Detail label="Telefon" value={row.phone} />
        <Detail label="Şirket" value={row.company ?? '—'} />
        <Detail label="Kaynak" value={row.source} />
      </div>
    ),
    [],
  );

  const renderMobileCard = useCallback(
    (row: Contact, selected: boolean, toggle: () => void) => (
      <MobileListCard
        title={row.fullName}
        to={`/crm/${row.id}`}
        entity="contact"
        selected={selected}
        onToggleSelect={toggle}
        selectLabel={`${row.fullName} satırını seç`}
        badges={<ContactStatusBadge status={row.status} />}
        meta={[
          { label: 'Tip', value: CONTACT_TYPE_LABELS[row.type] },
          { label: 'İlan', value: `${row.activeListings}/${row.totalListings}` },
          { label: 'Gelir', value: `₺${row.totalRevenue.toLocaleString('tr-TR')}`, full: true },
        ]}
      />
    ),
    [],
  );

  const bulkActions = useCallback(
    (ids: string[], _all: boolean, clear: () => void) => (
      <Can permission="crm.delete">
        <Button
          size="sm"
          variant="destructive"
          onClick={() => {
            ids.forEach((id) => deleteContact.mutate(id));
            clear();
          }}
          data-action="bulk-delete"
          data-entity="contact"
        >
          Sil ({ids.length})
        </Button>
      </Can>
    ),
    [deleteContact],
  );

  const filterBar = (
    <FilterBar
      tableKey="crm-contacts"
      filters={contactFilters}
      state={state}
      searchPlaceholder="Kişi ara…"
    />
  );

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">CRM — Kişiler</h1>
          <p className="text-muted-foreground text-sm">Müşteri ilişkileri ve portföy yönetimi.</p>
        </div>
        <Can permission="crm.edit">
          <ContactFormDialog onSubmit={handleCreate} />
        </Can>
      </header>

      <CrmKpiStrip stats={stats} isLoading={statsLoading} />

      <DataTable
        columns={contactColumns}
        data={items}
        total={data?.total ?? 0}
        state={state}
        getRowId={getRowId}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => void refetch()}
        filterBar={filterBar}
        renderSubRow={renderSubRow}
        renderMobileCard={renderMobileCard}
        bulkActions={bulkActions}
        onExport={async (format, scope, ctx) => {
          try {
            let contacts: Contact[];
            if (scope === 'selection') {
              const idSet = new Set(ctx.selectedIds);
              contacts = ctx.pageRows.filter((r) => idSet.has(r.id));
            } else if (scope === 'all') {
              const params = encodeListQuery({
                page: 1,
                pageSize: Math.max(data?.total ?? 1000, 1),
                sort: state.query.sort,
                filters: state.query.filters,
              });
              if (state.query.q) params.set('q', state.query.q);
              const res = await api.get<Paginated<Contact>>('/crm/contacts', params);
              contacts = res.items;
            } else {
              contacts = ctx.pageRows;
            }
            const headers = ['ID', 'Ad Soyad', 'E-posta', 'Telefon', 'Tip', 'Durum', 'Gelir'];
            const rows = contacts.map((c) => [
              c.id, c.fullName, c.email, c.phone, c.type, c.status, String(c.totalRevenue),
            ]);
            const exporter = format === 'xls' ? exportXls : exportCsv;
            exporter('crm-kisiler', headers, rows);
            toast.success(`${rows.length} kayıt ${format.toUpperCase()} olarak dışa aktarıldı.`);
          } catch {
            toast.error('Dışa aktarma başarısız.');
          }
        }}
      />
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}
