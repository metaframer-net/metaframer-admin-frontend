import { LayoutGrid, Clock, ShieldAlert, CircleCheck } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import type { ListingStats } from '../api/queries';

interface Tile {
  key: keyof ListingStats;
  label: string;
  icon: typeof LayoutGrid;
  tone: 'default' | 'warning' | 'destructive' | 'success';
}

const TILES: Tile[] = [
  { key: 'total', label: 'Toplam ilan', icon: LayoutGrid, tone: 'default' },
  { key: 'pending', label: 'Moderasyon bekleyen', icon: Clock, tone: 'warning' },
  { key: 'aiNok', label: 'AI riskli (NOK)', icon: ShieldAlert, tone: 'destructive' },
  { key: 'active', label: 'Yayında', icon: CircleCheck, tone: 'success' },
];

const TONE: Record<Tile['tone'], string> = {
  default: 'text-foreground',
  warning: 'text-warning-foreground',
  destructive: 'text-destructive',
  success: 'text-success-foreground',
};

export interface ListingsKpiStripProps {
  stats?: ListingStats;
  isLoading?: boolean;
}

/**
 * Aggregate KPI strip above the listings table — the enterprise "context at a
 * glance" band (total · pending moderation · AI-risk · live). Token-only; icons
 * pair with labels so tone is never the sole signal.
 */
export function ListingsKpiStrip({ stats, isLoading = false }: ListingsKpiStripProps) {
  return (
    <dl className="grid grid-cols-2 gap-3 xl:grid-cols-4" aria-label="İlan özet göstergeleri">
      {TILES.map((tile) => {
        const Icon = tile.icon;
        return (
          <div key={tile.key} className="bg-card rounded-lg border border-border p-4">
            <dt className="text-muted-foreground flex items-center gap-2 text-xs">
              <Icon className="size-3.5" aria-hidden="true" />
              {tile.label}
            </dt>
            <dd className={cn('mt-1 font-mono text-2xl font-semibold tabular-nums', TONE[tile.tone])}>
              {isLoading || !stats ? (
                <Skeleton className="h-7 w-12" />
              ) : (
                stats[tile.key].toLocaleString('tr-TR')
              )}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
