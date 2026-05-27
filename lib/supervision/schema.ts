import { z } from 'zod';

export const SUPERVISION_OUTCOMES = [
  'on_track',
  'needs_attention',
  'concern',
  'excellent',
] as const;

export type SupervisionOutcome = (typeof SUPERVISION_OUTCOMES)[number];

export const OUTCOME_LABEL: Record<SupervisionOutcome, string> = {
  on_track: 'On track',
  needs_attention: 'Needs attention',
  concern: 'Concern',
  excellent: 'Excellent',
};

/**
 * Schema for creating a new supervision session.
 * The optional attachment is sent separately via multipart form-data.
 */
export const SessionCreateSchema = z.object({
  project_id: z.string().uuid('Select a project'),
  session_date: z
    .string()
    .min(1, 'Session date is required')
    .refine((s) => !isNaN(Date.parse(s)), 'Invalid date'),
  agenda: z
    .string()
    .min(5, 'Agenda must be at least 5 characters')
    .max(500, 'Agenda is too long')
    .trim(),
  notes: z
    .string()
    .max(5000, 'Notes are too long')
    .optional()
    .nullable()
    .transform((v) => (v ? v.trim() : null)),
  outcome: z.enum(SUPERVISION_OUTCOMES),
  next_steps: z
    .string()
    .max(2000, 'Next steps are too long')
    .optional()
    .nullable()
    .transform((v) => (v ? v.trim() : null)),
});

export type SessionCreateInput = z.infer<typeof SessionCreateSchema>;
