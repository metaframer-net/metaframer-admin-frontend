import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Tooltip, XAxis, YAxis } from 'recharts';
import { Building2, CheckCircle2, Clock, Flag, TrendingUp, Wallet } from 'lucide-react';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { KpiCard } from '@/components/data/KpiCard';
import { ChartCard } from '@/components/data/ChartCard';
import { DonutChartCard } from '@/components/data/DonutChartCard';
import { LineChartCard } from '@/components/data/LineChartCard';
import { ErrorState } from '@/components/feedback/ErrorState';
import { REPORTS_RANGES, REPORTS_RANGE_LABELS, type ReportsRange } from '../schemas/reports';
import { useReportsOverview } from '../api/queries';
import { ChartExportMenu } from '../components/ChartExportMenu';

/** Turkish Lira, tabular; whole numbers (money stored as whole units). */
function formatTry(value: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPct(rate: number): string {
  return `%${(rate * 100).toFixed(1)}`;
}

const FUNNEL_TOKENS = [
  'var(--color-chart-1)',
  'var(--color-chart-2)',
  'var(--color-chart-3)',
  'var(--color-chart-4)',
];

export function ReportsPage() {
  const [range, setRange] = useState<ReportsRange>('30d');
  const { data, isLoading, isError, refetch } = useReportsOverview(range);

  const kpis = data?.kpis;

  return (
    <div className="space-y-6" data-entity="report">
      <header className="animate-fade-in flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold sm:text-2xl">Raporlar & Analitik</h1>
          <p className="text-muted-foreground text-sm">
            Pazaryeri metrikleri — mevcut verilerden türetilmiş, salt-okunur.
          </p>
        </div>
        <Tabs value={range} onValueChange={(v) => setRange(v as ReportsRange)}>
          <TabsList aria-label="Zaman aralığı" className="h-auto flex-wrap">
            {REPORTS_RANGES.map((r) => (
              <TabsTrigger key={r} value={r} className="min-h-11 px-3" data-action="set-range" data-entity="report">
                {REPORTS_RANGE_LABELS[r]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </header>

      {isError ? (
        <ErrorState
          title="Rapor yüklenemedi"
          description="Analitik verileri alınamadı. Lütfen tekrar deneyin."
          onRetry={() => void refetch()}
        />
      ) : (
        <>
          {/* KPI row */}
          {/* 6-up KPI band stays at 2xl (1280): the value type (text-2xl tabular-nums,
              e.g. formatTry ₺184.500) needs the width — under the old default scale
              6-up also lived at 1280, so this preserves legibility while still gaining
              the earlier 3-up reflow at lg (768) for tablet portrait. */}
          {/* Currency KPI values (formatTry) need width: stay 1-up until md (640)
              so a `text-2xl` ₺ figure isn't ellipsized in a half-width 480 column. */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
            <KpiCard label="Toplam İlan" value={kpis?.totalListings ?? 0} icon={Building2} loading={isLoading} hint="seçili aralık" />
            <KpiCard label="Yayında" value={kpis?.activeListings ?? 0} icon={CheckCircle2} loading={isLoading} hint="aktif ilan" />
            <KpiCard label="Toplam Gelir" value={kpis ? formatTry(kpis.totalRevenue) : '—'} icon={Wallet} loading={isLoading} hint="ödeme − iade" />
            <KpiCard label="İade Oranı" value={kpis ? formatPct(kpis.refundRate) : '—'} icon={TrendingUp} loading={isLoading} hint="tutar bazında" />
            <KpiCard label="Bekleyen Moderasyon" value={kpis?.pendingModeration ?? 0} icon={Clock} loading={isLoading} hint="kuyrukta" />
            <KpiCard label="Açık Şikayet" value={kpis?.openReports ?? 0} icon={Flag} loading={isLoading} hint="çözülmemiş" />
          </div>

          {/* Trends */}
          <div className="grid gap-4 lg:grid-cols-2">
            <LineChartCard
              title="İlan trendi"
              description="Günlük yeni ilan sayısı"
              data={data?.listingsTrend ?? []}
              variant="line"
              valueName="İlan"
              colorToken={1}
              loading={isLoading}
              action={
                <ChartExportMenu
                  filename={`ilan-trendi-${range}`}
                  label="İlan trendini dışa aktar"
                  headers={['Tarih', 'İlan']}
                  rows={(data?.listingsTrend ?? []).map((p) => [p.date, String(p.value)])}
                />
              }
            />
            <LineChartCard
              title="Gelir trendi"
              description="Günlük net gelir (₺)"
              data={data?.revenueTrend ?? []}
              variant="area"
              valueName="Gelir"
              valueFormatter={formatTry}
              colorToken={2}
              loading={isLoading}
              action={
                <ChartExportMenu
                  filename={`gelir-trendi-${range}`}
                  label="Gelir trendini dışa aktar"
                  headers={['Tarih', 'Gelir']}
                  rows={(data?.revenueTrend ?? []).map((p) => [p.date, String(p.value)])}
                />
              }
            />
          </div>

          {/* Breakdowns */}
          <div className="grid gap-4 xl:grid-cols-3">
            <div>
            <ChartCard
              title="Moderasyon hunisi"
              description="Gönderilen → sonuç"
              action={
                <ChartExportMenu
                  filename={`moderasyon-hunisi-${range}`}
                  label="Moderasyon hunisini dışa aktar"
                  headers={['Aşama', 'Adet']}
                  rows={(data?.moderationFunnel ?? []).map((s) => [s.label, String(s.value)])}
                />
              }
            >
              <BarChart data={data?.moderationFunnel ?? []} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  cursor={{ fill: 'var(--muted)' }}
                  contentStyle={{
                    background: 'var(--popover)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    color: 'var(--popover-foreground)',
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="value" name="Adet" radius={[4, 4, 0, 0]}>
                  {(data?.moderationFunnel ?? []).map((stage, i) => (
                    <Cell key={stage.stage} fill={FUNNEL_TOKENS[i % FUNNEL_TOKENS.length] ?? 'var(--color-chart-1)'} />
                  ))}
                </Bar>
              </BarChart>
            </ChartCard>
            {/* Accessible alternative for the funnel bar chart (color/label never the sole signal). */}
            <table className="sr-only">
              <caption>Moderasyon hunisi — veri özeti</caption>
              <thead>
                <tr>
                  <th scope="col">Aşama</th>
                  <th scope="col">Adet</th>
                </tr>
              </thead>
              <tbody>
                {(data?.moderationFunnel ?? []).map((stage) => (
                  <tr key={stage.stage}>
                    <td>{stage.label}</td>
                    <td>{stage.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>

            <DonutChartCard
              title="Kategoriye göre"
              description="İlan dağılımı"
              centerLabel="ilan"
              data={(data?.byCategory ?? []).filter((s) => s.value > 0).map((s) => ({ name: s.label, value: s.value }))}
            />

            <DonutChartCard
              title="Duruma göre"
              description="Yaşam döngüsü"
              centerLabel="ilan"
              data={(data?.byStatus ?? []).filter((s) => s.value > 0).map((s) => ({ name: s.label, value: s.value }))}
            />
          </div>
        </>
      )}
    </div>
  );
}
