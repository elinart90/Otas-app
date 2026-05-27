import { z } from 'zod';

export const DEFENSE_STAGES = ['synopsis', 'final'] as const;
export type DefenseStage = (typeof DEFENSE_STAGES)[number];

export const DEFENSE_STATUSES = [
  'scheduled',
  'in_progress',
  'completed',
  'cancelled',
] as const;
export type DefenseStatus = (typeof DEFENSE_STATUSES)[number];

export const STAGE_LABEL: Record<DefenseStage, string> = {
  synopsis: 'Synopsis defense',
  final: 'Final defense',
};

export const STATUS_LABEL: Record<DefenseStatus, string> = {
  scheduled: 'Scheduled',
  in_progress: 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

/**
 * Schedule a new defense session.
 * Panel constraints: 2-4 unique panelist IDs.
 */
export const DefenseCreateSchema = z.object({
  project_id: z.string().uuid('Select a project'),
  stage: z.enum(DEFENSE_STAGES),
  scheduled_at: z
    .string()
    .min(1, 'Scheduled date/time is required')
    .refine((s) => !isNaN(Date.parse(s)), 'Invalid date/time'),
  venue: z
    .string()
    .min(2, 'Venue is required')
    .max(200, 'Venue is too long')
    .trim(),
  panelist_ids: z
    .array(z.string().uuid())
    .min(2, 'A defense panel must have at least 2 members')
    .max(4, 'A defense panel can have at most 4 members')
    .refine(
      (ids) => new Set(ids).size === ids.length,
      'Duplicate panel members are not allowed'
    ),
});

export type DefenseCreateInput = z.infer<typeof DefenseCreateSchema>;
