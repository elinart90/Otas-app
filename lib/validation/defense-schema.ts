import { z } from 'zod';
import { sanitizeLine, sanitizeBlock } from '@/lib/validation/sanitize';

/**
 * Phase 4 hardening: defense scheduling + scoring schemas with tighter
 * bounds matching migration 012's CHECK constraints.
 *
 * Copy these into `lib/defense/schema.ts` and `lib/scoring/schema.ts` to
 * replace the existing definitions, or re-export from here.
 */

export const DefenseStageEnum = z.enum(['synopsis', 'final']);
export const DefenseStatusEnum = z.enum([
  'scheduled',
  'in_progress',
  'completed',
  'cancelled',
]);
export const HodDecisionEnum = z.enum(['passed', 'failed']);

export type DefenseStage = z.infer<typeof DefenseStageEnum>;
export type DefenseStatus = z.infer<typeof DefenseStatusEnum>;

export const DefenseScheduleSchema = z.object({
  project_id: z.string().uuid('Select a project'),
  stage: DefenseStageEnum,
  scheduled_at: z
    .string()
    .datetime({ message: 'Invalid date/time (must be ISO 8601)' })
    .refine((v) => new Date(v).getTime() > Date.now() - 60 * 60 * 1000, {
      message: 'Defense cannot be scheduled in the past',
    }),
  venue: z
    .string()
    .transform(sanitizeLine)
    .refine((v) => v.length >= 2, 'Venue is required (2+ chars)')
    .refine((v) => v.length <= 120, 'Venue is too long (max 120 chars)'),
  panelist_ids: z
    .array(z.string().uuid())
    .min(2, 'At least 2 panelists required')
    .max(4, 'Maximum 4 panelists')
    .refine(
      (arr) => new Set(arr).size === arr.length,
      'Duplicate panelists are not allowed'
    ),
});

export type DefenseScheduleInput = z.infer<typeof DefenseScheduleSchema>;

export const DefenseScoreSubmitSchema = z.object({
  scores: z
    .array(
      z.object({
        criterion_id: z.string().uuid(),
        score: z.coerce
          .number()
          .int('Score must be a whole number')
          .min(0, 'Score cannot be negative')
          .max(10, 'Score cannot exceed 10'),
        comment: z
          .string()
          .max(1000, 'Comment too long (max 1000 chars)')
          .optional()
          .transform((v) => (v ? sanitizeBlock(v) : undefined)),
      })
    )
    .min(1, 'At least one score required'),
  submit: z.boolean().default(false), // false = draft, true = lock-in
});

export type DefenseScoreSubmitInput = z.infer<typeof DefenseScoreSubmitSchema>;

export const HodDecisionSchema = z.object({
  decision: HodDecisionEnum,
  decision_notes: z
    .string()
    .transform(sanitizeBlock)
    .refine(
      (v) => v.length >= 20,
      'Decision notes must be at least 20 characters'
    )
    .refine((v) => v.length <= 2000, 'Decision notes too long (max 2000 chars)'),
});

export type HodDecisionInput = z.infer<typeof HodDecisionSchema>;
