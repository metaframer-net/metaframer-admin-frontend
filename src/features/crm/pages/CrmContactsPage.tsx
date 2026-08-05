import { useCallback, useMemo } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/data-table/DataTable';
import { MobileListCard } from '@/components/data-table/MobileListCard';
import { FilterBar } from '@/components/data-table/FilterBar';
import { ViewSwitch, parseDataView, type DataView } from '@/components/data-table/ViewSwitch';
import { DataKanban, type KanbanColumn } from '@/components/data-table/DataKanban';
import { DataGallery } from '@/components/data-table/DataGallery';
import { DataTablePagination } from '@/components/data-table/DataTablePagination';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Skeleton } from '@/components/ui/skeleton';
import { useTableUrlState } from '@/components/data-table/use-table-url-state';
import { exportCsv, exportXls, parseCsvFile } from '@/lib/export';
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
import { CONTACT_TYPE_LABELS, CONTACT_STATUS_LABELS, CONTACT_SOURCE_LABELS } from '../data/crm';
import { CONTACT_STATUSES } from '../schemas/contact';

const CONTACT_VIEWS = ['table', 'kanban', 'gallery'] as const satisfies readonly DataView[];

const STATUS_DOT: Record<Contact['status'], string> = {
  active: 'bg-success',
  inactive: 'bg-muted-foreground',
  vip: 'bg-chart-4',
  churned: 'bg-destructive',
};

const KANBAN_COLUMNS: KanbanColumn<Contact['status']>[] = CONTACT_STATUSES.map((s) => ({
  key: s,
  label: CONTACT_STATUS_LABELS[s],
  dot: STATUS_DOT[s],
}));

export function CrmContactsPage() {
  const state = useTableUrlState({ defaultPageSize: 25 });
  const view = parseDataView(state.view, CONTACT_VIEWS);
  const { data, isLoading, isError, refetch } = useContacts(state.query);
  const { data: stats, isLoading: statsLoading } = useCrmStats();
  const createContact = useCreateContact();
  const deleteContact = useDeleteContact();
  const items = useMemo(() => data?.items ?? [], [data]);

  async function handleCreate(values: ContactFormValues) {
    const payload = formToPayload(values);
    await createContact.mutateAsync(payload as Partial<Contact>);
  }

  async function handleImport(file: File) {
    try {
      const { headers, rows } = await parseCsvFile(file);
      const nameIdx = headers.findIndex((h) => /ad|name|fullname/i.test(h));
      const emailIdx = headers.findIndex((h) => /e-?posta|email/i.test(h));
      const phoneIdx = headers.findIndex((h) => /telefon|phone/i.test(h));
      const typeIdx = headers.findIndex((h) => /tip|type/i.test(h));

      let imported = 0;
      for (const row of rows) {
        const fullName = nameIdx >= 0 ? row[nameIdx] : undefined;
        if (!fullName) continue;
        await createContact.mutateAsync({
          fullName,
          email: emailIdx >= 0 ? (row[emailIdx] ?? '') : '',
          phone: phoneIdx >= 0 ? (row[phoneIdx] ?? '') : '',
          type: (typeIdx >= 0 ? (row[typeIdx] ?? 'individual') : 'individual') as Contact['type'],
          status: 'active',
          source: 'import',
          tags: [],
          il: '34',
        } as Partial<Contact>);
        imported++;
      }
      toast.success(`${imported} kişi içe aktarıldı.`);
    } catch {
      toast.error('İçe aktarma başarısız. CSV formatını kontrol edin.');
    }
  }

  const getRowId = useCallback((r: Contact) => r.id, []);

  const renderSubRow = useCallback(
    (row: Contact) => (
      <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm xl:grid-cols-4">
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
      <header className="animate-fade-in flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold sm:text-2xl">CRM — Kişiler</h1>
          <p className="text-muted-foreground text-sm">Müşteri ilişkileri ve portföy yönetimi.</p>
        </div>
        <div className="flex items-center gap-2">
          <ViewSwitch value={view} onChange={(v) => state.setView(v === 'table' ? null : v)} views={CONTACT_VIEWS} entity="contact" />
          <Can permission="crm.edit">
            <ContactFormDialog onSubmit={handleCreate} />
          </Can>
        </div>
      </header>

      <CrmKpiStrip stats={stats} isLoading={statsLoading} />

      {view === 'table' ? (
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
          onImport={handleImport}
        />
      ) : (
        <div className="space-y-3">
          {filterBar}
          {isError ? (
            <ErrorState onRetry={() => void refetch()} />
          ) : isLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" role="status" aria-label="Kişiler yükleniyor">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-36 w-full rounded-xl" />
              ))}
            </div>
          ) : view === 'kanban' ? (
            <DataKanban
              data={items}
              columns={KANBAN_COLUMNS}
              getStatus={(c) => c.status}
              getKey={(c) => c.id}
              entity="contact"
              renderCard={(c) => (
                <div className="bg-card hover:border-primary/40 rounded-lg border border-border p-3 shadow-xs transition-colors">
                  <p className="text-sm font-semibold">{c.fullName}</p>
                  <p className="text-muted-foreground mt-1 text-xs">{CONTACT_TYPE_LABELS[c.type]} · {CONTACT_SOURCE_LABELS[c.source]}</p>
                  <div className="text-muted-foreground mt-1 text-xs">{c.email}</div>
                  <div className="mt-2 border-t border-dashed border-border pt-2 font-mono text-sm font-semibold tabular-nums">
                    ₺{c.totalRevenue.toLocaleString('tr-TR')}
                  </div>
                </div>
              )}
            />
          ) : (
            <DataGallery
              data={items}
              getKey={(c) => c.id}
              renderCard={(c) => (
                <div className="bg-card overflow-hidden rounded-xl border border-border shadow-xs transition-shadow hover:shadow-md">
                  <div className="from-primary/20 to-accent/20 flex aspect-[16/7] items-center justify-center bg-gradient-to-br">
                    <span className="text-foreground/50 text-3xl font-bold">{c.fullName.split(' ').map((n) => n[0]).join('')}</span>
                  </div>
                  <div className="p-3">
                    <div className="flex items-center justify-between">
                      <h3 className="truncate text-sm font-semibold">{c.fullName}</h3>
                      <ContactStatusBadge status={c.status} />
                    </div>
                    <p className="text-muted-foreground mt-1 text-xs">{CONTACT_TYPE_LABELS[c.type]} · {CONTACT_SOURCE_LABELS[c.source]}</p>
                    <p className="text-muted-foreground mt-0.5 truncate text-xs">{c.email}</p>
                    <div className="mt-2 flex items-center justify-between text-xs">
                      <span className="font-mono font-semibold tabular-nums">₺{c.totalRevenue.toLocaleString('tr-TR')}</span>
                      <span className="text-muted-foreground">{c.activeListings}/{c.totalListings} ilan</span>
                    </div>
                  </div>
                </div>
              )}
            />
          )}
          <DataTablePagination
            page={state.pagination.pageIndex + 1}
            pageSize={state.pagination.pageSize}
            total={data?.total ?? 0}
            selectedCount={0}
            onPageChange={state.setPage}
            onPageSizeChange={state.setPageSize}
          />
        </div>
      )}
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
