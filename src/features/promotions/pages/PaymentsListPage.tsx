import { toast } from 'sonner';

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
import { PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS, PAYMENT_STATUSES } from '../data/promotions';
import { paymentFilters } from '../data/filters';
import { paymentColumns } from '../components/paymentColumns';
import { PaymentStatusBadge } from '../components/PaymentStatusBadge';
import { PaymentMethodBadge } from '../components/PaymentMethodBadge';
import { usePayments } from '../api/queries';
import { formatTry, type Payment } from '../schemas/promotion';

function parseNaturalLanguage(text: string): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};
  const lower = text.toLocaleLowerCase('tr');
  if (lower.includes('ödendi') || lower.includes('odendi')) out.status = 'paid';
  if (lower.includes('iade')) out.status = 'refunded';
  if (lower.includes('kısmi') || lower.includes('kismi')) out.status = 'partially-refunded';
  if (lower.includes('başarısız') || lower.includes('basarisiz')) out.status = 'failed';
  if (lower.includes('kart')) out.method = 'card';
  if (lower.includes('havale') || lower.includes('eft')) out.method = 'transfer';
  if (lower.includes('cüzdan') || lower.includes('cuzdan')) out.method = 'wallet';
  return out;
}

const STATUS_DOT: Record<Payment['status'], string> = {
  paid: 'bg-success',
  refunded: 'bg-chart-4',
  'partially-refunded': 'bg-warning',
  failed: 'bg-destructive',
};

const KANBAN_COLUMNS: KanbanColumn<Payment['status']>[] = PAYMENT_STATUSES.map((s) => ({
  key: s,
  label: PAYMENT_STATUS_LABELS[s],
  dot: STATUS_DOT[s],
}));

const PAYMENT_VIEWS = ['table', 'kanban', 'gallery'] as const satisfies readonly DataView[];

export function PaymentsListPage() {
  const state = useTableUrlState({ defaultPageSize: 25 });
  const { data, isLoading, isError, refetch } = usePayments(state.query);
  const view = parseDataView(state.view, PAYMENT_VIEWS);

  return (
    <div className="space-y-4">
      <header className="animate-fade-in flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Ödemeler &amp; Faturalar</h1>
          <p className="text-muted-foreground text-sm">
            Doping satın alma ödemeleri ve faturaları; satır seçip iade için detaya gidin.
          </p>
        </div>
        <ViewSwitch value={view} onChange={(v) => state.setView(v === 'table' ? null : v)} views={PAYMENT_VIEWS} entity="payment" />
      </header>

      {view === 'table' ? (
        <DataTable
          columns={paymentColumns}
          data={data?.items ?? []}
          total={data?.total ?? 0}
          state={state}
          getRowId={(r) => r.id}
          isLoading={isLoading}
          isError={isError}
          onRetry={() => void refetch()}
          emptyTitle="Ödeme bulunamadı"
          emptyDescription="Filtreleri değiştirin ya da tarih aralığını genişletin."
          filterBar={
            <FilterBar
              tableKey="payments"
              filters={paymentFilters}
              state={state}
              searchPlaceholder="Fatura no, kullanıcı veya paket ara…"
              onNaturalLanguage={parseNaturalLanguage}
            />
          }
          renderSubRow={(row) => (
          <div className="space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 md:grid-cols-4">
              <Detail label="Fatura No" value={row.invoiceNo} />
              <Detail label="Kullanıcı" value={row.userName} />
              <Detail label="Paket" value={row.packageName} />
              <Detail label="Tutar" value={formatTry(row.amount)} />
            </div>
            {row.refundedAmount ? (
              <p className="text-muted-foreground">İade edilen: {formatTry(row.refundedAmount)}</p>
            ) : null}
          </div>
        )}
        renderMobileCard={(row, selected, toggle) => (
          <MobileListCard
            title={<span className="tabular-nums">{row.invoiceNo}</span>}
            to={`/promotions/payments/${row.id}`}
            entity="payment"
            selected={selected}
            onToggleSelect={toggle}
            selectLabel={`${row.invoiceNo} faturasını seç`}
            badges={<PaymentStatusBadge status={row.status} />}
            meta={[
              { label: 'Kullanıcı', value: row.userName },
              { label: 'Paket', value: row.packageName },
              { label: 'Tutar', value: <span className="tabular-nums">{formatTry(row.amount)}</span> },
              { label: 'Yöntem', value: <PaymentMethodBadge method={row.method} /> },
              {
                label: 'Tarih',
                value: <span className="tabular-nums">{new Date(row.createdAt).toLocaleDateString('tr-TR')}</span>,
                full: true,
              },
            ]}
          />
        )}
        onExport={async (format, scope, ctx) => {
          try {
            let payments: Payment[];
            if (scope === 'selection') {
              const ids = new Set(ctx.selectedIds);
              payments = ctx.pageRows.filter((p) => ids.has(p.id));
            } else if (scope === 'all') {
              const params = encodeListQuery({
                page: 1,
                pageSize: Math.max(data?.total ?? 1000, 1),
                sort: state.query.sort,
                filters: state.query.filters,
              });
              if (state.query.q) params.set('q', state.query.q);
              const res = await api.get<Paginated<Payment>>('/payments', params);
              payments = res.items;
            } else {
              payments = ctx.pageRows;
            }
            const headers = ['Fatura No', 'Kullanıcı', 'Paket', 'Tutar', 'Yöntem', 'Durum', 'Tarih'];
            const rows = payments.map((p) => [
              p.invoiceNo,
              p.userName,
              p.packageName,
              String(p.amount),
              PAYMENT_METHOD_LABELS[p.method],
              PAYMENT_STATUS_LABELS[p.status],
              new Date(p.createdAt).toLocaleDateString('tr-TR'),
            ]);
            const exporter = format === 'xls' ? exportXls : exportCsv;
            exporter('odemeler', headers, rows);
            toast.success(`${rows.length} ödeme ${format.toUpperCase()} olarak dışa aktarıldı.`);
          } catch {
            toast.error('Dışa aktarma başarısız.');
          }
        }}
      />
      ) : (
        <div className="space-y-3">
          <FilterBar
            tableKey="payments"
            filters={paymentFilters}
            state={state}
            searchPlaceholder="Fatura no, kullanıcı veya paket ara…"
            onNaturalLanguage={parseNaturalLanguage}
          />
          {isError ? (
            <ErrorState onRetry={() => void refetch()} />
          ) : isLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" role="status" aria-label="Ödemeler yükleniyor">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-36 w-full rounded-xl" />
              ))}
            </div>
          ) : view === 'kanban' ? (
            <DataKanban
              data={data?.items ?? []}
              columns={KANBAN_COLUMNS}
              getStatus={(p) => p.status}
              getKey={(p) => p.id}
              entity="payment"
              renderCard={(p) => (
                <div className="bg-card hover:border-primary/40 rounded-lg border border-border p-3 shadow-xs transition-colors">
                  <p className="text-sm font-semibold tabular-nums">{p.invoiceNo}</p>
                  <p className="text-muted-foreground mt-1 text-xs">{p.userName}</p>
                  <p className="text-muted-foreground mt-0.5 text-xs">{p.packageName}</p>
                  <div className="mt-2 flex items-center justify-between border-t border-dashed border-border pt-2 text-xs">
                    <span className="tabular-nums font-medium">{formatTry(p.amount)}</span>
                    <PaymentMethodBadge method={p.method} />
                  </div>
                </div>
              )}
            />
          ) : (
            <DataGallery
              data={data?.items ?? []}
              getKey={(p) => p.id}
              renderCard={(p) => (
                <div className="bg-card overflow-hidden rounded-xl border border-border shadow-xs transition-shadow hover:shadow-md">
                  <div className="p-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold tabular-nums">{p.invoiceNo}</h3>
                      <PaymentStatusBadge status={p.status} />
                    </div>
                    <p className="text-muted-foreground mt-1 text-xs">{p.userName}</p>
                    <p className="text-muted-foreground mt-0.5 text-xs">{p.packageName}</p>
                    <div className="mt-2 flex items-center justify-between border-t border-dashed border-border pt-2 text-xs">
                      <span className="tabular-nums font-medium">{formatTry(p.amount)}</span>
                      <PaymentMethodBadge method={p.method} />
                    </div>
                    <p className="text-muted-foreground mt-1 text-xs tabular-nums">
                      {new Date(p.createdAt).toLocaleDateString('tr-TR')}
                    </p>
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
      <dd className="break-all tabular-nums">{value}</dd>
    </div>
  );
}
