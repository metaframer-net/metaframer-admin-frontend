import type { FilterConfig } from '@/components/data-table/types';
import { CONTACT_STATUSES, CONTACT_TYPES, CONTACT_SOURCES } from '../schemas/contact';
import { LEAD_STAGES, LEAD_PRIORITIES } from '../schemas/lead';
import {
  CONTACT_STATUS_LABELS,
  CONTACT_TYPE_LABELS,
  CONTACT_SOURCE_LABELS,
  LEAD_STAGE_LABELS,
  LEAD_PRIORITY_LABELS,
} from './crm';

// ── Contact filters ────────────────────────────────────────────────────────

export const contactStatusFilter: FilterConfig = {
  id: 'status',
  label: 'Durum',
  kind: 'faceted',
  multiple: true,
  options: CONTACT_STATUSES.map((s) => ({ value: s, label: CONTACT_STATUS_LABELS[s] })),
};

export const contactTypeFilter: FilterConfig = {
  id: 'type',
  label: 'Tip',
  kind: 'faceted',
  multiple: true,
  options: CONTACT_TYPES.map((t) => ({ value: t, label: CONTACT_TYPE_LABELS[t] })),
};

export const contactSourceFilter: FilterConfig = {
  id: 'source',
  label: 'Kaynak',
  kind: 'faceted',
  multiple: true,
  options: CONTACT_SOURCES.map((s) => ({ value: s, label: CONTACT_SOURCE_LABELS[s] })),
};

export const revenueFilter: FilterConfig = {
  id: 'revenue',
  label: 'Toplam Gelir',
  kind: 'numberRange',
  unit: '₺',
  sliderMin: 0,
  sliderMax: 500_000,
  sliderStep: 10_000,
};

export const contactFilters: FilterConfig[] = [
  contactStatusFilter,
  contactTypeFilter,
  contactSourceFilter,
  revenueFilter,
];

// ── Lead filters ───────────────────────────────────────────────────────────

export const leadStageFilter: FilterConfig = {
  id: 'stage',
  label: 'Aşama',
  kind: 'faceted',
  multiple: true,
  options: LEAD_STAGES.map((s) => ({ value: s, label: LEAD_STAGE_LABELS[s] })),
};

export const leadPriorityFilter: FilterConfig = {
  id: 'priority',
  label: 'Öncelik',
  kind: 'faceted',
  multiple: true,
  options: LEAD_PRIORITIES.map((p) => ({ value: p, label: LEAD_PRIORITY_LABELS[p] })),
};

export const leadValueFilter: FilterConfig = {
  id: 'value',
  label: 'Değer',
  kind: 'numberRange',
  unit: '₺',
  sliderMin: 0,
  sliderMax: 200_000,
  sliderStep: 5_000,
};

export const leadFilters: FilterConfig[] = [
  leadStageFilter,
  leadPriorityFilter,
  leadValueFilter,
];
