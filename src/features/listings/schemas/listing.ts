import { z } from 'zod';

import { CATEGORIES, STATUSES, CATEGORY_ATTRIBUTES, type Category } from '../data/taxonomy';

/** AI moderation pre-score (proposes; human disposes). */
export const AI_SUGGESTIONS = ['ok', 'uncertain', 'nok'] as const;
export type AiSuggestion = (typeof AI_SUGGESTIONS)[number];

export const listingAttributesSchema = z.object({
  grossArea: z.number().optional(),
  netArea: z.number().optional(),
  rooms: z.string().optional(),
  buildingAge: z.number().optional(),
  floor: z.number().optional(),
  heating: z.string().optional(),
  deedStatus: z.string().optional(),
  zoning: z.string().optional(),
});
export type ListingAttributes = z.infer<typeof listingAttributesSchema>;

/** Listing entity as returned by the API. Source of truth for the type. */
export const listingSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  category: z.enum(CATEGORIES),
  status: z.enum(STATUSES),
  price: z.number(),
  il: z.string(),
  ilce: z.string(),
  mahalle: z.string(),
  attributes: listingAttributesSchema,
  agentName: z.string(),
  aiSuggestion: z.enum(AI_SUGGESTIONS),
  aiReasons: z.array(z.string()),
  createdAt: z.string(),
});
export type Listing = z.infer<typeof listingSchema>;

/** Moderation decision (three-tier). `uncertain` requires a note. */
export const MODERATION_DECISIONS = ['ok', 'uncertain', 'nok'] as const;
export type ModerationDecision = (typeof MODERATION_DECISIONS)[number];

export const moderationSchema = z
  .object({
    decision: z.enum(MODERATION_DECISIONS),
    reason: z.string().optional(),
    /**
     * Optional acting agent. Human decisions omit it (server defaults to the
     * current user); the AI copilot passes `ai:<agent>` so the audit trail
     * distinguishes AI-originated approvals. Guardrail: the copilot may only
     * send `decision: 'ok'` over AI-OK + pending rows (see lib/ai/apply-intent).
     */
    actor: z.string().optional(),
  })
  .refine((v) => v.decision === 'ok' || (v.reason?.trim().length ?? 0) > 0, {
    message: 'Uncertain/NOK için gerekçe zorunludur.',
    path: ['reason'],
  });
export type ModerationInput = z.infer<typeof moderationSchema>;

const numeric = (msg: string) => z.string().regex(/^\d+$/, msg);

/**
 * Create/edit FORM schema. Numeric fields are strings (parsed to numbers at the
 * submit boundary) to avoid zod-coerce transform generics clashing with RHF.
 * Category-relevant attributes are validated via superRefine.
 */
export const listingFormSchema = z
  .object({
    title: z.string().min(5, 'En az 5 karakter'),
    description: z.string().min(10, 'En az 10 karakter'),
    category: z.enum(CATEGORIES),
    price: numeric('Fiyat girin (sadece rakam)'),
    il: z.string().min(1, 'İl seçin'),
    ilce: z.string().min(1, 'İlçe seçin'),
    mahalle: z.string().min(1, 'Mahalle seçin'),
    // Mülk bilgileri (step 1)
    purpose: z.enum(['satilik', 'kiralik']),
    subType: z.string().optional(),
    authority: z.enum(['sahibi', 'yakini', 'yetkili']),
    adaParsel: z.string().optional(),
    grossArea: z.string().optional(),
    netArea: z.string().optional(),
    rooms: z.string().optional(),
    buildingAge: z.string().optional(),
    floor: z.string().optional(),
    heating: z.string().optional(),
    deedStatus: z.string().optional(),
    zoning: z.string().optional(),
  })
  .superRefine((val, ctx) => {
    const required = CATEGORY_ATTRIBUTES[val.category as Category] ?? [];
    for (const key of required) {
      const field = val[key as keyof typeof val];
      if (!field || String(field).trim() === '') {
        ctx.addIssue({ code: 'custom', message: 'Bu kategori için zorunlu', path: [key] });
      }
    }
    // Numeric attribute fields must be numbers when present.
    for (const key of ['grossArea', 'netArea', 'buildingAge', 'floor'] as const) {
      const field = val[key];
      if (field && !/^\d+$/.test(field)) {
        ctx.addIssue({ code: 'custom', message: 'Sadece rakam', path: [key] });
      }
    }
  });
export type ListingFormValues = z.infer<typeof listingFormSchema>;

/** Map validated form values into the API create payload. */
export function formToPayload(values: ListingFormValues) {
  const num = (s?: string) => (s && /^\d+$/.test(s) ? Number(s) : undefined);
  return {
    title: values.title,
    description: values.description,
    category: values.category,
    price: Number(values.price),
    il: values.il,
    ilce: values.ilce,
    mahalle: values.mahalle,
    attributes: {
      grossArea: num(values.grossArea),
      netArea: num(values.netArea),
      rooms: values.rooms || undefined,
      buildingAge: num(values.buildingAge),
      floor: num(values.floor),
      heating: values.heating || undefined,
      deedStatus: values.deedStatus || undefined,
      zoning: values.zoning || undefined,
    },
  };
}
