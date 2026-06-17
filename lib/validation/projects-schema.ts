import { z } from 'zod';
import {
  sanitizeLine,
  sanitizeBlock,
  sanitizeStringArray,
} from '@/lib/validation/sanitize';

/**
 * Phase 4 hardening: tightened bounds across all project text fields, with
 * matching DB CHECK constraints in migration 012.
 *
 * NOTE: This file replaces or supplements the existing `lib/projects/schema.ts`.
 * If the codebase uses `lib/projects/schema.ts` directly, copy these schemas
 * into that file. If you'd like a single source of truth, re-export from here.
 */

export const ProjectStatusEnum = z.enum([
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
]);

export type ProjectStatus = z.infer<typeof ProjectStatusEnum>;

export const ProjectSubmissionSchema = z.object({
  title: z
    .string()
    .transform(sanitizeLine)
    .refine((v) => v.length >= 5, 'Title is too short (5+ chars)')
    .refine((v) => v.length <= 300, 'Title is too long (max 300 chars)'),
  abstract: z
    .string()
    .transform(sanitizeBlock)
    .refine((v) => v.length >= 50, 'Abstract is too short (50+ chars)')
    .refine((v) => v.length <= 5000, 'Abstract is too long (max 5000 chars)'),
  keywords: z
    .array(z.string())
    .max(10, 'Maximum 10 keywords')
    .transform((arr) =>
      sanitizeStringArray(arr, { maxItems: 10, maxItemLen: 40 })
    ),
  academic_year: z.coerce
    .number()
    .int()
    .min(2000, 'Academic year out of range')
    .max(2099, 'Academic year out of range'),
  programme_id: z.string().uuid('Select a programme'),
  supervisor_id: z.string().uuid('Select a supervisor'),
});

export type ProjectSubmissionInput = z.infer<typeof ProjectSubmissionSchema>;

/**
 * Decision schema for supervisor accept/reject. Reason is required for
 * rejections, optional for approvals.
 */
export const SupervisorDecisionSchema = z
  .object({
    decision: z.enum(['approve', 'reject']),
    reason: z
      .string()
      .max(1000, 'Reason is too long (max 1000 chars)')
      .optional()
      .transform((v) => (v ? sanitizeBlock(v) : undefined)),
  })
  .refine(
    (data) =>
      data.decision === 'approve' ||
      (data.reason !== undefined && data.reason.length >= 10),
    {
      message: 'Reason is required for rejection (10+ chars)',
      path: ['reason'],
    }
  );

export type SupervisorDecisionInput = z.infer<typeof SupervisorDecisionSchema>;
