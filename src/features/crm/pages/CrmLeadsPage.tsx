import { useMemo } from 'react';
import { toast } from 'sonner';

import { DataTable } from '@/components/data-table/DataTable';
import { MobileListCard } from '@/components/data-table/MobileListCard';
import { FilterBar } from '@/components/data-table/FilterBar';
import { ErrorState } from '@/components/feedback/ErrorState';
import { ViewSwitch, parseDataView, type DataView } from '@/components/data-table/ViewSwitch';
import { DataGallery } from '@/components/data-table/DataGallery';
import { useTableUrlState } from '@/components/data-table/use-table-url-state';
import { exportCsv, exportXls, parseCsvFile } from '@/lib/export';
import { api, encodeListQuery } from '@/lib/api/client';
import type { Paginated } from '@/lib/api/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Can } from '@/lib/permissions/permission-context';
import { useLeads } from '../api/queries';
import { useCreateLead, useUpdateLeadStage } from '../api/mutations';
import { leadColumns } from '../components/leadColumns';
import { leadFilters } from '../data/filters';
import { LeadFormDialog } from '../components/LeadFormDialog';
import { LeadKanban } from '../components/LeadKanban';
import { LeadStageBadge } from '../components/LeadStageBadge';
import { LeadPriorityBadge } from '../components/LeadPriorityBadge';
import { leadFormToPayload } from '../schemas/lead';
import type { LeadFormValues, Lead } from '../schemas/lead';
import { DataTablePagination } from '@/components/data-table/DataTablePagination';

const LEAD_VIEWS = ['table', 'kanban', 'gallery'] as const satisfies readonly DataView[];

export function CrmLeadsPage() {
  const state = useTableUrlState({ defaultPageSize: 25 });
  const view = parseDataView(state.view, LEAD_VIEWS);
  const { data, isLoading, isError, refetch } = useLeads(state.query);
  const createLead = useCreateLead();
  const updateStage = useUpdateLeadStage();
  const items = useMemo(() => data?.items ?? [], [data]);

  async function handleCreate(values: LeadFormValues) {
    const payload = leadFormToPayload(values);
    await createLead.mutateAsync(payload as Partial<Lead>);
  }

  async function handleImport(file: File) {
    try {
      const { headers, rows } = await parseCsvFile(file);
      const titleIdx = headers.findIndex((h) => /başlık|title/i.test(h));
      const contactIdx = headers.findIndex((h) => /kişi|contact/i.test(h));
      const valueIdx = headers.findIndex((h) => /değer|value/i.test(h));
      const stageIdx = headers.findIndex((h) => /aşama|stage/i.test(h));

      let imported = 0;
      for (const row of rows) {
        const title = titleIdx >= 0 ? row[titleIdx] : undefined;
        if (!title) continue;
        await createLead.mutateAsync({
          title,
          contactId: contactIdx >= 0 ? (row[contactIdx] ?? '') : '',
          stage: (stageIdx >= 0 ? (row[stageIdx] ?? 'new') : 'new') as Lead['stage'],
          value: valueIdx >= 0 ? Number(row[valueIdx]?.replace(/[^\d]/g, '') ?? '0') : 0,
          probability: 10,
          source: 'import',
        } as Partial<Lead>);
        imported++;
      }
      toast.success(`${imported} lead içe aktarıldı.`);
    } catch {
      toast.error('İçe aktarma başarısız. CSV formatını kontrol edin.');
    }
  }

  const filterBar = (
    <FilterBar
      tableKey="crm-leads"
      filters={leadFilters}
      state={state}
      searchPlaceholder="Lead ara…"
    />
  );

  const pagination = (
    <DataTablePagination
      page={state.pagination.pageIndex + 1}
      pageSize={state.pagination.pageSize}
      total={data?.total ?? 0}
      selectedCount={0}
      onPageChange={state.setPage}
      onPageSizeChange={state.setPageSize}
    />
  );

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">CRM — Leadler</h1>
          <p className="text-muted-foreground text-sm">Satış fırsatları ve pipeline yönetimi.</p>
        </div>
        <div className="flex items-center gap-2">
          <ViewSwitch value={view} onChange={(v) => state.setView(v === 'table' ? null : v)} views={LEAD_VIEWS} entity="lead" />
          <Can permission="crm.edit">
            <LeadFormDialog onSubmit={handleCreate} />
          </Can>
        </div>
      </header>

      {view === 'table' ? (
        <DataTable
          columns={leadColumns}
          data={items}
          total={data?.total ?? 0}
          state={state}
          getRowId={(r) => r.id}
          isLoading={isLoading}
          isError={isError}
          onRetry={() => void refetch()}
          filterBar={filterBar}
          renderMobileCard={(row, selected, toggle) => (
            <MobileListCard
              title={row.title}
              to={`/crm/${row.contactId}`}
              entity="lead"
              selected={selected}
              onToggleSelect={toggle}
              selectLabel={`${row.title} satırını seç`}
              badges={
                <>
                  <LeadStageBadge stage={row.stage} />
                  <LeadPriorityBadge priority={row.priority} />
                </>
              }
              meta={[
                { label: 'Kişi', value: row.contactName },
                { label: 'Değer', value: `₺${row.value.toLocaleString('tr-TR')}` },
                { label: 'Olasılık', value: `${row.probability}%` },
              ]}
            />
          )}
          onExport={async (format, scope, ctx) => {
            try {
              let leads: Lead[];
              if (scope === 'selection') {
                const idSet = new Set(ctx.selectedIds);
                leads = ctx.pageRows.filter((r) => idSet.has(r.id));
              } else if (scope === 'all') {
                const params = encodeListQuery({
                  page: 1,
                  pageSize: Math.max(data?.total ?? 1000, 1),
                  sort: state.query.sort,
                  filters: state.query.filters,
                });
                if (state.query.q) params.set('q', state.query.q);
                const res = await api.get<Paginated<Lead>>('/crm/leads', params);
                leads = res.items;
              } else {
                leads = ctx.pageRows;
              }
              const headers = ['ID', 'Başlık', 'Kişi', 'Aşama', 'Öncelik', 'Değer', 'Olasılık'];
              const rows = leads.map((l) => [
                l.id, l.title, l.contactName, l.stage, l.priority, String(l.value), `${l.probability}%`,
              ]);
              const exporter = format === 'xls' ? exportXls : exportCsv;
              exporter('crm-leadler', headers, rows);
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
          {view === 'kanban' ? (
            isError ? (
              <ErrorState onRetry={() => void refetch()} />
            ) : isLoading ? (
              <div className="flex gap-3 overflow-x-auto" role="status" aria-label="Leadler yükleniyor">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex w-64 shrink-0 flex-col gap-2 xl:w-auto xl:flex-1">
                    <Skeleton className="h-16 w-full rounded-lg" />
                    <Skeleton className="h-24 w-full rounded-lg" />
                    <Skeleton className="h-24 w-full rounded-lg" />
                  </div>
                ))}
              </div>
            ) : (
              <LeadKanban
                leads={items}
                onStageChange={(leadId, newStage) => updateStage.mutate({ id: leadId, stage: newStage })}
              />
            )
          ) : view === 'gallery' ? (
            isError ? (
              <ErrorState onRetry={() => void refetch()} />
            ) : isLoading ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" role="status" aria-label="Leadler yükleniyor">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-40 rounded-xl" />
                ))}
              </div>
            ) : (
              <DataGallery
                data={items}
                getKey={(l) => l.id}
                emptyTitle="Lead bulunamadı"
                emptyDescription="Filtreleri değiştirin veya yeni lead oluşturun."
                renderCard={(lead) => <LeadGalleryCard lead={lead} />}
              />
            )
          ) : null}
          {pagination}
        </div>
      )}
    </div>
  );
}

function LeadGalleryCard({ lead }: { lead: Lead }) {
  return (
    <div className="bg-card rounded-xl border p-4 motion-safe:transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold leading-tight">{lead.title}</h3>
        <LeadPriorityBadge priority={lead.priority} />
      </div>
      <p className="text-muted-foreground mt-1 text-xs">{lead.contactName}</p>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-lg font-bold tabular-nums">₺{lead.value.toLocaleString('tr-TR')}</span>
        <LeadStageBadge stage={lead.stage} />
      </div>
      <div className="text-muted-foreground mt-2 flex items-center justify-between text-xs tabular-nums">
        <span>Olasılık: {lead.probability}%</span>
        {lead.expectedCloseDate && (
          <span>{new Date(lead.expectedCloseDate).toLocaleDateString('tr-TR')}</span>
        )}
      </div>
      {lead.assigneeName && (
        <p className="text-muted-foreground mt-1 text-xs">Sorumlu: {lead.assigneeName}</p>
      )}
    </div>
  );
}
