import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts';
import {
  Building2,
  CheckCircle2,
  Clock,
  FolderTree,
  MapPin,
  Plus,
  ScrollText,
  XCircle,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { KpiCard } from '@/components/data/KpiCard';
import { ChartCard } from '@/components/data/ChartCard';
import { DonutChartCard } from '@/components/data/DonutChartCard';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { getAuditLog } from '@/lib/audit';
import type { TableQuery } from '@/components/data-table/types';
import { CATEGORY_LABELS, LOCATIONS } from '@/features/listings/data/taxonomy';
import { useListings } from '@/features/listings/api/queries';
import { AiSuggestionBadge } from '@/features/listings/components/AiSuggestionBadge';
import { useDashboardStats } from '../api/queries';

const PENDING_QUERY: TableQuery = {
  page: 1,
  pageSize: 5,
  sort: [{ id: 'createdAt', desc: true }],
  filters: { status: 'pending' },
  q: '',
};

const QUICK_LINKS = [
  { to: '/listings', label: 'İlanlar', icon: Building2 },
  { to: '/listings/moderation', label: 'Moderasyon', icon: Clock },
  { to: '/categories', label: 'Kategoriler', icon: FolderTree },
  { to: '/locations', label: 'Lokasyonlar', icon: MapPin },
];

export function DashboardPage() {
  const { data: stats, isLoading, isError, refetch } = useDashboardStats();
  const pendingQuery = useMemo(() => PENDING_QUERY, []);
  const { data: pending } = useListings(pendingQuery);
  const audit = getAuditLog().slice(0, 6);

  return (
    <div className="space-y-6">
      <header className="animate-fade-in flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold sm:text-2xl">Genel Bakış</h1>
          <p className="text-muted-foreground text-sm">Pazaryerinin anlık durumu ve bekleyen işler.</p>
        </div>
        <Button asChild>
          <Link to="/listings/create" data-action="create" data-entity="listing">
            <Plus className="size-4" /> Yeni ilan
          </Link>
        </Button>
      </header>

      {isError ? (
        // Without this branch a failed stats fetch would fall back to `?? 0` / `[]`
        // and render a confident zero-state indistinguishable from a genuinely empty
        // marketplace — the most misleading failure mode for an overview page.
        <ErrorState
          title="Panel yüklenemedi"
          description="Genel bakış verileri alınamadı. Lütfen tekrar deneyin."
          onRetry={() => void refetch()}
        />
      ) : (
      /* Bento — one responsive grid. Mobile 1-up; `lg` (768) 2-up (chart+donut side by
         side); `xl` (1024) 4-up with varied tile widths (span-1/span-2). `items-start`
         (not the default `stretch`): the bar chart has a fixed inner height while the
         donut grows taller when its legend stacks in a narrow column, so stretching
         would leave dead space inside the shorter card — top-aligned varied heights read
         as an intentional bento mosaic instead. Children fade-in-up in a token stagger.
         KPI band reflows 1→2-up at `lg` (768): unlike Reports' currency KpiCards
         (which hold width until `md`), these are plain counts, so the earlier 2-up
         reflow reads cleanly on tablet portrait. Deltas are intentionally omitted —
         a signed % needs a real prior-period baseline the mock doesn't have; the
         sparkline carries the direction-neutral trend instead. */
      <div className="stagger-children grid grid-cols-1 items-start gap-4 lg:grid-cols-2 xl:grid-cols-4">
        {/* KPI band — four 1×1 tiles (1-up mobile, 2-up lg, 4-up xl). */}
        <KpiCard
          label="Toplam İlan"
          value={stats?.totalListings ?? 0}
          icon={Building2}
          loading={isLoading}
          hint="tüm kategoriler"
          trend={stats?.trends.totalListings}
          reserveSparkline
        />
        <KpiCard
          label="Bekleyen Moderasyon"
          value={stats?.pending ?? 0}
          icon={Clock}
          loading={isLoading}
          hint="kuyrukta"
          trend={stats?.trends.pending}
          reserveSparkline
        />
        <KpiCard
          label="Yayında"
          value={stats?.active ?? 0}
          icon={CheckCircle2}
          loading={isLoading}
          hint="aktif ilan"
          trend={stats?.trends.active}
          reserveSparkline
        />
        <KpiCard
          label="Reddedilen"
          value={stats?.rejected ?? 0}
          icon={XCircle}
          loading={isLoading}
          hint="toplam"
          trend={stats?.trends.rejected}
          reserveSparkline
        />

        {/* Category bar chart — span-2 at xl (half), span-1 at lg (side-by-side w/ donut). */}
        <ChartCard
          className="xl:col-span-2"
          title="Kategoriye göre ilanlar"
          description="Aktif taksonomi dağılımı"
          loading={isLoading}
          summary={
            stats?.byCategory?.length
              ? `Kategoriye göre ilan sayıları: ${stats.byCategory
                  .map((c) => `${c.label} ${c.count}`)
                  .join(', ')}.`
              : undefined
          }
        >
          <BarChart data={stats?.byCategory ?? []} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
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
            <Bar dataKey="count" name="İlan" fill="var(--color-chart-1)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartCard>

        {/* Status distribution donut — span-2 at xl (half), span-1 at lg (side-by-side w/ chart). */}
        <DonutChartCard
          className="xl:col-span-2"
          title="Duruma göre dağılım"
          description="İlan yaşam döngüsü"
          centerLabel="ilan"
          loading={isLoading}
          data={(stats?.byStatus ?? [])
            .filter((s) => s.count > 0)
            .map((s) => ({ name: s.label, value: s.count }))}
        />

        {/* Pending queue preview — 2-wide (half at xl, full at lg). */}
        <Card className="gap-3 lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Bekleyen ilanlar</CardTitle>
              <CardDescription>Moderasyon gerektiren son ilanlar</CardDescription>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link to="/listings/moderation" data-action="navigate" data-entity="listing">
                Kuyruğa git
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {!pending || pending.items.length === 0 ? (
              <EmptyState title="Bekleyen ilan yok" description="Tüm ilanlar değerlendirildi." />
            ) : (
              <ul className="divide-border divide-y">
                {pending.items.map((listing) => (
                  <li key={listing.id} className="flex items-center gap-3 py-2">
                    <Link to={`/listings/${listing.id}`} className="min-w-0 flex-1 truncate font-medium hover:underline" data-action="open-detail" data-entity="listing">
                      {listing.title}
                    </Link>
                    <span className="text-muted-foreground hidden text-sm md:inline">
                      {CATEGORY_LABELS[listing.category]} · {LOCATIONS[listing.il]?.label}
                    </span>
                    <AiSuggestionBadge suggestion={listing.aiSuggestion} reasons={listing.aiReasons} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Recent moderation decisions (audit) — 1-wide. */}
        <Card className="gap-3">
          <CardHeader>
            <CardTitle className="text-base">Son moderasyon kararları</CardTitle>
            <CardDescription>Denetim kaydından</CardDescription>
          </CardHeader>
          <CardContent>
            {audit.length === 0 ? (
              // Shared EmptyState (compact override) — same grammar as the pending-queue
              // tile's empty state, not a bespoke <p>.
              <EmptyState
                className="border-0 px-0 py-6"
                title="Henüz karar yok"
                description="Moderasyon kuyruğundan başlayın."
              />
            ) : (
              <ol className="space-y-2 text-sm">
                {audit.map((entry) => (
                  <li key={entry.id} className="flex items-center gap-2">
                    <ScrollText className="text-muted-foreground size-3.5 shrink-0" />
                    <span className="truncate">
                      <span className="font-medium">{entry.action}</span>{' '}
                      <span className="text-muted-foreground">{entry.resource}</span>
                    </span>
                    <span className="text-muted-foreground ml-auto font-mono text-xs">{entry.ts.slice(0, 10)}</span>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>

        {/* Quick links — 1-wide; each tile is an interactive (hover-lift) link card. */}
        <Card className="gap-3">
          <CardHeader>
            <CardTitle className="text-base">Hızlı erişim</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            {QUICK_LINKS.map((q) => (
              <Card key={q.to} interactive className="relative gap-0 border-border/60 py-0 shadow-none">
                <CardContent className="flex min-h-11 items-center gap-2 px-3 py-2 text-sm font-medium">
                  <q.icon className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
                  <Link
                    to={q.to}
                    className="rounded-sm after:absolute after:inset-0 focus-visible:outline-none"
                    data-action="navigate"
                    data-entity="module"
                  >
                    {q.label}
                  </Link>
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>
      </div>
      )}
    </div>
  );
}
