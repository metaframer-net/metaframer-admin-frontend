import { useState, useMemo } from 'react';
import { LayoutGrid, Table as TableIcon } from 'lucide-react';
import { toast } from 'sonner';

import { DataTable } from '@/components/data-table/DataTable';
import { MobileListCard } from '@/components/data-table/MobileListCard';
import { FilterBar } from '@/components/data-table/FilterBar';
import { ErrorState } from '@/components/feedback/ErrorState';
import { useTableUrlState } from '@/components/data-table/use-table-url-state';
import { exportCsv, exportXls } from '@/lib/export';
import { api, encodeListQuery } from '@/lib/api/client';
import type { Paginated } from '@/lib/api/types';
import { Button } from '@/components/ui/button';
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

type ViewMode = 'table' | 'kanban';

export function CrmLeadsPage() {
  const [view, setView] = useState<ViewMode>('table');
  const state = useTableUrlState({ defaultPageSize: 25 });
  const { data, isLoading, isError, refetch } = useLeads(state.query);
  const createLead = useCreateLead();
  const updateStage = useUpdateLeadStage();
  const items = useMemo(() => data?.items ?? [], [data]);

  async function handleCreate(values: LeadFormValues) {
    const payload = leadFormToPayload(values);
    await createLead.mutateAsync(payload as Partial<Lead>);
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
          <div className="bg-muted flex rounded-lg p-0.5" role="radiogroup" aria-label="Görünüm modu">
            <Button
              variant={view === 'table' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 px-2"
              onClick={() => setView('table')}
              aria-checked={view === 'table'}
              role="radio"
            >
              <TableIcon className="size-4" />
            </Button>
            <Button
              variant={view === 'kanban' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 px-2"
              onClick={() => setView('kanban')}
              aria-checked={view === 'kanban'}
              role="radio"
            >
              <LayoutGrid className="size-4" />
            </Button>
          </div>
          <Can permission="crm.edit">
            <LeadFormDialog onSubmit={handleCreate} />
          </Can>
        </div>
      </header>

      {view === 'kanban' ? (
        <div className="space-y-3">
          {filterBar}
          {isError ? (
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
          )}
          {pagination}
        </div>
      ) : (
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
        />
      )}
    </div>
  );
}
