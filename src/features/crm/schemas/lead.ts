import { z } from 'zod';

// ── Enums ──────────────────────────────────────────────────────────────────

export const LEAD_STAGES = [
  'new',
  'contacted',
  'qualified',
  'proposal',
  'negotiation',
  'won',
  'lost',
] as const;

export const LEAD_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;

// ── API entity schema ──────────────────────────────────────────────────────

export const leadSchema = z.object({
  id: z.string(),
  contactId: z.string(),
  contactName: z.string(),
  title: z.string(),
  stage: z.enum(LEAD_STAGES),
  priority: z.enum(LEAD_PRIORITIES),
  /** Expected deal value in TRY. */
  value: z.number(),
  /** Win probability 0–100. */
  probability: z.number().min(0).max(100),
  source: z.string(),
  assigneeId: z.string().optional(),
  assigneeName: z.string().optional(),
  expectedCloseDate: z.string().nullable(),
  lostReason: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Lead = z.infer<typeof leadSchema>;

// ── Form schema ────────────────────────────────────────────────────────────

export const leadFormSchema = z.object({
  contactId: z.string().min(1, 'Kişi seçin.'),
  title: z.string().min(2, 'En az 2 karakter.'),
  stage: z.enum(LEAD_STAGES),
  priority: z.enum(LEAD_PRIORITIES),
  value: z.string().min(1, 'Tutar girin.'),
  probability: z.string().min(1, 'Olasılık girin.'),
  source: z.string().min(1, 'Kaynak seçin.'),
  expectedCloseDate: z.string().optional(),
  lostReason: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.stage === 'lost' && (!data.lostReason || data.lostReason.length < 3)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Kayıp gerekçesi zorunludur (en az 3 karakter).',
      path: ['lostReason'],
    });
  }
});

export type LeadFormValues = z.infer<typeof leadFormSchema>;

export function leadFormToPayload(values: LeadFormValues): Omit<Lead, 'id' | 'contactName' | 'assigneeId' | 'assigneeName' | 'createdAt' | 'updatedAt'> {
  return {
    contactId: values.contactId,
    title: values.title,
    stage: values.stage,
    priority: values.priority,
    value: Number(values.value) || 0,
    probability: Math.min(100, Math.max(0, Number(values.probability) || 0)),
    source: values.source,
    expectedCloseDate: values.expectedCloseDate || null,
    lostReason: values.lostReason || undefined,
  };
}

/** Stage-based default probability. */
export function defaultProbability(stage: (typeof LEAD_STAGES)[number]): number {
  const map: Record<string, number> = {
    new: 10,
    contacted: 20,
    qualified: 40,
    proposal: 60,
    negotiation: 80,
    won: 100,
    lost: 0,
  };
  return map[stage] ?? 10;
}
