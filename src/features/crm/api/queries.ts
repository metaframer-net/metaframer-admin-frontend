import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { api, encodeListQuery } from '@/lib/api/client';
import type { Paginated } from '@/lib/api/types';
import type { TableQuery } from '@/components/data-table/types';
import type { Contact } from '../schemas/contact';
import type { Lead } from '../schemas/lead';
import type { Activity } from '../schemas/activity';

// ── Query key factories ────────────────────────────────────────────────────

export const crmKeys = {
  all: ['crm'] as const,
  contacts: {
    all: ['crm', 'contacts'] as const,
    list: (query: TableQuery) => ['crm', 'contacts', 'list', query] as const,
    detail: (id: string) => ['crm', 'contacts', 'detail', id] as const,
  },
  leads: {
    all: ['crm', 'leads'] as const,
    list: (query: TableQuery) => ['crm', 'leads', 'list', query] as const,
    detail: (id: string) => ['crm', 'leads', 'detail', id] as const,
    byContact: (contactId: string) => ['crm', 'leads', 'contact', contactId] as const,
  },
  activities: {
    byContact: (contactId: string) => ['crm', 'activities', contactId] as const,
  },
  stats: ['crm', 'stats'] as const,
};

// ── Contact queries ────────────────────────────────────────────────────────

function contactParams(query: TableQuery): URLSearchParams {
  const params = encodeListQuery(query);
  if (query.q) params.set('q', query.q);
  return params;
}

export function useContacts(query: TableQuery) {
  return useQuery({
    queryKey: crmKeys.contacts.list(query),
    queryFn: () => api.get<Paginated<Contact>>('/crm/contacts', contactParams(query)),
    placeholderData: keepPreviousData,
  });
}

export function useContact(id: string | undefined) {
  return useQuery({
    queryKey: crmKeys.contacts.detail(id ?? ''),
    queryFn: () => api.get<Contact>(`/crm/contacts/${id}`),
    enabled: Boolean(id),
  });
}

// ── Lead queries ───────────────────────────────────────────────────────────

function leadParams(query: TableQuery): URLSearchParams {
  const params = encodeListQuery(query);
  if (query.q) params.set('q', query.q);
  return params;
}

export function useLeads(query: TableQuery) {
  return useQuery({
    queryKey: crmKeys.leads.list(query),
    queryFn: () => api.get<Paginated<Lead>>('/crm/leads', leadParams(query)),
    placeholderData: keepPreviousData,
  });
}

export function useContactLeads(contactId: string) {
  return useQuery({
    queryKey: crmKeys.leads.byContact(contactId),
    queryFn: () => api.get<Paginated<Lead>>(`/crm/contacts/${contactId}/leads`),
    enabled: Boolean(contactId),
  });
}

// ── Activity queries ───────────────────────────────────────────────────────

export function useContactActivities(contactId: string) {
  return useQuery({
    queryKey: crmKeys.activities.byContact(contactId),
    queryFn: () => {
      const params = new URLSearchParams();
      params.set('contactId', contactId);
      return api.get<Paginated<Activity>>('/crm/activities', params);
    },
    enabled: Boolean(contactId),
  });
}

// ── Stats ──────────────────────────────────────────────────────────────────

export interface CrmStats {
  totalContacts: number;
  vipContacts: number;
  activeLeads: number;
  wonLeads: number;
  totalPipeline: number;
  wonRevenue: number;
  overdueFollowUps: number;
  conversionRate: number;
}

export function useCrmStats() {
  return useQuery({
    queryKey: crmKeys.stats,
    queryFn: () => api.get<CrmStats>('/crm/stats'),
  });
}
