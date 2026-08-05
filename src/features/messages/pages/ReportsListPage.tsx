import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

import { DataTable } from '@/components/data-table/DataTable';
import { MobileListCard } from '@/components/data-table/MobileListCard';
import { FilterBar } from '@/components/data-table/FilterBar';
import { ViewSwitch, parseDataView, type DataView } from '@/components/data-table/ViewSwitch';
import { DataKanban, type KanbanColumn } from '@/components/data-table/DataKanban';
import { DataGallery } from '@/components/data-table/DataGallery';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Skeleton } from '@/components/ui/skeleton';
import { DataTablePagination } from '@/components/data-table/DataTablePagination';
import { useTableUrlState } from '@/components/data-table/use-table-url-state';
import { exportCsv, exportXls } from '@/lib/export';
import { api, encodeListQuery } from '@/lib/api/client';
import type { Paginated } from '@/lib/api/types';
import { Button } from '@/components/ui/button';
import { Can } from '@/lib/permissions/permission-context';
import {
  REASON_CATEGORY_LABELS,
  REPORT_PRIORITY_LABELS,
  REPORT_STATUS_LABELS,
  REPORT_STATUSES,
  REPORT_SUBJECT_TYPE_LABELS,
} from '../data/reports';
import { reportFilters } from '../data/filters';
import { reportColumns } from '../components/reportColumns';
import { ReportStatusBadge } from '../components/ReportStatusBadge';
import { ReportPriorityBadge } from '../components/ReportPriorityBadge';
import { ReasonCategoryBadge } from '../components/ReasonCategoryBadge';
import { ReportActionDialog } from '../components/ReportActionDialog';
import { useReports, reportKeys } from '../api/queries';
import type { Report, ReportActionInput } from '../schemas/report';

/** Parse simple Turkish free text into proposed report filters. */
function parseNaturalLanguage(text: string): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};
  const lower = text.toLocaleLowerCase('tr');
  if (lower.includes('açık') || lower.includes('acik') || lower.includes('bekleyen')) out.status = 'open';
  if (lower.includes('çözül') || lower.includes('cozul')) out.status = 'resolved';
  if (lower.includes('reddedil')) out.status = 'dismissed';
  if (lower.includes('üst merci') || lower.includes('ust merci') || lower.includes('escalate')) out.status = 'escalated';
  if (lower.includes('ilan')) out.subjectType = 'listing';
  if (lower.includes('kullanıcı') || lower.includes('kullanici')) out.subjectType = 'user';
  if (lower.includes('mesaj')) out.subjectType = 'message';
  if (lower.includes('spam')) out.reasonCategory = 'spam';
  if (lower.includes('dolandırıcı') || lower.includes('dolandirici')) out.reasonCategory = 'fraud';
  if (lower.includes('uygunsuz')) out.reasonCategory = 'inappropriate';
  if (lower.includes('yanlış') || lower.includes('yanlis')) out.reasonCategory = 'misinformation';
  if (lower.includes('yüksek') || lower.includes('yuksek') || lower.includes('acil')) out.priority = 'high';
  return out;
}

const STATUS_DOT: Record<Report['status'], string> = {
  open: 'bg-warning',
  resolved: 'bg-success',
  dismissed: 'bg-muted-foreground',
  escalated: 'bg-destructive',
};

const KANBAN_COLUMNS: KanbanColumn<Report['status']>[] = REPORT_STATUSES.map((s) => ({
  key: s,
  label: REPORT_STATUS_LABELS[s],
  dot: STATUS_DOT[s],
}));

const REPORT_VIEWS = ['table', 'kanban', 'gallery'] as const satisfies readonly DataView[];

export function ReportsListPage() {
  const state = useTableUrlState({ defaultPageSize: 25 });
  const { data, isLoading, isError, refetch } = useReports(state.query);
  const view = parseDataView(state.view, REPORT_VIEWS);

  return (
    <div className="space-y-4">
      <header className="animate-fade-in flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold sm:text-2xl">Mesajlar &amp; Şikayetler</h1>
          <p className="text-muted-foreground text-sm">
            İlan, kullanıcı ve mesaj şikayetleri; three-tier moderasyon (çöz / üst mercie taşı / reddet).
          </p>
        </div>
        <ViewSwitch value={view} onChange={(v) => state.setView(v === 'table' ? null : v)} views={REPORT_VIEWS} entity="report" />
      </header>

      {view === 'table' ? (
        <DataTable
          columns={reportColumns}
          data={data?.items ?? []}
          total={data?.total ?? 0}
          state={state}
          getRowId={(r) => r.id}
          isLoading={isLoading}
          isError={isError}
          onRetry={() => void refetch()}
          filterBar={
            <FilterBar
              tableKey="reports"
              filters={reportFilters}
              state={state}
              searchPlaceholder="Konu, açıklama veya şikayet eden ara…"
              onNaturalLanguage={parseNaturalLanguage}
            />
          }
          renderSubRow={(row) => (
          <div className="space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 xl:grid-cols-4">
              <Detail label="Şikayet No" value={row.id} />
              <Detail label="Konu No" value={row.subjectId} />
              <Detail label="Tür" value={REPORT_SUBJECT_TYPE_LABELS[row.subjectType]} />
              <Detail label="Sebep" value={REASON_CATEGORY_LABELS[row.reasonCategory]} />
            </div>
            <p className="text-muted-foreground">{row.description}</p>
          </div>
        )}
        renderMobileCard={(row, selected, toggle) => (
          <MobileListCard
            title={row.subjectLabel}
            to={`/messages/${row.id}`}
            entity="report"
            selected={selected}
            onToggleSelect={toggle}
            selectLabel={`${row.subjectLabel} şikayetini seç`}
            badges={
              <>
                <ReportStatusBadge status={row.status} />
                <ReportPriorityBadge priority={row.priority} />
              </>
            }
            meta={[
              { label: 'Tür', value: REPORT_SUBJECT_TYPE_LABELS[row.subjectType] },
              { label: 'Şikayet eden', value: row.reporterName },
              { label: 'Sebep', value: <ReasonCategoryBadge category={row.reasonCategory} />, full: true },
              {
                label: 'Tarih',
                value: <span className="tabular-nums">{new Date(row.createdAt).toLocaleDateString('tr-TR')}</span>,
              },
            ]}
          />
        )}
        bulkActions={(ids, _all, clear) => <BulkReportActions ids={ids} clear={clear} />}
        onExport={async (format, scope, ctx) => {
          try {
            let reports: Report[];
            if (scope === 'selection') {
              const ids = new Set(ctx.selectedIds);
              reports = ctx.pageRows.filter((r) => ids.has(r.id));
            } else if (scope === 'all') {
              const params = encodeListQuery({
                page: 1,
                pageSize: Math.max(data?.total ?? 1000, 1),
                sort: state.query.sort,
                filters: state.query.filters,
              });
              if (state.query.q) params.set('q', state.query.q);
              const res = await api.get<Paginated<Report>>('/reports', params);
              reports = res.items;
            } else {
              reports = ctx.pageRows;
            }
            const headers = ['Şikayet No', 'Konu', 'Tür', 'Sebep', 'Öncelik', 'Durum', 'Şikayet eden'];
            const rows = reports.map((r) => [
              r.id,
              r.subjectLabel,
              REPORT_SUBJECT_TYPE_LABELS[r.subjectType],
              REASON_CATEGORY_LABELS[r.reasonCategory],
              REPORT_PRIORITY_LABELS[r.priority],
              REPORT_STATUS_LABELS[r.status],
              r.reporterName,
            ]);
            const exporter = format === 'xls' ? exportXls : exportCsv;
            exporter('sikayetler', headers, rows);
            toast.success(`${rows.length} kayıt ${format.toUpperCase()} olarak dışa aktarıldı.`);
          } catch {
            toast.error('Dışa aktarma başarısız.');
          }
        }}
      />
      ) : (
        <div className="space-y-3">
          <FilterBar
            tableKey="reports"
            filters={reportFilters}
            state={state}
            searchPlaceholder="Konu, açıklama veya şikayet eden ara…"
            onNaturalLanguage={parseNaturalLanguage}
          />
          {isError ? (
            <ErrorState onRetry={() => void refetch()} />
          ) : isLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" role="status" aria-label="Şikayetler yükleniyor">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-36 w-full rounded-xl" />
              ))}
            </div>
          ) : view === 'kanban' ? (
            <DataKanban
              data={data?.items ?? []}
              columns={KANBAN_COLUMNS}
              getStatus={(r) => r.status}
              getKey={(r) => r.id}
              entity="report"
              renderCard={(r) => (
                <div className="bg-card hover:border-primary/40 rounded-lg border border-border p-3 shadow-xs transition-colors">
                  <p className="text-sm font-semibold">{r.subjectLabel}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-1">
                    <ReportPriorityBadge priority={r.priority} />
                    <ReasonCategoryBadge category={r.reasonCategory} />
                  </div>
                  <div className="mt-2 flex items-center justify-between border-t border-dashed border-border pt-2 text-xs">
                    <span className="text-muted-foreground">{r.reporterName}</span>
                    <span className="text-muted-foreground tabular-nums">
                      {new Date(r.createdAt).toLocaleDateString('tr-TR')}
                    </span>
                  </div>
                </div>
              )}
            />
          ) : (
            <DataGallery
              data={data?.items ?? []}
              getKey={(r) => r.id}
              renderCard={(r) => (
                <div className="bg-card overflow-hidden rounded-xl border border-border shadow-xs transition-shadow hover:shadow-md">
                  <div className="p-3">
                    <div className="flex items-center justify-between">
                      <h3 className="truncate text-sm font-semibold">{r.subjectLabel}</h3>
                      <ReportStatusBadge status={r.status} />
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-1">
                      <ReportPriorityBadge priority={r.priority} />
                      <span className="text-muted-foreground text-xs">{REPORT_SUBJECT_TYPE_LABELS[r.subjectType]}</span>
                    </div>
                    <p className="text-muted-foreground mt-1 text-xs">
                      <ReasonCategoryBadge category={r.reasonCategory} />
                    </p>
                    <p className="text-muted-foreground mt-1 text-xs">{r.reporterName}</p>
                    <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">{r.description}</p>
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

function BulkReportActions({ ids, clear }: { ids: string[]; clear: () => void }) {
  const qc = useQueryClient();

  const run = async (input: ReportActionInput) => {
    try {
      await Promise.all(ids.map((id) => api.post(`/reports/${id}/action`, input)));
      toast.success(`${ids.length} şikayet için işlem uygulandı.`);
      void qc.invalidateQueries({ queryKey: reportKeys.all });
      clear();
    } catch {
      toast.error('Toplu işlem başarısız.');
    }
  };

  return (
    <Can permission="message.moderate">
      <div className="flex items-center gap-2">
        <Button variant="default" onClick={() => void run({ action: 'resolve' })} data-action="resolve" data-entity="report">
          {ids.length} şikayeti çöz
        </Button>
        <ReportActionDialog action="dismiss" onConfirm={run} triggerLabel={`${ids.length} şikayeti reddet`} />
      </div>
    </Can>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="break-all">{value}</dd>
    </div>
  );
}
