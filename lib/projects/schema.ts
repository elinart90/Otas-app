import { z } from 'zod';

/**
 * Schema for creating a new project proposal.
 * The PDF file is uploaded separately via multipart form-data; this schema
 * validates only the JSON metadata.
 */
export const ProposalCreateSchema = z.object({
  title: z
    .string()
    .min(10, 'Title must be at least 10 characters')
    .max(300, 'Title must be at most 300 characters')
    .trim(),
  abstract: z
    .string()
    .min(50, 'Abstract must be at least 50 characters')
    .max(5000, 'Abstract must be at most 5000 characters')
    .trim(),
  keywords: z
    .array(z.string().min(2).max(40))
    .min(2, 'Provide at least 2 keywords')
    .max(8, 'Provide at most 8 keywords'),
  academic_year: z
    .number()
    .int()
    .min(2020, 'Academic year is too far in the past')
    .max(2099, 'Academic year is too far in the future'),
  supervisor_id: z.string().uuid('Choose a supervisor from the list'),
  programme_id: z.string().uuid('Programme is required'),
});

export type ProposalCreateInput = z.infer<typeof ProposalCreateSchema>;

/**
 * Schema for a supervisor's decision on a submitted proposal.
 */
export const ProposalDecisionSchema = z.discriminatedUnion('decision', [
  z.object({
    decision: z.literal('approve'),
  }),
  z.object({
    decision: z.literal('reject'),
    reason: z
      .string()
      .min(20, 'Provide a clear reason (at least 20 characters)')
      .max(2000, 'Reason is too long'),
  }),
]);

export type ProposalDecisionInput = z.infer<typeof ProposalDecisionSchema>;

/**
 * Possible project statuses used by the UI. Mirrors the DB enum.
 */
export const PROJECT_STATUSES = [
  'draft',
  'proposal_submitted',
  'proposal_approved',
  'proposal_rejected',
  'in_supervision',
  'synopsis_scheduled',
  'synopsis_passed',
  'synopsis_failed',
  'final_scheduled',
  'final_passed',
  'final_failed',
  'archived',
] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];
