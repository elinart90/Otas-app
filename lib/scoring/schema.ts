import { z } from 'zod';
import {
  DefenseScoreSubmitSchema,
  HodDecisionSchema,
  HodDecisionEnum,
} from '@/lib/validation/defense-schema';
import type {
  DefenseScoreSubmitInput,
  HodDecisionInput,
} from '@/lib/validation/defense-schema';

// CriterionScoreSchema has no standalone equivalent in the validation layer.
// `comment` is singular — matches the defense_scores.comment DB column.
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

// Re-export validation-layer schemas under legacy names
export {
  DefenseScoreSubmitSchema as ScoreSubmissionSchema,
  HodDecisionSchema as DecisionSchema,
  HodDecisionEnum,
};

// Legacy type aliases
export type ScoreSubmissionInput = DefenseScoreSubmitInput;
export type DecisionInput = HodDecisionInput;

// Const array and type kept for backwards compatibility
export const DECISION_VALUES = HodDecisionEnum.options;
export type DecisionValue = z.infer<typeof HodDecisionEnum>;
