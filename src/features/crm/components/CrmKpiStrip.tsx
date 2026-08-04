import { Users, Target, TrendingUp, AlertTriangle } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { CrmStats } from '../api/queries';

interface CrmKpiStripProps {
  stats: CrmStats | undefined;
  isLoading: boolean;
}

export function CrmKpiStrip({ stats, isLoading }: CrmKpiStripProps) {
  if (isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" role="status" aria-label="KPI yükleniyor">
        {Array.from({ length: 4 }, (_, i) => (
          <Card key={i}>
            <CardContent className="flex items-center gap-3 p-4">
              <Skeleton className="size-10 rounded-lg" />
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-6 w-16" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-muted-foreground py-4 text-center text-sm" role="status">
        KPI verileri yüklenemedi.
      </div>
    );
  }

  const kpis = [
    {
      label: 'Toplam Kişi',
      value: stats.totalContacts.toLocaleString('tr-TR'),
      sub: `${stats.vipContacts} VIP`,
      icon: Users,
      color: 'text-foreground bg-muted',
    },
    {
      label: 'Aktif Lead',
      value: stats.activeLeads.toLocaleString('tr-TR'),
      sub: `${stats.wonLeads} kazanılan`,
      icon: Target,
      color: 'text-warning-foreground bg-warning/20',
    },
    {
      label: 'Pipeline Değeri',
      value: `₺${(stats.totalPipeline / 1000).toFixed(0)}K`,
      sub: `₺${(stats.wonRevenue / 1000).toFixed(0)}K kazanılan`,
      icon: TrendingUp,
      color: 'text-success-foreground bg-success/15',
    },
    {
      label: 'Geciken Takip',
      value: stats.overdueFollowUps.toLocaleString('tr-TR'),
      sub: `%${stats.conversionRate} dönüşüm`,
      icon: AlertTriangle,
      color: stats.overdueFollowUps > 0
        ? 'text-destructive bg-destructive/10'
        : 'text-success-foreground bg-success/15',
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" role="region" aria-label="CRM KPI göstergeleri">
      {kpis.map((kpi) => (
        <Card key={kpi.label}>
          <CardContent className="flex items-center gap-3 p-4">
            <div className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${kpi.color}`}>
              <kpi.icon className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="text-muted-foreground text-xs">{kpi.label}</p>
              <p className="text-xl font-semibold tabular-nums">{kpi.value}</p>
              <p className="text-muted-foreground text-xs tabular-nums">{kpi.sub}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
