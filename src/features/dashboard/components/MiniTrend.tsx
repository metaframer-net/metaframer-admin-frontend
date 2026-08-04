import { useId } from 'react';
import { Area, AreaChart, Line, LineChart, ResponsiveContainer } from 'recharts';

export interface MiniAreaProps {
  data: { label: string; value: number }[];
  colorToken?: 1 | 2 | 3 | 4 | 5;
  height?: number;
  /** Screen-reader alternative for the visual-only trend. */
  summary: string;
}

/**
 * Compact, axis-less area trend for bento tiles. The SVG is decorative
 * (aria-hidden); the required `summary` restates the trend for assistive tech.
 */
export function MiniArea({ data, colorToken = 1, height = 120, summary }: MiniAreaProps) {
  const gradientId = useId();
  const color = `var(--color-chart-${colorToken})`;
  return (
    <div>
      <p className="sr-only">{summary}</p>
      <div style={{ height }} className="w-full" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.28} />
                <stop offset="100%" stopColor={color} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              isAnimationActive={false}
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export interface MiniLinesProps {
  data: { label: string; a: number; b: number }[];
  /** [seriesA token, seriesB token]. */
  colorTokens?: [1 | 2 | 3 | 4 | 5, 1 | 2 | 3 | 4 | 5];
  height?: number;
  summary: string;
}

/** Two-series axis-less line trend (e.g. approvals vs rejections). Decorative + sr-only summary. */
export function MiniLines({ data, colorTokens = [3, 5], height = 120, summary }: MiniLinesProps) {
  const [tokenA, tokenB] = colorTokens;
  return (
    <div>
      <p className="sr-only">{summary}</p>
      <div style={{ height }} className="w-full" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
            <Line
              type="monotone"
              dataKey="a"
              stroke={`var(--color-chart-${tokenA})`}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="b"
              stroke={`var(--color-chart-${tokenB})`}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
