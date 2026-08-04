import { cn } from '@/lib/utils';

export type BarTone = 'critical' | 'warn' | 'info' | 'muted';

export interface BarItem {
  label: string;
  value: number;
  /** Pre-formatted trailing amount (defaults to the raw value or `formatValue`). */
  display?: string;
  /** Chart palette token (1..5). Ignored when `tone` is set. */
  colorToken?: 1 | 2 | 3 | 4 | 5;
  /** Semantic tone → a status token color (overrides `colorToken`). */
  tone?: BarTone;
}

const TONE_VAR: Record<BarTone, string> = {
  critical: 'var(--destructive)',
  warn: 'var(--warning)',
  info: 'var(--color-chart-2)',
  muted: 'var(--muted-foreground)',
};

function barColor(item: BarItem): string {
  if (item.tone) return TONE_VAR[item.tone];
  return `var(--color-chart-${item.colorToken ?? 1})`;
}

export interface BarListProps {
  items: BarItem[];
  /** Formats the trailing amount when `display` is absent. */
  formatValue?: (value: number) => string;
  /** Optional leading dot swatch matching each bar's color (legend-style rows). */
  showSwatch?: boolean;
  className?: string;
}

/**
 * Horizontal labeled bar list — a compact, dense alternative to a full bar chart
 * for bento tiles. Color is never the sole signal: every row carries its label
 * and value. Widths are relative to the max value in the set.
 */
export function BarList({ items, formatValue, showSwatch = false, className }: BarListProps) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className={cn('space-y-3', className)}>
      {items.map((item) => {
        const pct = Math.round((item.value / max) * 100);
        const color = barColor(item);
        return (
          <li
            key={item.label}
            className="grid grid-cols-[minmax(5.5rem,7rem)_1fr_auto] items-center gap-3 text-sm"
          >
            <span className="flex min-w-0 items-center gap-2">
              {showSwatch && (
                <span
                  aria-hidden="true"
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ background: color }}
                />
              )}
              <span className="truncate">{item.label}</span>
            </span>
            <span className="bg-muted h-2 overflow-hidden rounded-full">
              <span
                className="block h-full rounded-full"
                style={{
                  width: `${pct}%`,
                  background: color,
                  transition: 'width var(--duration-slow) var(--ease-standard)',
                }}
              />
            </span>
            <span className="text-muted-foreground text-right font-medium tabular-nums">
              {item.display ?? (formatValue ? formatValue(item.value) : item.value)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
