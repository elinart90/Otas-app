import {
  DefenseStageEnum,
  DefenseStatusEnum,
  DefenseScheduleSchema,
} from '@/lib/validation/defense-schema';
import type {
  DefenseScheduleInput,
  DefenseStage,
  DefenseStatus,
} from '@/lib/validation/defense-schema';

// Re-export new canonical symbols from the validation layer
export {
  DefenseScheduleSchema,
  DefenseScheduleSchema as DefenseCreateSchema,
  DefenseStageEnum,
  DefenseStatusEnum,
};

export type { DefenseScheduleInput, DefenseStage, DefenseStatus };

// Legacy alias so existing imports of DefenseCreateInput continue to work
export type DefenseCreateInput = DefenseScheduleInput;

// Const arrays derived from enums for backwards compatibility
export const DEFENSE_STAGES = DefenseStageEnum.options;
export const DEFENSE_STATUSES = DefenseStatusEnum.options;

// UI labels not present in the validation layer — kept here
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
