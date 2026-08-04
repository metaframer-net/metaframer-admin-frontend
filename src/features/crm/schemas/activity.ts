import { z } from 'zod';

// ── Enums ──────────────────────────────────────────────────────────────────

export const ACTIVITY_TYPES = ['call', 'meeting', 'email', 'note', 'task'] as const;

// ── API entity schema ──────────────────────────────────────────────────────

export const activitySchema = z.object({
  id: z.string(),
  contactId: z.string(),
  type: z.enum(ACTIVITY_TYPES),
  subject: z.string(),
  description: z.string().optional(),
  /** When this activity is/was scheduled. */
  scheduledAt: z.string().nullable(),
  /** When it was completed (null if pending). */
  completedAt: z.string().nullable(),
  createdBy: z.string(),
  createdAt: z.string(),
});

export type Activity = z.infer<typeof activitySchema>;

// ── Form schema ────────────────────────────────────────────────────────────

export const activityFormSchema = z.object({
  type: z.enum(ACTIVITY_TYPES),
  subject: z.string().min(2, 'En az 2 karakter.'),
  description: z.string().optional(),
  scheduledAt: z.string().optional(),
});

export type ActivityFormValues = z.infer<typeof activityFormSchema>;
