import { z } from 'zod';

/**
 * Search filters for the archive browser. All optional.
 * Combined as AND in the query.
 */
export const ArchiveSearchSchema = z.object({
  q: z.string().max(200).optional(),
  year: z.coerce.number().int().min(2000).max(2099).optional(),
  programme_id: z.string().uuid().optional(),
});

export type ArchiveSearchInput = z.infer<typeof ArchiveSearchSchema>;

/**
 * Admin upload of final archived PDF.
 * The file itself is sent via multipart; this schema validates the meta JSON.
 */
export const ArchiveUploadSchema = z.object({
  project_id: z.string().uuid('Select a project'),
  archive_code: z
    .string()
    .min(3, 'Archive code is required (e.g. ARC-2026-001)')
    .max(50, 'Archive code is too long')
    .trim(),
});

export type ArchiveUploadInput = z.infer<typeof ArchiveUploadSchema>;
