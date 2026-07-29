import { toast } from 'sonner';

import { DataTable } from '@/components/data-table/DataTable';
import { MobileListCard } from '@/components/data-table/MobileListCard';
import { FilterBar } from '@/components/data-table/FilterBar';
import { useTableUrlState } from '@/components/data-table/use-table-url-state';
import { exportCsv, exportXls } from '@/lib/export';
import { api, encodeListQuery } from '@/lib/api/client';
import type { Paginated } from '@/lib/api/types';
import { PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS } from '../data/promotions';
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

export function PaymentsListPage() {
  const state = useTableUrlState({ defaultPageSize: 25 });
  const { data, isLoading, isError, refetch } = usePayments(state.query);

  return (
    <div className="space-y-4">
      <header className="animate-fade-in flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Ödemeler &amp; Faturalar</h1>
          <p className="text-muted-foreground text-sm">
            Doping satın alma ödemeleri ve faturaları; satır seçip iade için detaya gidin.
          </p>
        </div>
      </header>

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
