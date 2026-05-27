import { z } from 'zod';
import { sanitizeLine } from '@/lib/validation/sanitize';

/**
 * Phase 4 hardening: archive_code is now enforced as a structured identifier
 * `ARC-YYYY-XXX` where XXX is 3–12 uppercase alphanumeric chars. The DB
 * has a matching CHECK constraint (migration 012), so a bypass at the
 * application layer is caught at the storage layer.
 */
const ARCHIVE_CODE_RE = /^ARC-\d{4}-[A-Z0-9]{3,12}$/;

export const ArchiveSearchSchema = z.object({
  q: z
    .string()
    .max(200)
    .optional()
    .transform((v) => (v ? sanitizeLine(v) : undefined)),
  year: z.coerce.number().int().min(2000).max(2099).optional(),
  programme_id: z.string().uuid().optional(),
});

export type ArchiveSearchInput = z.infer<typeof ArchiveSearchSchema>;

export const ArchiveUploadSchema = z.object({
  project_id: z.string().uuid('Select a project'),
  archive_code: z
    .string()
    .transform((v) => sanitizeLine(v).toUpperCase())
    .refine(
      (v) => ARCHIVE_CODE_RE.test(v),
      'Archive code must be ARC-YYYY-XXX (e.g. ARC-2026-NNY)'
    ),
});

export type ArchiveUploadInput = z.infer<typeof ArchiveUploadSchema>;
