import {
  ProjectSubmissionSchema,
  SupervisorDecisionSchema,
  ProjectStatusEnum,
} from '@/lib/validation/projects-schema';
import type {
  ProjectSubmissionInput,
  SupervisorDecisionInput,
  ProjectStatus,
} from '@/lib/validation/projects-schema';

// Re-export validation-layer schemas under legacy names
export {
  ProjectSubmissionSchema as ProposalCreateSchema,
  SupervisorDecisionSchema as ProposalDecisionSchema,
  ProjectStatusEnum,
};

export type { ProjectStatus };

export type ProposalCreateInput = ProjectSubmissionInput;
export type ProposalDecisionInput = SupervisorDecisionInput;

// Const array derived from the enum — backwards-compat with existing code
export const PROJECT_STATUSES = ProjectStatusEnum.options;
