import { z } from 'zod';

// ── Enums ──────────────────────────────────────────────────────────────────

export const CONTACT_TYPES = ['individual', 'agent', 'office'] as const;
export const CONTACT_STATUSES = ['active', 'inactive', 'vip', 'churned'] as const;
export const CONTACT_SOURCES = ['web', 'referral', 'import', 'cold-call', 'walk-in'] as const;

// ── API entity schema ──────────────────────────────────────────────────────

export const contactSchema = z.object({
  id: z.string(),
  /** Optional link to the users module. */
  userId: z.string().optional(),
  fullName: z.string(),
  email: z.string(),
  phone: z.string(),
  company: z.string().optional(),
  type: z.enum(CONTACT_TYPES),
  status: z.enum(CONTACT_STATUSES),
  source: z.enum(CONTACT_SOURCES),
  /** Admin user id responsible for this contact. */
  assigneeId: z.string().optional(),
  assigneeName: z.string().optional(),
  tags: z.array(z.string()),
  il: z.string(),
  // Aggregate stats
  totalListings: z.number(),
  activeListings: z.number(),
  totalRevenue: z.number(),
  /** Last time an admin interacted (call/meeting/note). */
  lastContactedAt: z.string().nullable(),
  /** Scheduled next follow-up. */
  nextFollowUpAt: z.string().nullable(),
  notes: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Contact = z.infer<typeof contactSchema>;

// ── Form schema ────────────────────────────────────────────────────────────

export const contactFormSchema = z.object({
  fullName: z.string().min(2, 'En az 2 karakter.'),
  email: z.string().email('Geçerli bir e-posta girin.'),
  phone: z.string().min(10, 'En az 10 karakter.'),
  company: z.string().optional(),
  type: z.enum(CONTACT_TYPES),
  status: z.enum(CONTACT_STATUSES),
  source: z.enum(CONTACT_SOURCES),
  assigneeId: z.string().optional(),
  tags: z.string().optional(),
  il: z.string().min(1, 'Şehir seçin.'),
  notes: z.string().optional(),
});

export type ContactFormValues = z.infer<typeof contactFormSchema>;

export function formToPayload(values: ContactFormValues): Omit<Contact, 'id' | 'userId' | 'assigneeName' | 'totalListings' | 'activeListings' | 'totalRevenue' | 'lastContactedAt' | 'nextFollowUpAt' | 'createdAt' | 'updatedAt'> {
  return {
    ...values,
    company: values.company || undefined,
    assigneeId: values.assigneeId || undefined,
    tags: values.tags ? values.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
    notes: values.notes || undefined,
  };
}
