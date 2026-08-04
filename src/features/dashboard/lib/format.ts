/** Turkish-locale number/currency/duration formatters for dashboard widgets. */

const intFmt = new Intl.NumberFormat('tr-TR');
const compactFmt = new Intl.NumberFormat('tr-TR', { notation: 'compact', maximumFractionDigits: 1 });
const currencyCompactFmt = new Intl.NumberFormat('tr-TR', {
  notation: 'compact',
  style: 'currency',
  currency: 'TRY',
  maximumFractionDigits: 1,
});
const currencyFmt = new Intl.NumberFormat('tr-TR', {
  style: 'currency',
  currency: 'TRY',
  maximumFractionDigits: 0,
});

/** Grouped integer, e.g. 48230 → "48.230". */
export function fmtInt(n: number): string {
  return intFmt.format(n);
}

/** Compact number, e.g. 1_200_000 → "1,2 Mn". */
export function fmtCompact(n: number): string {
  return compactFmt.format(n);
}

/** Compact currency, e.g. 284_000 → "₺284 B". */
export function fmtCurrencyCompact(n: number): string {
  return currencyCompactFmt.format(n);
}

/** Full currency, e.g. 48_200 → "₺48.200". */
export function fmtCurrency(n: number): string {
  return currencyFmt.format(n);
}

/** Percent from an already-percentage value, e.g. 86 → "%86" (Turkish sign-first). */
export function fmtPercent(n: number): string {
  return `%${intFmt.format(n)}`;
}

/** Minutes label, e.g. 14 → "14 dk". */
export function fmtMinutes(n: number): string {
  return `${intFmt.format(n)} dk`;
}

/** Seconds → "m:ss", e.g. 252 → "4:12". */
export function fmtDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
