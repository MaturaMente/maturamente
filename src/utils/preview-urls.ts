/**
 * Utility functions for generating preview URLs from storage paths
 */

const SUPABASE_BASE_URL =
  "https://pmnothvdbyxdqaiyugpg.supabase.co/storage/v1/object/public";
const NOTES_PREVIEW_BUCKET = "notes-preview";

/**
 * Generate a preview image URL from a note's storage path
 * Converts from PDF path to WebP preview path
 *
 * @param storagePath - The original storage path of the note (e.g., "matematica/appunti-di-goniometria.pdf")
 * @returns The preview image URL
 */
export function generatePreviewUrl(storagePath: string): string {
  // Remove the .pdf extension and add .webp
  const pathWithoutExtension = storagePath.replace(/\.pdf$/i, "");
  const previewPath = `${pathWithoutExtension}.webp`;

  return `${SUPABASE_BASE_URL}/${NOTES_PREVIEW_BUCKET}/${previewPath}`;
}

/**
 * Check if a storage path can have a preview generated
 *
 * @param storagePath - The storage path to check
 * @returns True if the path ends with .pdf (case insensitive)
 */
export function canGeneratePreview(storagePath: string): boolean {
  return /\.pdf$/i.test(storagePath);
}

/**
 * Generate preview URLs for multiple notes
 *
 * @param notes - Array of notes with storage_path property
 * @returns Object mapping note IDs to preview URLs
 */
export function generatePreviewUrls<
  T extends { id: string; storage_path: string }
>(notes: T[]): Record<string, string> {
  const previewUrls: Record<string, string> = {};

  notes.forEach((note) => {
    if (canGeneratePreview(note.storage_path)) {
      previewUrls[note.id] = generatePreviewUrl(note.storage_path);
    }
  });

  return previewUrls;
}
