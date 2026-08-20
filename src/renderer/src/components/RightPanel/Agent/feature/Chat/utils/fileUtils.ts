/**
 * ------------------------------------------------------------------
 * File Utils
 * ------------------------------------------------------------------
 * Helper functions xử lý file operations trong chat.
 *
 * Main functions:
 * - isFileAllowed() : Kiểm tra file extension có được phép không
 * - readFileAsText(): Đọc File object thành plain text
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── Constants ──
import { ALLOWED_FILE_EXTENSIONS } from "../constants/constants";

// ─── Functions ──────────────────────────────────────────────────────────
/** Returns true if the file extension is in the allowed list. */
export const isFileAllowed = (filename: string): boolean => {
  const ext = filename.substring(filename.lastIndexOf(".")).toLowerCase();
  return ALLOWED_FILE_EXTENSIONS.includes(ext);
};

/** Reads a File object as plain text. */
export const readFileAsText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
};
