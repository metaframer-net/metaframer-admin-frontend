import type { FilterConfig } from '@/components/data-table/types';

import { AI_SUGGESTIONS } from '../schemas/listing';
import { CATEGORIES, CATEGORY_LABELS, STATUSES, STATUS_LABELS, ilOptions } from './taxonomy';

/** Human labels for the AI moderation pre-score (proposes; human disposes). */
export const AI_SUGGESTION_LABELS: Record<(typeof AI_SUGGESTIONS)[number], string> = {
  ok: 'AI: OK',
  uncertain: 'AI: Belirsiz',
  nok: 'AI: NOK',
};

/*
 * Named filter configs — consumed BOTH by the toolbar `FilterBar` and by the
 * per-column header funnels (via column `meta.filter`), so the two surfaces
 * always write to the same URL params. Named exports (not an index map) keep
 * the type `FilterConfig` (not `FilterConfig | undefined`) under
 * `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes`.
 */
export const statusFilter: FilterConfig = {
  id: 'status',
  label: 'Durum',
  kind: 'faceted',
  multiple: true,
  options: STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] })),
};
export const categoryFilter: FilterConfig = {
  id: 'category',
  label: 'Kategori',
  kind: 'faceted',
  multiple: true,
  options: CATEGORIES.map((c) => ({ value: c, label: CATEGORY_LABELS[c] })),
};
export const aiFilter: FilterConfig = {
  id: 'ai',
  label: 'AI skoru',
  kind: 'faceted',
  multiple: true,
  options: AI_SUGGESTIONS.map((a) => ({ value: a, label: AI_SUGGESTION_LABELS[a] })),
};
export const ilFilter: FilterConfig = {
  id: 'il',
  label: 'Şehir',
  kind: 'faceted',
  multiple: false,
  options: ilOptions(),
};
export const priceFilter: FilterConfig = { id: 'price', label: 'Fiyat', kind: 'numberRange', unit: '₺', sliderMin: 0, sliderMax: 10_000_000, sliderStep: 50_000 };

/** Toolbar FilterBar order. */
export const listingFilters: FilterConfig[] = [statusFilter, categoryFilter, aiFilter, ilFilter, priceFilter];
