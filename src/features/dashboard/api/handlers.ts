import { http, HttpResponse } from 'msw';

import { API_BASE_URL } from '@/lib/api/client';
import type { DashPeriod } from '@/config/dashboard-layout';
import { getListingsSnapshot } from '@/features/listings/api/handlers';
import { CATEGORY_LABELS, STATUS_LABELS, type Category, type ListingStatus } from '@/features/listings/data/taxonomy';

export interface DashboardStats {
  totalListings: number;
  pending: number;
  active: number;
  rejected: number;
  byCategory: { category: Category; label: string; count: number }[];
  byStatus: { status: ListingStatus; label: string; count: number }[];
  /** Deterministic 7-point mock trend series (oldest → newest) per KPI, ending at
      the current value. Powers the KpiCard sparklines until FastAPI ships real
      time-series. */
  trends: {
    totalListings: number[];
    pending: number[];
    active: number[];
    rejected: number[];
  };
}

/** Build a deterministic 7-point series ending exactly at `end` (no Date/random). */
function makeTrend(end: number, seed: number): number[] {
  const points = 7;
  const out: number[] = [];
  for (let i = 0; i < points; i++) {
    const base = end * (0.6 + (0.4 * i) / (points - 1));
    const wobble = ((seed * (i + 3)) % 7) - 3; // deterministic -3..3
    out.push(Math.max(0, Math.round(base + wobble)));
  }
  out[points - 1] = end;
  return out;
}

/**
 * Enterprise insight metrics powering the modular dashboard's Moderation /
 * Revenue / Traffic sections. Kept separate from `DashboardStats` (which is
 * derived live from the listings snapshot) because these are operational KPIs a
 * real backend would compute from payments, analytics, and the moderation log.
 * All values are deterministic (no Date/random) so stories + tests are stable.
 */
export interface PeriodKpis {
  /** Total paid-product revenue over the window, in TRY. */
  revenue: number;
  paymentCount: number;
  /** Average revenue per active agent (emlakçı), in TRY. */
  arpu: number;
  /** Share of listings that bought a paid product, percent (one decimal). */
  paidConversion: number;
  visits: number;
  listingViews: number;
  uniqueVisitors: number;
  avgSessionSeconds: number;
  approvedCount: number;
  rejectedCount: number;
  avgModerationMinutes: number;
  /** Approvals ÷ decisions, percent (integer). */
  approvalRate: number;
  openComplaints: number;
}

export interface NamedValue {
  label: string;
  value: number;
}
export interface SeriesPoint {
  label: string;
  value: number;
}

export interface DashboardInsights {
  /** Period-scoped KPI snapshots, selected by the dashboard's period toggle. */
  periods: Record<DashPeriod, PeriodKpis>;
  activeModerators: { online: number; total: number };
  /** SLA buckets — `tone` drives a token color (never color-only: bucket labels carry meaning). */
  queueAging: { bucket: string; count: number; tone: 'critical' | 'warn' | 'info' | 'muted' }[];
  decisionTrend: { label: string; approved: number; rejected: number }[];
  moderators: { initials: string; name: string; decisions: number; avgMinutes: number }[];
  riskSignals: { icon: 'phone' | 'image' | 'price'; label: string; detail: string; severity: 'high' | 'medium' }[];
  revenueTrend: SeriesPoint[];
  /** value = TRY. */
  revenueByProduct: NamedValue[];
  /** value = units sold. */
  productMix: NamedValue[];
  topAgents: { initials: string; name: string; listings: number; spend: number }[];
  trafficTrend: SeriesPoint[];
  /** value = percent share. */
  trafficSources: NamedValue[];
  /** value = search count. */
  topSearches: NamedValue[];
  /** value = percent share. */
  deviceMix: NamedValue[];
  topViewed: { title: string; meta: string; views: number }[];
}

/** Deterministic rising series (oldest → newest) peaking near `peak`, seeded wobble. */
function ramp(peak: number, n: number, seed: number): SeriesPoint[] {
  const out: SeriesPoint[] = [];
  for (let i = 0; i < n; i++) {
    const base = peak * (0.55 + (0.45 * i) / (n - 1));
    const wobble = (((seed * (i + 5)) % 11) - 5) / 100; // deterministic -5%..+5%
    out.push({ label: String(i + 1), value: Math.max(0, Math.round(base * (1 + wobble))) });
  }
  return out;
}

const DECISION_APPROVED = ramp(160, 14, 2);
const DECISION_REJECTED = ramp(48, 14, 9);

export const DASHBOARD_INSIGHTS: DashboardInsights = {
  periods: {
    today: { revenue: 284_000, paymentCount: 1_284, arpu: 465, paidConversion: 4.6, visits: 182_000, listingViews: 1_200_000, uniqueVisitors: 94_000, avgSessionSeconds: 252, approvedCount: 1_058, rejectedCount: 172, avgModerationMinutes: 14, approvalRate: 86, openComplaints: 12 },
    '7d': { revenue: 1_980_000, paymentCount: 8_640, arpu: 465, paidConversion: 4.5, visits: 1_200_000, listingViews: 8_600_000, uniqueVisitors: 612_000, avgSessionSeconds: 250, approvedCount: 7_240, rejectedCount: 1_380, avgModerationMinutes: 16, approvalRate: 84, openComplaints: 31 },
    '30d': { revenue: 8_400_000, paymentCount: 34_900, arpu: 465, paidConversion: 4.4, visits: 4_900_000, listingViews: 34_000_000, uniqueVisitors: 2_400_000, avgSessionSeconds: 248, approvedCount: 31_200, rejectedCount: 5_400, avgModerationMinutes: 18, approvalRate: 85, openComplaints: 58 },
  },
  activeModerators: { online: 6, total: 8 },
  queueAging: [
    { bucket: '> 4 saat', count: 23, tone: 'critical' },
    { bucket: '1–4 saat', count: 89, tone: 'warn' },
    { bucket: '15–60 dk', count: 146, tone: 'info' },
    { bucket: '< 15 dk', count: 84, tone: 'muted' },
  ],
  decisionTrend: DECISION_APPROVED.map((p, i) => ({
    label: p.label,
    approved: p.value,
    rejected: DECISION_REJECTED[i]?.value ?? 0,
  })),
  moderators: [
    { initials: 'AK', name: 'Ayşe K.', decisions: 312, avgMinutes: 9 },
    { initials: 'MD', name: 'Mert D.', decisions: 287, avgMinutes: 12 },
    { initials: 'SB', name: 'Selin B.', decisions: 241, avgMinutes: 21 },
    { initials: 'EY', name: 'Emre Y.', decisions: 198, avgMinutes: 14 },
  ],
  riskSignals: [
    { icon: 'phone', label: 'Tekrar eden telefon numarası', detail: '7 ilan · aynı numara', severity: 'high' },
    { icon: 'image', label: 'Kopya fotoğraf tespiti', detail: '4 ilan · görsel hash', severity: 'medium' },
    { icon: 'price', label: 'Piyasa dışı fiyat', detail: '3 ilan · %60 altı', severity: 'medium' },
  ],
  revenueTrend: ramp(320_000, 30, 7),
  revenueByProduct: [
    { label: 'Öne çıkarma', value: 1_900_000 },
    { label: 'Doping', value: 1_200_000 },
    { label: 'Üyelik / paket', value: 820_000 },
    { label: 'Vitrin', value: 360_000 },
  ],
  productMix: [
    { label: 'Öne çıkarma', value: 8_180 },
    { label: 'Doping', value: 5_210 },
    { label: 'Vitrin', value: 3_350 },
    { label: 'Üyelik', value: 1_860 },
  ],
  topAgents: [
    { initials: 'DE', name: 'Deniz Emlak', listings: 184, spend: 48_200 },
    { initials: 'EG', name: 'Ege Gayrimenkul', listings: 142, spend: 39_500 },
    { initials: 'MK', name: 'Marmara Konut', listings: 128, spend: 31_800 },
    { initials: 'AY', name: 'Anadolu Yapı', listings: 96, spend: 24_100 },
  ],
  trafficTrend: ramp(15_000, 14, 3),
  trafficSources: [
    { label: 'Organik arama', value: 48 },
    { label: 'Doğrudan', value: 24 },
    { label: 'Sosyal medya', value: 16 },
    { label: 'Reklam', value: 8 },
    { label: 'Yönlendirme', value: 4 },
  ],
  topSearches: [
    { label: 'kadıköy kiralık daire', value: 4_812 },
    { label: 'bodrum satılık villa', value: 3_640 },
    { label: 'ankara çankaya 3+1', value: 2_980 },
    { label: 'izmir işyeri devren', value: 2_104 },
    { label: 'imarlı arsa', value: 1_870 },
  ],
  deviceMix: [
    { label: 'Mobil', value: 68 },
    { label: 'Masaüstü', value: 24 },
    { label: 'Tablet', value: 8 },
  ],
  topViewed: [
    { title: 'Villa · Bodrum Yalıkavak', meta: 'Konut · öne çıkarma', views: 8_400 },
    { title: 'Plaza katı · Levent', meta: 'İşyeri', views: 6_100 },
    { title: 'Tarla · Urla', meta: 'Arsa', views: 4_700 },
    { title: '2+1 site içi · Ataşehir', meta: 'Konut', views: 3_900 },
  ],
};

export const dashboardHandlers = [
  http.get(`${API_BASE_URL}/dashboard/insights`, () => HttpResponse.json(DASHBOARD_INSIGHTS)),
  http.get(`${API_BASE_URL}/dashboard/stats`, () => {
    const listings = getListingsSnapshot();
    const byCategory = (Object.keys(CATEGORY_LABELS) as Category[]).map((category) => ({
      category,
      label: CATEGORY_LABELS[category],
      count: listings.filter((l) => l.category === category).length,
    }));
    const byStatus = (Object.keys(STATUS_LABELS) as ListingStatus[]).map((status) => ({
      status,
      label: STATUS_LABELS[status],
      count: listings.filter((l) => l.status === status).length,
    }));
    const totalListings = listings.length;
    const pending = listings.filter((l) => l.status === 'pending').length;
    const active = listings.filter((l) => l.status === 'active').length;
    const rejected = listings.filter((l) => l.status === 'rejected').length;
    const stats: DashboardStats = {
      totalListings,
      pending,
      active,
      rejected,
      byCategory,
      byStatus,
      trends: {
        totalListings: makeTrend(totalListings, 1),
        pending: makeTrend(pending, 2),
        active: makeTrend(active, 3),
        rejected: makeTrend(rejected, 4),
      },
    };
    return HttpResponse.json(stats);
  }),
];
