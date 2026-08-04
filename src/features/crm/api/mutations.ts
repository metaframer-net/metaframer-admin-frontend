import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { api } from '@/lib/api/client';
import type { Contact } from '../schemas/contact';
import type { Lead } from '../schemas/lead';
import type { Activity } from '../schemas/activity';
import { crmKeys } from './queries';

// ── Contact mutations ──────────────────────────────────────────────────────

export function useCreateContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Contact>) => api.post<Contact>('/crm/contacts', data),
    onSuccess: (contact) => {
      toast.success(`"${contact.fullName}" kişisi oluşturuldu.`);
      void qc.invalidateQueries({ queryKey: crmKeys.contacts.all });
      void qc.invalidateQueries({ queryKey: crmKeys.stats });
    },
    onError: () => {
      toast.error('Kişi oluşturulamadı.');
    },
  });
}

export function useUpdateContact(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Contact>) => api.patch<Contact>(`/crm/contacts/${id}`, data),
    onSuccess: (contact) => {
      toast.success(`"${contact.fullName}" güncellendi.`);
      void qc.invalidateQueries({ queryKey: crmKeys.contacts.all });
      void qc.invalidateQueries({ queryKey: crmKeys.contacts.detail(id) });
      void qc.invalidateQueries({ queryKey: crmKeys.stats });
    },
    onError: () => {
      toast.error('Kişi güncellenemedi.');
    },
  });
}

export function useDeleteContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/crm/contacts/${id}`),
    onSuccess: (_data, id) => {
      toast.success('Kişi silindi.');
      void qc.invalidateQueries({ queryKey: crmKeys.contacts.all });
      void qc.invalidateQueries({ queryKey: crmKeys.contacts.detail(id) });
      void qc.invalidateQueries({ queryKey: crmKeys.stats });
    },
    onError: () => {
      toast.error('Kişi silinemedi.');
    },
  });
}

// ── Lead mutations ─────────────────────────────────────────────────────────

export function useCreateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Lead>) => api.post<Lead>('/crm/leads', data),
    onSuccess: (lead) => {
      toast.success(`"${lead.title}" lead oluşturuldu.`);
      void qc.invalidateQueries({ queryKey: crmKeys.leads.all });
      void qc.invalidateQueries({ queryKey: crmKeys.stats });
    },
    onError: () => {
      toast.error('Lead oluşturulamadı.');
    },
  });
}

export function useUpdateLeadStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: string }) =>
      api.patch<Lead>(`/crm/leads/${id}`, { stage }),
    onSuccess: (lead) => {
      toast.success(`"${lead.title}" → ${lead.stage} aşamasına taşındı.`);
      void qc.invalidateQueries({ queryKey: crmKeys.leads.all });
      void qc.invalidateQueries({ queryKey: crmKeys.stats });
    },
    onError: () => {
      toast.error('Lead aşaması güncellenemedi.');
    },
  });
}

// ── Activity mutations ─────────────────────────────────────────────────────

export function useCreateActivity(contactId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Activity>) => api.post<Activity>('/crm/activities', { ...data, contactId }),
    onSuccess: () => {
      toast.success('Aktivite eklendi.');
      void qc.invalidateQueries({ queryKey: crmKeys.activities.byContact(contactId) });
      void qc.invalidateQueries({ queryKey: crmKeys.contacts.detail(contactId) });
    },
    onError: () => {
      toast.error('Aktivite eklenemedi.');
    },
  });
}

export function useCompleteActivity(contactId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (activityId: string) => api.patch<Activity>(`/crm/activities/${activityId}/complete`),
    onSuccess: () => {
      toast.success('Aktivite tamamlandı.');
      void qc.invalidateQueries({ queryKey: crmKeys.activities.byContact(contactId) });
    },
    onError: () => {
      toast.error('Aktivite tamamlanamadı.');
    },
  });
}
