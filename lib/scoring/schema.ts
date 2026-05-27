import { z } from 'zod';

/**
 * Single criterion score submission.
 */
export const CriterionScoreSchema = z.object({
  criterion_id: z.string().uuid(),
  score: z
    .number()
    .int('Score must be a whole number')
    .min(0, 'Score cannot be negative')
    .max(100, 'Score is too high'),
  comment: z
    .string()
    .max(2000, 'Comment is too long')
    .optional()
    .nullable()
    .transform((v) => (v ? v.trim() : null)),
});

/**
 * Full scoring submission for a defense by a single panelist.
 * `submit` flag: if true, scores are locked after this write.
 */
export const ScoreSubmissionSchema = z.object({
  scores: z.array(CriterionScoreSchema).min(1, 'Score at least one criterion'),
  submit: z.boolean().default(false),
});

export type ScoreSubmissionInput = z.infer<typeof ScoreSubmissionSchema>;

/**
 * HoD's final pass/fail decision.
 */
export const DECISION_VALUES = ['passed', 'failed'] as const;
export type DecisionValue = (typeof DECISION_VALUES)[number];

export const DecisionSchema = z.object({
  decision: z.enum(DECISION_VALUES),
  notes: z
    .string()
    .min(20, 'Provide reasoning of at least 20 characters')
    .max(2000, 'Notes are too long')
    .trim(),
});

export type DecisionInput = z.infer<typeof DecisionSchema>;
