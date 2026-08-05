import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Tooltip,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Funnel,
  FunnelChart,
  LabelList,
  PieChart,
  Pie,
} from 'recharts';
import { TrendingUp, Target, Wallet, BarChart3 } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/feedback/ErrorState';
import { useLeads, useCrmStats } from '../api/queries';
import type { TableQuery } from '@/components/data-table/types';
import { LEAD_STAGE_LABELS, LEAD_PRIORITY_LABELS } from '../data/crm';
const PIPELINE_STAGES = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost'] as const;

const STAGE_CHART_COLORS = [
  'var(--color-chart-1)',
  'var(--color-chart-2)',
  'var(--color-chart-3)',
  'var(--color-chart-4)',
  'var(--color-chart-5)',
  'var(--color-chart-1)',
  'var(--color-destructive)',
];

const PRIORITY_CHART_COLORS = [
  'var(--color-chart-3)',
  'var(--color-chart-1)',
  'var(--color-chart-4)',
  'var(--color-chart-5)',
];

function formatTry(value: number): string {
  if (value >= 1_000_000) return `₺${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `₺${(value / 1_000).toFixed(0)}K`;
  return `₺${value}`;
}

const PIPELINE_QUERY: TableQuery = { page: 1, pageSize: 1000, sort: [], filters: {}, q: '' };

export function CrmPipelinePage() {
  const { data, isLoading, isError, refetch } = useLeads(PIPELINE_QUERY);
  const { isLoading: statsLoading } = useCrmStats();
  const leads = useMemo(() => data?.items ?? [], [data]);

  const funnelData = useMemo(() => {
    const active = PIPELINE_STAGES.filter((s) => s !== 'lost');
    return active.map((stage, i) => {
      const items = leads.filter((l) => l.stage === stage);
      return {
        name: LEAD_STAGE_LABELS[stage],
        value: items.length,
        revenue: items.reduce((sum, l) => sum + l.value, 0),
        fill: STAGE_CHART_COLORS[i] ?? 'var(--color-chart-1)',
      };
    });
  }, [leads]);

  const stageRevenueData = useMemo(() => {
    return PIPELINE_STAGES.map((stage, i) => {
      const items = leads.filter((l) => l.stage === stage);
      return {
        stage: LEAD_STAGE_LABELS[stage],
        count: items.length,
        revenue: items.reduce((sum, l) => sum + l.value, 0),
        avgValue: items.length > 0 ? Math.round(items.reduce((sum, l) => sum + l.value, 0) / items.length) : 0,
        fill: STAGE_CHART_COLORS[i] ?? 'var(--color-chart-1)',
      };
    });
  }, [leads]);

  const priorityData = useMemo(() => {
    const priorities = ['low', 'medium', 'high', 'urgent'] as const;
    return priorities.map((p, i) => {
      const items = leads.filter((l) => l.priority === p && l.stage !== 'won' && l.stage !== 'lost');
      return {
        name: LEAD_PRIORITY_LABELS[p],
        value: items.length,
        revenue: items.reduce((sum, l) => sum + l.value, 0),
        fill: PRIORITY_CHART_COLORS[i] ?? 'var(--color-chart-1)',
      };
    });
  }, [leads]);

  const conversionMetrics = useMemo(() => {
    const total = leads.length;
    const won = leads.filter((l) => l.stage === 'won');
    const lost = leads.filter((l) => l.stage === 'lost');
    const active = leads.filter((l) => l.stage !== 'won' && l.stage !== 'lost');
    const avgDealSize = won.length > 0 ? Math.round(won.reduce((s, l) => s + l.value, 0) / won.length) : 0;
    const weightedPipeline = active.reduce((sum, l) => sum + l.value * (l.probability / 100), 0);

    return {
      total,
      wonCount: won.length,
      lostCount: lost.length,
      activeCount: active.length,
      winRate: total > 0 ? Math.round((won.length / total) * 100) : 0,
      avgDealSize,
      weightedPipeline: Math.round(weightedPipeline),
      totalPipeline: active.reduce((s, l) => s + l.value, 0),
    };
  }, [leads]);

  if (isError) return <ErrorState onRetry={() => void refetch()} />;

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold">Pipeline Raporları</h1>
        <p className="text-muted-foreground text-sm">Satış hunisi, aşama geliri ve dönüşüm analizi.</p>
      </header>

      {/* KPI strip */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {isLoading || statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))
        ) : (
          <>
            <KpiMini icon={Target} label="Kazanma Oranı" value={`%${conversionMetrics.winRate}`} sub={`${conversionMetrics.wonCount} kazanılan / ${conversionMetrics.total} toplam`} color="text-success-foreground bg-success/15" />
            <KpiMini icon={Wallet} label="Ort. Anlaşma" value={formatTry(conversionMetrics.avgDealSize)} sub={`${conversionMetrics.wonCount} kazanılan deal`} color="text-foreground bg-muted" />
            <KpiMini icon={TrendingUp} label="Ağırlıklı Pipeline" value={formatTry(conversionMetrics.weightedPipeline)} sub={`${conversionMetrics.activeCount} aktif lead`} color="text-warning-foreground bg-warning/20" />
            <KpiMini icon={BarChart3} label="Toplam Pipeline" value={formatTry(conversionMetrics.totalPipeline)} sub={`${conversionMetrics.lostCount} kaybedilen`} color="text-muted-foreground bg-muted" />
          </>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {/* Funnel chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Satış Hunisi</CardTitle>
            <CardDescription>Aşama bazlı lead dağılımı (kayıp hariç).</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <div role="img" aria-label="Satış hunisi: aşama bazlı lead dağılımı">
              <ResponsiveContainer width="100%" height={280}>
                <FunnelChart>
                  <Tooltip />
                  <Funnel dataKey="value" data={funnelData} isAnimationActive>
                    <LabelList position="right" dataKey="name" className="fill-foreground text-xs" />
                    <LabelList position="center" dataKey="value" className="fill-background text-sm font-bold" />
                  </Funnel>
                </FunnelChart>
              </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Priority donut */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Öncelik Dağılımı</CardTitle>
            <CardDescription>Aktif leadlerin öncelik bazlı dağılımı.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <div className="flex items-center gap-6" role="img" aria-label="Aktif leadlerin öncelik dağılımı">
                <ResponsiveContainer width="50%" height={240}>
                  <PieChart>
                    <Pie data={priorityData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={50}>
                      {priorityData.map((entry, i) => (
                        <Cell key={entry.name} fill={PRIORITY_CHART_COLORS[i] ?? 'var(--color-chart-1)'} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {priorityData.map((entry, i) => {
                    const dotColor = ['bg-chart-3', 'bg-chart-1', 'bg-chart-4', 'bg-chart-5'][i] ?? 'bg-chart-1';
                    return (
                      <div key={entry.name} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className={`size-3 rounded-full ${dotColor}`} />
                          <span>{entry.name}</span>
                        </div>
                        <span className="font-medium tabular-nums">{entry.value}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Stage revenue bar chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Aşama Bazlı Gelir</CardTitle>
          <CardDescription>Her aşamadaki toplam potansiyel gelir ve lead sayısı.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-72 w-full" />
          ) : (
            <div role="img" aria-label="Aşama bazlı toplam potansiyel gelir grafiği">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stageRevenueData} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="stage" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                <YAxis tickFormatter={(v: number) => formatTry(v)} tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                <Tooltip
                  contentStyle={{ borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}
                />
                <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                  {stageRevenueData.map((entry, i) => (
                    <Cell key={entry.stage} fill={STAGE_CHART_COLORS[i] ?? 'var(--color-chart-1)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Conversion table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Aşama Detay Tablosu</CardTitle>
          <CardDescription>Her aşamadaki lead sayısı, toplam ve ortalama değer.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-border border-b">
                  <th scope="col" className="text-muted-foreground px-3 py-2 text-left text-xs font-medium">Aşama</th>
                  <th scope="col" className="text-muted-foreground px-3 py-2 text-right text-xs font-medium">Lead</th>
                  <th scope="col" className="text-muted-foreground px-3 py-2 text-right text-xs font-medium">Toplam Değer</th>
                  <th scope="col" className="text-muted-foreground px-3 py-2 text-right text-xs font-medium">Ort. Değer</th>
                </tr>
              </thead>
              <tbody>
                {stageRevenueData.map((row) => (
                  <tr key={row.stage} className="border-border border-b last:border-0">
                    <td className="px-3 py-2 font-medium">{row.stage}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{row.count}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatTry(row.revenue)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatTry(row.avgValue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function KpiMini({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub: string;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${color}`}>
          <Icon className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="text-muted-foreground text-xs">{label}</p>
          <p className="text-xl font-semibold tabular-nums">{value}</p>
          <p className="text-muted-foreground text-xs tabular-nums">{sub}</p>
        </div>
      </CardContent>
    </Card>
  );
}
