import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  Award,
  BarChart3,
  Banknote,
  Building2,
  CheckCircle2,
  Clock,
  Crown,
  Eye,
  FileBarChart,
  FolderTree,
  Gauge,
  Hourglass,
  ImageOff,
  Layers,
  LineChart,
  ListChecks,
  MapPin,
  Megaphone,
  MousePointer2,
  Package,
  Percent,
  PieChart,
  Phone,
  Receipt,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Split,
  Timer,
  TrendingUp,
  Users,
  UserRound,
  Wallet,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { KpiCard } from '@/components/data/KpiCard';
import { DonutChartCard } from '@/components/data/DonutChartCard';
import { EmptyState } from '@/components/feedback/EmptyState';
import type { AuditEntry } from '@/lib/audit';
import type { DashPeriod, DashSection, WidgetId } from '@/config/dashboard-layout';
import { CATEGORY_LABELS, LOCATIONS } from '@/features/listings/data/taxonomy';
import type { Listing } from '@/features/listings/schemas/listing';
import { AiSuggestionBadge } from '@/features/listings/components/AiSuggestionBadge';
import type { DashboardInsights, DashboardStats, PeriodKpis } from '../api/queries';
import { fmtCompact, fmtCurrency, fmtCurrencyCompact, fmtDuration, fmtInt, fmtMinutes, fmtPercent } from '../lib/format';
import { BarList } from './BarList';
import { MiniArea, MiniLines } from './MiniTrend';

/** Everything a widget needs to render, resolved once by the page. */
export interface WidgetContext {
  stats: DashboardStats | undefined;
  insights: DashboardInsights | undefined;
  /** insights.periods[period] — the active period's KPI snapshot. */
  kpi: PeriodKpis | undefined;
  pending: Listing[];
  audit: AuditEntry[];
  period: DashPeriod;
  loading: boolean;
}

export interface WidgetDef {
  id: WidgetId;
  title: string;
  icon: LucideIcon;
  sections: DashSection[];
  /** Column span in the 4-col bento (1 = KPI tile, 2 = wide panel). */
  span: 1 | 2;
  render: (ctx: WidgetContext) => ReactNode;
}

export const PERIOD_LABEL: Record<DashPeriod, string> = {
  today: 'Bugün',
  '7d': '7 gün',
  '30d': '30 gün',
};

export const SECTION_LABEL: Record<DashSection, string> = {
  genel: 'Genel',
  moderasyon: 'Moderasyon',
  gelir: 'Gelir',
  trafik: 'Trafik',
};

/** Section tabs metadata (id + label + icon), in display order. */
export const SECTION_META: { id: DashSection; label: string; icon: LucideIcon }[] = [
  { id: 'genel', label: 'Genel', icon: Gauge },
  { id: 'moderasyon', label: 'Moderasyon', icon: ShieldCheck },
  { id: 'gelir', label: 'Gelir', icon: Wallet },
  { id: 'trafik', label: 'Trafik', icon: Activity },
];

const QUICK_LINKS: { to: string; label: string; icon: LucideIcon }[] = [
  { to: '/listings', label: 'İlanlar', icon: Building2 },
  { to: '/listings/moderation', label: 'Moderasyon', icon: Clock },
  { to: '/categories', label: 'Kategoriler', icon: FolderTree },
  { to: '/locations', label: 'Lokasyonlar', icon: MapPin },
  { to: '/users', label: 'Üyeler', icon: Users },
  { to: '/promotions', label: 'Kampanya', icon: Megaphone },
  { to: '/reports', label: 'Raporlar', icon: FileBarChart },
  { to: '/settings', label: 'Ayarlar', icon: Settings },
];

const RISK_ICON: Record<DashboardInsights['riskSignals'][number]['icon'], LucideIcon> = {
  phone: Phone,
  image: ImageOff,
  price: Banknote,
};

/* ---------------------------------------------------------------- helpers */

/** Standard panel shell for non-KPI widgets, with a shape-matched loading block. */
function Panel({
  title,
  description,
  action,
  loading,
  skeletonHeight = 180,
  children,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  loading?: boolean;
  skeletonHeight?: number;
  children: ReactNode;
}) {
  return (
    // `h-full` + a growing content region lets paired panels in a 2-up row match
    // heights (the grid stretches each cell), so a short card never leaves an
    // ugly gap beside a taller one.
    <Card className="h-full gap-3" data-slot="widget-panel">
      <CardHeader className="flex-row items-start justify-between gap-2">
        <div className="min-w-0">
          <CardTitle className="text-base">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        {action}
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        {loading ? (
          <div
            className="bg-muted w-full flex-1 animate-pulse rounded"
            style={{ minHeight: skeletonHeight }}
            data-slot="widget-skeleton"
            aria-hidden="true"
          />
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}

/** Two-column initials + name rows used by the moderator/agent leaderboards. */
function Avatar({ initials }: { initials: string }) {
  return (
    <span className="bg-secondary text-secondary-foreground inline-grid size-6 shrink-0 place-items-center rounded-md text-[11px] font-semibold">
      {initials}
    </span>
  );
}

/* ---------------------------------------------------------------- widgets */

const DEFS: Record<WidgetId, WidgetDef> = {
  /* ===== Genel + shared KPIs ===== */
  'total-listings': {
    id: 'total-listings',
    title: 'Toplam ilan',
    icon: Building2,
    sections: ['genel'],
    span: 1,
    render: ({ stats, loading }) => (
      <KpiCard label="Toplam ilan" value={stats?.totalListings ?? 0} icon={Building2} hint="tüm kategoriler" loading={loading} />
    ),
  },
  'pending-moderation': {
    id: 'pending-moderation',
    title: 'Bekleyen moderasyon',
    icon: Clock,
    sections: ['genel', 'moderasyon'],
    span: 1,
    render: ({ stats, loading }) => (
      <KpiCard label="Bekleyen moderasyon" value={stats?.pending ?? 0} icon={Clock} hint="kuyrukta" loading={loading} />
    ),
  },
  published: {
    id: 'published',
    title: 'Yayında',
    icon: CheckCircle2,
    sections: ['genel'],
    span: 1,
    render: ({ stats, loading }) => (
      <KpiCard label="Yayında" value={stats?.active ?? 0} icon={CheckCircle2} hint="aktif ilan" loading={loading} />
    ),
  },
  revenue: {
    id: 'revenue',
    title: 'Gelir',
    icon: Wallet,
    sections: ['genel', 'gelir'],
    span: 1,
    render: ({ kpi, period, loading }) => (
      <KpiCard label={`Gelir · ${PERIOD_LABEL[period]}`} value={kpi ? fmtCurrencyCompact(kpi.revenue) : 0} icon={Wallet} hint="doping + öne çıkarma + vitrin" loading={loading} />
    ),
  },

  /* ===== Genel span-2 panels ===== */
  'category-breakdown': {
    id: 'category-breakdown',
    title: 'Kategoriye göre ilanlar',
    icon: BarChart3,
    sections: ['genel', 'trafik'],
    span: 2,
    render: ({ stats, loading }) => (
      <Panel title="Kategoriye göre ilanlar" description="Aktif taksonomi dağılımı" loading={loading}>
        <BarList
          items={(stats?.byCategory ?? []).map((c, i) => ({
            label: c.label,
            value: c.count,
            display: fmtInt(c.count),
            colorToken: ((i % 5) + 1) as 1 | 2 | 3 | 4 | 5,
          }))}
        />
      </Panel>
    ),
  },
  'status-donut': {
    id: 'status-donut',
    title: 'Duruma göre dağılım',
    icon: PieChart,
    sections: ['genel'],
    span: 2,
    render: ({ stats, loading }) => (
      <DonutChartCard
        className="h-full"
        height={200}
        title="Duruma göre dağılım"
        description="İlan yaşam döngüsü"
        centerLabel="ilan"
        loading={loading}
        data={(stats?.byStatus ?? []).filter((s) => s.count > 0).map((s) => ({ name: s.label, value: s.count }))}
      />
    ),
  },
  'pending-queue': {
    id: 'pending-queue',
    title: 'Bekleyen ilanlar',
    icon: ListChecks,
    sections: ['genel', 'moderasyon'],
    span: 2,
    render: ({ pending, loading }) => (
      <Panel
        title="Bekleyen ilanlar"
        description="Moderasyon gerektiren son ilanlar"
        loading={loading}
        action={
          <Button asChild variant="outline" size="sm">
            <Link to="/listings/moderation" data-action="navigate" data-entity="listing">
              Kuyruğa git
            </Link>
          </Button>
        }
      >
        {pending.length === 0 ? (
          <EmptyState className="border-0 px-0 py-6 my-auto" title="Bekleyen ilan yok" description="Tüm ilanlar değerlendirildi." />
        ) : (
          <ul className="divide-border divide-y">
            {pending.slice(0, 5).map((listing) => (
              <li key={listing.id} className="flex items-center gap-3 py-2">
                <Link to={`/listings/${listing.id}`} className="min-w-0 flex-1 truncate font-medium hover:underline" data-action="open-detail" data-entity="listing">
                  {listing.title}
                </Link>
                <span className="text-muted-foreground hidden text-sm md:inline">
                  {CATEGORY_LABELS[listing.category]} · {LOCATIONS[listing.il]?.label ?? listing.il}
                </span>
                <AiSuggestionBadge suggestion={listing.aiSuggestion} reasons={listing.aiReasons} />
              </li>
            ))}
          </ul>
        )}
      </Panel>
    ),
  },
  'recent-decisions': {
    id: 'recent-decisions',
    title: 'Son moderasyon kararları',
    icon: ShieldCheck,
    sections: ['genel', 'moderasyon'],
    span: 2,
    render: ({ audit, loading }) => (
      <Panel title="Son moderasyon kararları" description="Denetim kaydından" loading={loading}>
        {audit.length === 0 ? (
          <EmptyState className="border-0 px-0 py-6 my-auto" title="Henüz karar yok" description="Moderasyon kuyruğundan başlayın." />
        ) : (
          <ol className="space-y-2 text-sm">
            {audit.slice(0, 6).map((entry) => (
              <li key={entry.id} className="flex items-center gap-2">
                <ShieldCheck className="text-muted-foreground size-3.5 shrink-0" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate">
                  <span className="font-medium">{entry.action}</span> <span className="text-muted-foreground">{entry.resource}</span>
                </span>
                <span className="text-muted-foreground ml-auto font-mono text-xs tabular-nums">{entry.ts.slice(0, 10)}</span>
              </li>
            ))}
          </ol>
        )}
      </Panel>
    ),
  },
  'top-viewed': {
    id: 'top-viewed',
    title: 'En çok görüntülenen ilanlar',
    icon: Eye,
    sections: ['genel', 'trafik'],
    span: 2,
    render: ({ insights, loading }) => (
      <Panel title="En çok görüntülenen ilanlar" description="Bugün · tekil görüntülenme" loading={loading}>
        <ul className="divide-border divide-y">
          {(insights?.topViewed ?? []).map((row) => (
            <li key={row.title} className="flex items-center gap-3 py-2 text-sm">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{row.title}</span>
                <span className="text-muted-foreground text-xs">{row.meta}</span>
              </span>
              <span className="font-mono font-semibold tabular-nums">{fmtCompact(row.views)}</span>
            </li>
          ))}
        </ul>
      </Panel>
    ),
  },
  'quick-access': {
    id: 'quick-access',
    title: 'Hızlı erişim',
    icon: TrendingUp,
    sections: ['genel'],
    span: 2,
    render: () => (
      <Panel title="Hızlı erişim">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {QUICK_LINKS.map((q) => (
            <Card key={q.to} interactive className="border-border/60 relative gap-0 py-0 shadow-none">
              <CardContent className="flex min-h-11 items-center gap-2 px-3 py-2 text-sm font-medium">
                <q.icon className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
                <Link to={q.to} className="rounded-sm after:absolute after:inset-0 focus-visible:outline-none" data-action="navigate" data-entity="module">
                  {q.label}
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </Panel>
    ),
  },

  /* ===== Moderasyon ===== */
  'avg-moderation-time': {
    id: 'avg-moderation-time',
    title: 'Ort. moderasyon süresi',
    icon: Timer,
    sections: ['moderasyon'],
    span: 1,
    render: ({ kpi, loading }) => (
      <KpiCard label="Ort. moderasyon süresi" value={kpi ? fmtMinutes(kpi.avgModerationMinutes) : 0} icon={Timer} hint="hedef < 20 dk" loading={loading} />
    ),
  },
  'approval-rate': {
    id: 'approval-rate',
    title: 'Onay oranı',
    icon: Percent,
    sections: ['moderasyon'],
    span: 1,
    render: ({ kpi, loading }) => (
      <KpiCard label="Onay oranı" value={kpi ? fmtPercent(kpi.approvalRate) : 0} icon={Percent} hint={kpi ? `${fmtInt(kpi.approvedCount)} onay · ${fmtInt(kpi.rejectedCount)} ret` : 'onay / ret'} loading={loading} />
    ),
  },
  'active-moderators': {
    id: 'active-moderators',
    title: 'Aktif moderatör',
    icon: Users,
    sections: ['moderasyon'],
    span: 1,
    render: ({ insights, loading }) => (
      <KpiCard label="Aktif moderatör" value={insights ? `${insights.activeModerators.online} / ${insights.activeModerators.total}` : 0} icon={Users} hint="çevrimiçi" loading={loading} />
    ),
  },
  'queue-aging': {
    id: 'queue-aging',
    title: 'Kuyruk yaşlanma (SLA)',
    icon: Hourglass,
    sections: ['moderasyon'],
    span: 2,
    render: ({ insights, loading }) => {
      const critical = insights?.queueAging.find((b) => b.tone === 'critical')?.count ?? 0;
      return (
        <Panel
          title="Kuyruk yaşlanma — SLA"
          description="Bekleme süresine göre"
          loading={loading}
          action={critical > 0 ? <span className="bg-destructive/10 text-destructive-tint-foreground rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums">{critical} kritik</span> : undefined}
        >
          <BarList showSwatch items={(insights?.queueAging ?? []).map((b) => ({ label: b.bucket, value: b.count, display: fmtInt(b.count), tone: b.tone }))} />
        </Panel>
      );
    },
  },
  'decision-trend': {
    id: 'decision-trend',
    title: 'Moderasyon karar trendi',
    icon: LineChart,
    sections: ['moderasyon'],
    span: 2,
    render: ({ insights, loading }) => {
      const data = (insights?.decisionTrend ?? []).map((p) => ({ label: p.label, a: p.approved, b: p.rejected }));
      const first = data[0];
      const last = data[data.length - 1];
      return (
        <Panel
          title="Moderasyon karar trendi"
          description="Onay / ret · son 14 gün"
          loading={loading}
          action={
            <div className="text-muted-foreground flex flex-wrap gap-x-3 gap-y-1 text-xs">
              <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full" style={{ background: 'var(--color-chart-3)' }} aria-hidden="true" /> Onay</span>
              <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full" style={{ background: 'var(--color-chart-5)' }} aria-hidden="true" /> Ret</span>
            </div>
          }
        >
          <MiniLines data={data} summary={first && last ? `Son 14 günde günlük onay ${fmtInt(first.a)}'ten ${fmtInt(last.a)}'e yükseldi; ret ${fmtInt(first.b)} civarında sabit kaldı.` : 'Onay ve ret kararlarının 14 günlük trendi.'} />
        </Panel>
      );
    },
  },
  'moderator-performance': {
    id: 'moderator-performance',
    title: 'Moderatör performansı',
    icon: Award,
    sections: ['moderasyon'],
    span: 2,
    render: ({ insights, loading }) => (
      <Panel title="Moderatör performansı" description="Bugün · karar sayısı ve hız" loading={loading}>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-muted-foreground border-border border-b text-xs">
              <th scope="col" className="pb-2 text-left font-medium">Moderatör</th>
              <th scope="col" className="pb-2 text-right font-medium">Karar</th>
              <th scope="col" className="pb-2 text-right font-medium">Ort. süre</th>
            </tr>
          </thead>
          <tbody className="divide-border divide-y">
            {(insights?.moderators ?? []).map((m) => (
              <tr key={m.initials}>
                <td className="flex items-center gap-2 py-2"><Avatar initials={m.initials} /> {m.name}</td>
                <td className="text-right font-mono tabular-nums">{fmtInt(m.decisions)}</td>
                <td className="text-right tabular-nums">{fmtMinutes(m.avgMinutes)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    ),
  },
  'risk-signals': {
    id: 'risk-signals',
    title: 'Risk & fraud sinyalleri',
    icon: ShieldAlert,
    sections: ['moderasyon'],
    span: 2,
    render: ({ insights, loading }) => (
      <Panel title="Risk & fraud sinyalleri" description="Otomatik kural motorundan" loading={loading}>
        <ul className="space-y-2">
          {(insights?.riskSignals ?? []).map((r) => {
            const Icon = RISK_ICON[r.icon];
            return (
              <li key={r.label} className="flex items-center gap-3 text-sm">
                <span className="bg-muted text-muted-foreground grid size-8 shrink-0 place-items-center rounded-md">
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{r.label}</span>
                  <span className="text-muted-foreground text-xs">{r.detail}</span>
                </span>
                <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', r.severity === 'high' ? 'bg-destructive/10 text-destructive-tint-foreground' : 'bg-warning/20 text-warning-foreground')}>
                  {r.severity === 'high' ? 'yüksek' : 'orta'}
                </span>
              </li>
            );
          })}
        </ul>
      </Panel>
    ),
  },

  /* ===== Gelir ===== */
  arpu: {
    id: 'arpu',
    title: 'Emlakçı başına gelir',
    icon: UserRound,
    sections: ['gelir'],
    span: 1,
    render: ({ kpi, loading }) => (
      <KpiCard label="Emlakçı başına gelir" value={kpi ? fmtCurrency(kpi.arpu) : 0} icon={UserRound} hint="ARPU · aktif emlakçı" loading={loading} />
    ),
  },
  'payment-count': {
    id: 'payment-count',
    title: 'Ödeme sayısı',
    icon: Receipt,
    sections: ['gelir'],
    span: 1,
    render: ({ kpi, period, loading }) => (
      <KpiCard label={`Ödeme · ${PERIOD_LABEL[period]}`} value={kpi ? fmtInt(kpi.paymentCount) : 0} icon={Receipt} hint="başarılı işlem" loading={loading} />
    ),
  },
  'paid-conversion': {
    id: 'paid-conversion',
    title: 'Ücretli ürün dönüşümü',
    icon: Percent,
    sections: ['gelir'],
    span: 1,
    render: ({ kpi, loading }) => (
      <KpiCard label="Ücretli ürün dönüşümü" value={kpi ? `%${kpi.paidConversion.toLocaleString('tr-TR', { minimumFractionDigits: 1 })}` : 0} icon={Percent} hint="ilan → ücretli ürün" loading={loading} />
    ),
  },
  'revenue-trend': {
    id: 'revenue-trend',
    title: 'Gelir trendi',
    icon: TrendingUp,
    sections: ['gelir'],
    span: 2,
    render: ({ insights, loading }) => {
      const data = insights?.revenueTrend ?? [];
      const first = data[0];
      const last = data[data.length - 1];
      return (
        <Panel title="Gelir trendi" description="Günlük · son 30 gün" loading={loading}>
          <MiniArea colorToken={1} data={data} summary={first && last ? `Son 30 günde günlük gelir ${fmtCurrencyCompact(first.value)} seviyesinden ${fmtCurrencyCompact(last.value)} seviyesine yükseldi.` : 'Günlük gelir trendi.'} />
        </Panel>
      );
    },
  },
  'revenue-breakdown': {
    id: 'revenue-breakdown',
    title: 'Gelir kırılımı',
    icon: Layers,
    sections: ['gelir'],
    span: 2,
    render: ({ insights, loading }) => (
      <Panel title="Gelir kırılımı" description="Ürün bazında" loading={loading}>
        <BarList showSwatch items={(insights?.revenueByProduct ?? []).map((p, i) => ({ label: p.label, value: p.value, display: fmtCurrencyCompact(p.value), colorToken: ((i % 5) + 1) as 1 | 2 | 3 | 4 | 5 }))} />
      </Panel>
    ),
  },
  'top-agents': {
    id: 'top-agents',
    title: 'En çok kazandıran emlakçılar',
    icon: Crown,
    sections: ['gelir'],
    span: 2,
    render: ({ insights, loading }) => (
      <Panel title="En çok kazandıran emlakçılar" description="Harcama" loading={loading}>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-muted-foreground border-border border-b text-xs">
              <th scope="col" className="pb-2 text-left font-medium">Emlakçı</th>
              <th scope="col" className="pb-2 text-right font-medium">İlan</th>
              <th scope="col" className="pb-2 text-right font-medium">Harcama</th>
            </tr>
          </thead>
          <tbody className="divide-border divide-y">
            {(insights?.topAgents ?? []).map((a) => (
              <tr key={a.initials}>
                <td className="flex items-center gap-2 py-2"><Avatar initials={a.initials} /> {a.name}</td>
                <td className="text-right font-mono tabular-nums">{fmtInt(a.listings)}</td>
                <td className="text-right font-mono font-semibold tabular-nums">{fmtCurrency(a.spend)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    ),
  },
  'product-mix': {
    id: 'product-mix',
    title: 'Ürün / paket dağılımı',
    icon: Package,
    sections: ['gelir'],
    span: 2,
    render: ({ insights, loading }) => (
      <DonutChartCard className="h-full" height={200} title="Ürün / paket dağılımı" description="Satış adedi" centerLabel="satış" loading={loading} data={(insights?.productMix ?? []).map((p) => ({ name: p.label, value: p.value }))} />
    ),
  },

  /* ===== Trafik ===== */
  visits: {
    id: 'visits',
    title: 'Ziyaret',
    icon: MousePointer2,
    sections: ['trafik'],
    span: 1,
    render: ({ kpi, loading }) => (
      <KpiCard label="Ziyaret" value={kpi ? fmtCompact(kpi.visits) : 0} icon={MousePointer2} hint="oturum" loading={loading} />
    ),
  },
  'listing-views': {
    id: 'listing-views',
    title: 'İlan görüntülenme',
    icon: Eye,
    sections: ['trafik'],
    span: 1,
    render: ({ kpi, loading }) => (
      <KpiCard label="İlan görüntülenme" value={kpi ? fmtCompact(kpi.listingViews) : 0} icon={Eye} hint="sayfa görüntüleme" loading={loading} />
    ),
  },
  'unique-visitors': {
    id: 'unique-visitors',
    title: 'Tekil ziyaretçi',
    icon: UserRound,
    sections: ['trafik'],
    span: 1,
    render: ({ kpi, loading }) => (
      <KpiCard label="Tekil ziyaretçi" value={kpi ? fmtCompact(kpi.uniqueVisitors) : 0} icon={UserRound} hint="tekil kullanıcı" loading={loading} />
    ),
  },
  'avg-session': {
    id: 'avg-session',
    title: 'Ort. oturum süresi',
    icon: Timer,
    sections: ['trafik'],
    span: 1,
    render: ({ kpi, loading }) => (
      <KpiCard label="Ort. oturum süresi" value={kpi ? fmtDuration(kpi.avgSessionSeconds) : 0} icon={Timer} hint="dk:sn" loading={loading} />
    ),
  },
  'traffic-trend': {
    id: 'traffic-trend',
    title: 'Trafik trendi',
    icon: Activity,
    sections: ['trafik'],
    span: 2,
    render: ({ insights, loading }) => {
      const data = insights?.trafficTrend ?? [];
      const first = data[0];
      const last = data[data.length - 1];
      return (
        <Panel title="Trafik trendi" description="Ziyaret · son 14 gün" loading={loading}>
          <MiniArea colorToken={2} data={data} summary={first && last ? `Son 14 günde günlük ziyaret ${fmtCompact(first.value)} seviyesinden ${fmtCompact(last.value)} seviyesine yükseldi.` : 'Günlük ziyaret trendi.'} />
        </Panel>
      );
    },
  },
  'traffic-source': {
    id: 'traffic-source',
    title: 'Trafik kaynağı',
    icon: Split,
    sections: ['trafik'],
    span: 2,
    render: ({ insights, loading }) => (
      <Panel title="Trafik kaynağı" description="Oturum payı" loading={loading}>
        <BarList items={(insights?.trafficSources ?? []).map((s, i) => ({ label: s.label, value: s.value, display: `%${s.value}`, colorToken: ((i % 5) + 1) as 1 | 2 | 3 | 4 | 5 }))} />
      </Panel>
    ),
  },
  'top-searches': {
    id: 'top-searches',
    title: 'Popüler aramalar',
    icon: Search,
    sections: ['trafik'],
    span: 2,
    render: ({ insights, loading }) => (
      <Panel title="Popüler aramalar" description="Bugün · arama terimleri" loading={loading}>
        <ul className="divide-border divide-y">
          {(insights?.topSearches ?? []).map((s) => (
            <li key={s.label} className="flex items-center gap-3 py-2 text-sm">
              <Search className="text-muted-foreground size-3.5 shrink-0" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate font-medium">{s.label}</span>
              <span className="text-muted-foreground font-mono tabular-nums">{fmtInt(s.value)}</span>
            </li>
          ))}
        </ul>
      </Panel>
    ),
  },
  'device-mix': {
    id: 'device-mix',
    title: 'Cihaz dağılımı',
    icon: Smartphone,
    sections: ['trafik'],
    span: 2,
    render: ({ insights, loading }) => (
      <DonutChartCard className="h-full" height={200} title="Cihaz dağılımı" description="Oturum kırılımı" centerLabel="oturum" loading={loading} data={(insights?.deviceMix ?? []).map((d) => ({ name: d.label, value: d.value }))} />
    ),
  },
};

/** All widget definitions in canonical registry order. */
export const WIDGET_DEFS: WidgetDef[] = Object.values(DEFS);

export function getWidget(id: WidgetId): WidgetDef {
  return DEFS[id];
}
