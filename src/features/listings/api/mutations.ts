import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { api } from '@/lib/api/client';
import { listingKeys } from './queries';
import {
  formToPayload,
  type Listing,
  type ListingFormValues,
  type ModerationDecision,
  type ModerationInput,
} from '../schemas/listing';

const DECISION_STATUS: Record<ModerationDecision, Listing['status']> = {
  ok: 'active',
  uncertain: 'pending',
  nok: 'rejected',
};

const DECISION_TOAST: Record<ModerationDecision, string> = {
  ok: 'İlan onaylandı ve yayına alındı.',
  uncertain: 'İlan beklemede tutuldu (ek bilgi gerekli).',
  nok: 'İlan reddedildi.',
};

/** Optimistic moderation (OK / Uncertain / NOK) with rollback + toasts. */
export function useModerateListing(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ModerationInput) => api.post<Listing>(`/listings/${id}/moderate`, input),
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: listingKeys.detail(id) });
      const previous = qc.getQueryData<Listing>(listingKeys.detail(id));
      if (previous) {
        qc.setQueryData<Listing>(listingKeys.detail(id), {
          ...previous,
          status: DECISION_STATUS[input.decision],
        });
      }
      return { previous };
    },
    onError: (_err, _input, ctx) => {
      if (ctx?.previous) qc.setQueryData(listingKeys.detail(id), ctx.previous);
      toast.error('Moderasyon başarısız. Değişiklik geri alındı.');
    },
    onSuccess: (_data, input) => {
      toast.success(DECISION_TOAST[input.decision]);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: listingKeys.all });
    },
  });
}

/**
 * Inline status quick-edit from the listings table (DATA_TABLE_SPEC-style row
 * action). PATCHes the status and invalidates the list + KPI stats. Toasts on
 * success/failure; the table refetch reconciles the row.
 */
export function useSetListingStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: Listing['status'] }) =>
      api.patch<Listing>(`/listings/${id}`, { status }),
    onSuccess: () => {
      toast.success('İlan durumu güncellendi.');
      void qc.invalidateQueries({ queryKey: listingKeys.all });
    },
    onError: () => toast.error('Durum güncellenemedi.'),
  });
}

/** The audit actor recorded for copilot-originated approvals. */
export const AI_MODERATION_ACTOR = 'ai:moderation-copilot';

/**
 * Guardrailed AI bulk approval: approves the caller-selected ids (which MUST be
 * AI-OK + pending — enforced by `selectApprovable` at the call site) one by one
 * as `decision: 'ok'` with an `ai:*` actor, so each write lands in the audit log
 * attributed to the copilot. Never called without a human ConfirmDialog.
 */
export function useAiApproveListings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      for (const id of ids) {
        await api.post<Listing>(`/listings/${id}/moderate`, {
          decision: 'ok',
          actor: AI_MODERATION_ACTOR,
        } satisfies ModerationInput);
      }
      return ids;
    },
    onSuccess: (ids) => {
      toast.success(`${ids.length} ilan AI kopilotu ile onaylandı.`);
      void qc.invalidateQueries({ queryKey: listingKeys.all });
    },
    onError: () => toast.error('Toplu onay başarısız oldu.'),
  });
}

/** Create a listing from validated form values. */
export function useCreateListing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (values: ListingFormValues) => api.post<Listing>('/listings', formToPayload(values)),
    onSuccess: (created) => {
      toast.success(`İlan oluşturuldu: ${created.title}`);
      void qc.invalidateQueries({ queryKey: listingKeys.all });
    },
    onError: () => toast.error('İlan oluşturulamadı.'),
  });
}
