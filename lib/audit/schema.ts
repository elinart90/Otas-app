import { z } from 'zod';

/**
 * Filters for the audit log query endpoint. All optional; combine as AND.
 * Date range is INCLUSIVE on both ends.
 *
 * page is 1-indexed. pageSize is bounded to prevent pathological queries.
 */
export const AuditQuerySchema = z.object({
  // Free-text search across viewer name/email + archive code + project title
  q: z.string().max(120).optional(),

  // ISO date strings, e.g. "2026-05-19" — interpreted as start-of-day / end-of-day in UTC
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid from date (use YYYY-MM-DD)')
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid to date (use YYYY-MM-DD)')
    .optional(),

  // Pagination
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(10).max(100).default(25),
});

export type AuditQueryInput = z.infer<typeof AuditQuerySchema>;
