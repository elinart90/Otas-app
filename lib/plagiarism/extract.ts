/**
 * PDF text extraction abstraction.
 *
 * This is a thin interface so the core plagiarism logic doesn't care
 * whether text came from a PDF, DOCX, or pre-extracted plain text. The
 * actual extraction in production happens in the Edge Function (Deno
 * runtime, uses `unpdf` since `pdf-parse` is Node-only).
 *
 * On the Next.js side this file exists mostly to define the type
 * contract; we don't currently call it directly because uploads go
 * straight to Supabase Storage and the Edge Function handles extraction.
 */

export type ExtractedDocument = {
  /** Raw extracted text, in document order. */
  text: string;
  /** Optional metadata if the source supports it. */
  meta?: {
    pageCount?: number;
    title?: string;
  };
};

/**
 * Placeholder for client-side or server-side extraction that doesn't go
 * through the Edge Function. Currently throws — we route everything through
 * the Edge Function for consistency.
 *
 * If you ever want to add a "preview extraction" feature (e.g. show the
 * student what their PDF looks like before they submit), implement this
 * using `pdf-parse` on the Next.js side and dynamic-import it so it
 * doesn't bloat the client bundle.
 */
export async function extractFromBuffer(
  _bytes: ArrayBuffer
): Promise<ExtractedDocument> {
  throw new Error(
    'Direct extraction is not implemented in the Next.js side. ' +
      'Upload to Supabase Storage and let the process-plagiarism Edge Function handle extraction.'
  );
}
